# Estudo de Ponta a Ponta: Arquitetura RevHackers e Integração FonteData

Este documento apresenta uma análise técnica profunda da arquitetura do projeto RevHackers de ponta a ponta e estabelece o plano estratégico de engenharia para plugar as APIs da FonteData diretamente na ferramenta de Diagnóstico e na Calculadora de ROI (REI).

---

## 1. Mapeamento da Arquitetura Atual do RevHackers (De Ponta a Ponta)

O repositório principal do RevHackers (`/repository`) é composto por uma aplicação moderna, performática e integrada:

*   **Frontend (Camada de Apresentação):** Construído em **React**, **TypeScript** e **Vite** com estilização via **Tailwind CSS**. A navegação de teclado rápida (estilo Linear e Notion) está implementada nos fluxos de perguntas dos diagnósticos.
*   **Backend & Infraestrutura (Camada de Dados):** Integrado de forma híbrida com o **Supabase** (para autenticação, banco de dados Postgres e Edge Functions). Há um plano de migração incremental para o Google Cloud Platform (GCP) em andamento.
*   **Camada de Automação de CRM (GHL Relay):** Os dados coletados de leads e diagnósticos são roteados em tempo real para o GoHighLevel (GHL) através de uma biblioteca de retransmissão (`@/lib/ghlRelay`), sincronizando oportunidades no pipeline comercial.

---

## 2. Anatomia do Fluxo de Diagnósticos e do Motor REI

O ecossistema conta com quatro diagnósticos de alta performance:
1.  *Growth Score (Diagnóstico 360 de Growth):* Localizado em `src/pages/GrowthScore.tsx`.
2.  *Revenue Score (Diagnóstico CRM & RevOps):* Localizado em `src/pages/RevenueScore.tsx`.
3.  *Founder Score (Autoridade do Fundador):* Localizado em `src/pages/FounderScore.tsx`.
4.  *Site Score (Site & Landing Page):* Localizado em `src/pages/SiteScore.tsx`.

### O Pipeline de Captura de Dados:
*   **Fase 1 (Perguntas):** O usuário responde a 5 perguntas estratégicas de alta clareza de negócios, acumulando pontuações ponderadas.
*   **Fase 2 (Captura de Lead):** No encerramento da pontuação, se o lead ainda não foi submetido, o sistema abre o modal de identificação obrigatório contendo o componente `DiagnosticForm.tsx`.
*   **Fase 3 (Submissão):** O formulário chama a API `submitPublicDiagnostic` em `src/api/publicDiagnostic.ts`.

### Lógica da API `submitPublicDiagnostic`:
1.  **RPC Supabase:** Cria o registro de assessment invocando a função de banco segura `submit_diagnostico` no Supabase.
2.  **Oportunidade (Pipeline de Pré-Vendas):** Verifica no banco se o e-mail do lead já possui uma oportunidade aberta. Se não possuir, cria um registro na tabela `opportunities`, salvando o payload completo de respostas no campo JSON `opportunity_data`.
3.  **Relay GHL:** Dispara a sincronização de dados via `sendToGHL()`, enviando o score, nível de maturidade e URL do resultado para o CRM.

---

## 3. Arquitetura de Integração FonteData (O Modelo Growth Hacker)

Substituiremos toda a temática burocrática de "auditoria cadastral" ou "consulta de crédito" por ganchos focados em poder de escala, velocidade de crescimento e prospecção de grandes contas.

```
+-----------------------------------------------------------------+
|               Diagnóstico RevHackers Finalizado                 |
+--------------------------------+--------------------------------+
                                 | (Modal de Lead)
                                 v
+-----------------------------------------------------------------+
|         Filtro Inbound: Insira o CNPJ da sua Empresa            |
+--------------------------------+--------------------------------+
                                 | (Consulta em background)
                                 v
+--------------------------------+--------------------------------+
|       FonteData API (Cadastro PJ Plus / Simples Nacional)       |
+--------------------------------+--------------------------------+
                                 | (Retorna dados ricos)
                                 v
+--------------------------------+--------------------------------+
| 1. Auto-População do Form: Preenche Razão, Sócios e Filiais     |
| 2. Motor de ROI: Atualiza ROI com base no Capital Social real  |
| 3. dadmin: Calcula o Score SPI (ScalePower Index)               |
| 4. GHL Relay: Envia inteligência empresarial pronta ao CRM      |
+-----------------------------------------------------------------+
```

