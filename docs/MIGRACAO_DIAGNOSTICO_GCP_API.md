# Plano de Transição: Migração de Diagnósticos e Oportunidades para a API GCP

> **Nota de Atualização (Novembro 2026):** O escopo migrou para a porta de entrada única Decisor Visible (`diagnostic_type='authority'`, rota `/score-founder`) com persistência em GCP Cloud SQL. Os múltiplos scorecards legados estão descontinuados.

Este documento estabelece o plano técnico para portar as últimas frentes que ainda dependem do Supabase: a tabela de `diagnosticos`, a tabela de `opportunities` (pré-vendas) e o retransmissor do GoHighLevel (GHL Relay) para a nova API NodeJS/TypeScript rodando no Google Cloud Run.

---

## 1. O Estado Atual da Codebase

O core da nova API GCP foi implementado com sucesso em `/repository/api/src/main.ts` e conta com as seguintes rotas ativas:
*   `/v1/identity` (Identidade e autenticação integrada ao Google Identity Platform)
*   `/v1/clients` (Cadastro de clientes)
*   `/v1/rei-projects` (Projetos do hub de aceleração de receita)
*   `/v1/strategic-plans` (Planos estratégicos por IA)
*   `/v1/growthmap` (Mapeamento de jornada de escala)

### O Gargalo:
A submissão do diagnóstico canônico de entrada Decisor Visible (`diagnostic_type='authority'`, rota `/score-founder`) ainda está gravando no Supabase por meio do arquivo `src/api/publicDiagnostic.ts`. 

Para descontinuar o Supabase de vez, precisamos criar o domínio `opportunities` e `diagnosticos` na nossa API do Cloud Run e apontar o React do frontend para lá.

---

## 2. Implementação do Domínio no GCP API (Backend)

Seguindo o padrão de design modular já existente na nossa API, precisamos criar a estrutura do domínio de oportunidades em `api/src/domains/opportunities/`.

### A. Repositório Postgres (`api/src/domains/opportunities/postgres-repository.ts`)
No banco do GCP (Cloud SQL), a tabela `opportunities` precisará receber o payload de diagnósticos de forma segura:

```typescript
import type { Pool } from 'pg';

export interface OpportunityRecord {
  id: string;
  client_name: string;
  client_email: string | null;
  client_company: string | null;
  pipeline_stage: string;
  diagnostico_id: string | null;
  opportunity_data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export class PostgresOpportunityRepository {
  constructor(private readonly pool: Pool) {}

  async create(data: Omit<OpportunityRecord, 'id' | 'created_at' | 'updated_at'>): Promise<OpportunityRecord> {
    const result = await this.pool.query(
      `INSERT INTO opportunities (client_name, client_email, client_company, pipeline_stage, diagnostico_id, opportunity_data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [data.client_name, data.client_email, data.client_company, data.pipeline_stage, data.diagnostico_id, data.opportunity_data]
    );
    return result.rows[0];
  }

  async findByEmail(email: string): Promise<OpportunityRecord | null> {
    const result = await this.pool.query(
      `SELECT * FROM opportunities WHERE LOWER(client_email) = LOWER($1) AND pipeline_stage != 'lost' LIMIT 1`,
      [email]
    );
    return result.rows[0] || null;
  }

  async update(id: string, data: Partial<Omit<OpportunityRecord, 'id' | 'created_at'>>): Promise<void> {
    const fields = Object.keys(data).map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    await this.pool.query(
      `UPDATE opportunities SET ${fields}, updated_at = NOW() WHERE id = $1`,
      [id, ...Object.values(data)]
    );
  }
}
```

### B. Rotas HTTP do Servidor (`api/src/http/opportunities-routes.ts`)
Definimos o endpoint `/v1/opportunities` na nossa API para gerenciar o recebimento do lead do diagnóstico e disparar os enrichments de dados em background usando a API da FonteData:

```typescript
import { Router } from 'express'; // se express for usado no adapter, ou seguindo o Fetch router atual
import { PostgresOpportunityRepository } from '../domains/opportunities/postgres-repository';

export function createOpportunitiesRoutes(deps: { service: PostgresOpportunityRepository }) {
  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url);
    if (url.pathname !== '/v1/opportunities' || request.method !== 'POST') return null;

    try {
      const body = await request.json();
      
      // 1. Processar e salvar no banco Cloud SQL (GCP)
      const record = await deps.service.create({
        client_name: body.name,
        client_email: body.email,
        client_company: body.company,
        pipeline_stage: 'diagnostic_done',
        diagnostico_id: body.diagnosticoId,
        opportunity_data: body.responses
      });

      // 2. Chamar o serviço de Enriquecimento (FonteData) em background se houver CNPJ
      if (body.cnpj) {
         // Rodar enriquecimento assincrono usando a API FonteData mapeada no credentials.json
      }

      return new Response(JSON.stringify({ success: true, id: record.id }), { status: 201 });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Erro ao criar oportunidade' }), { status: 500 });
    }
  };
}
```

---

## 3. Refatoração do Frontend (React Client)

Substituiremos a chamada direta de cliente do Supabase no arquivo `src/api/publicDiagnostic.ts` para bater diretamente na nossa nova API GCP:

*   **Antes (Supabase Direct):**
    ```typescript
    const { data: diagnosticoId } = await supabase.rpc('submit_diagnostico', { ... });
    ```

*   **Depois (GCP API Client):**
    ```typescript
    const response = await fetch('https://api.revhackers.com/v1/opportunities', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Adicionar token JWT se autenticado, ou ID de sessão anonima segura
        },
        body: JSON.stringify({
            name: lead.name,
            email: lead.email,
            company: lead.company,
            cnpj: lead.cnpj, // Injeção do campo FonteData
            diagnosticoId: generatedId,
            responses: fullResponses
        })
    });
    const result = await response.json();
    ```

---

## 4. O Handoff da Transição

Ao rodar esse passo a passo, desvinculamos a última grande dependência anônima/pública do frontend com o banco de dados do Supabase. O Gemini pode implementar esses novos arquivos de rotas no back-end no Cloud Run seguindo exatamente a especificação de domínio acima para finalizar a transição de diagnósticos de ponta a ponta.