### A. Ajuste de Interface (DiagnosticForm.tsx)
*   Adicionar um campo opcional e elegante com o rótulo **"CNPJ da Organização (Preenchimento Automático)"**.
*   Ao digitar um CNPJ válido, o componente dispara uma chamada assíncrona local para a API `Consulta CNPJ Receita` (custo insignificante de R$ 0.16) ou `Cadastro PJ Plus` (R$ 0.54).
*   O sistema auto-popula instantaneamente os campos:
    *   *Nome da Empresa* (com a Razão Social ou Nome Fantasia real).
    *   *Cargo Estratégico* (mapeia o quadro de sócios e sugere o cargo correspondente se o nome digitado coincidir).
*   **Benefício:** Reduz o trabalho de digitação do usuário e garante dados 100% reais no banco, evitando cadastros de empresas fictícias ("teste ltda").

### B. Integração de Enriquecimento no Backend (`submitPublicDiagnostic.ts`)
Para garantir zero atrito em dispositivos móveis, podemos rodar o enriquecimento de forma assíncrona logo após o salvamento da oportunidade no Supabase:
1.  O lead submete o formulário com o CNPJ ou o e-mail corporativo.
2.  Uma função em background dispara a chamada de **Pessoa Jurídica Plus** e **Vínculos Societários** na FonteData.
3.  O JSON de retorno da FonteData é gravado de forma estruturada dentro do campo JSON `opportunity_data` na tabela `opportunities` do Supabase.
4.  O sistema atualiza a oportunidade setando o indicador de **ScalePower Index (SPI)** de acordo com a seguinte fórmula simplificada:
    *   `SPI = (Capital Social Ponderado) + (Maturidade de Mercado) + (Volume de Filiais) - (Gargalos Judiciais/Friction)`

### C. Alavancagem no GHL CRM (O Handoff Perfeito para o SDR)
O payload enviado no GHL Relay (`sendToGHL`) é enriquecido com as seguintes chaves estratégicas:
*   `scale_power_index`: Score unificado de tração de 0 a 100.
*   `capital_social`: Capital social oficial registrado na receita.
*   `founder_names`: Nome dos sócios administradores oficiais (para checar quem o SDR deve chamar no LinkedIn).
*   `sister_companies_count`: Quantidade de empresas coligadas ou irmãs pertencentes ao mesmo grupo societário (Holding Hunter).

O SDR abre a conta no GoHighLevel e recebe alertas precisos como:
> *"NOVO LEAD QUALIFICADO: SPI 85 (Alto). Capital Social: R$ 500k. Sócio Administrador mapeado: [Nome]. Empresa possui 3 marcas irmãs registradas no mesmo grupo societário (oportunidade de escala de grupo)."*

---

## 4. Plano de Ação para Implementação no Terminal (Diretrizes para o Gemini)

Para que o Gemini execute essa integração de ponta a ponta sem cometer erros de regressão no repositório ativo, ele deve seguir a seguinte ordem de tarefas:

1.  **Homologação de Rota no API Client:**
    *   Criar um arquivo em `src/api/fontedata.ts` consumindo a rota de CNPJ. Usar como modelo o arquivo `fontedata_test.py` gerado no workspace de CFO. Ele deve buscar o token da API no `credentials.json` ou variáveis de ambiente locais `.env`.
2.  **Modificação do Formulário:**
    *   Abrir `src/components/diagnostics/DiagnosticForm.tsx` e inserir o input de CNPJ com máscara dinâmica. Implementar a chamada ao client de API da FonteData para auto-preencher os campos de empresa e cargo.
3.  **Enriquecimento na Criação da Oportunidade:**
    *   Abrir `src/api/publicDiagnostic.ts` e modificar a função `submitPublicDiagnostic` para receber o CNPJ do formulário. Antes de salvar no Supabase, processar o payload da FonteData e anexá-lo ao campo JSON `opportunity_data`.
4.  **Atualização do GHL Relay:**
    *   Garantir que a função `sendToGHL` receba os novos parâmetros enriquecidos (SPI, sócios, marcas irmãs) e os envie como custom fields para a API do GoHighLevel.
