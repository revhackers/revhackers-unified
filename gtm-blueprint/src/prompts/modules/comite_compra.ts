import { z } from 'zod';
import type { PromptSpec } from '../types';
import { SHARED_SYSTEM_PREAMBLE } from '../shared';
import { ClaimSchema, RecomendacaoSchema } from '../evidence';

export const ComiteCompraInputSchema = z.object({
  dossierSummary: z.record(z.any()),
  icpOutput: z.record(z.any()),
});

export type ComiteCompraInput = z.infer<typeof ComiteCompraInputSchema>;

export const ComiteCompraOutputSchema = z.object({
  membrosComite: z.array(z.object({
    papel: z.enum(['Decisor (C-Level/Diretor)', 'Influenciador Técnico', 'Usuário Final', 'Bloqueador/Financeiro']),
    cargo: z.string().describe('Cargo e contexto, sem nome de pessoa. Ex: CRO de SaaS B2B mid-market'),
    dorPrimaria: ClaimSchema,
    gatilhoConversao: ClaimSchema,
    objecaoChave: ClaimSchema,
    criterioAvaliacao: ClaimSchema,
    mensagemChaveProposta: RecomendacaoSchema,
  })).min(3).max(4),
  dinamicaAprovacao: ClaimSchema.describe('Como o comitê interage e quem tem veto final na decisão de compra'),
  decisao: z.string(),
  proximosPassos: z.array(z.object({
    acao: z.string(),
    responsavelRole: z.string(),
    prazoDias: z.number(),
  })).min(1),
});

export type ComiteCompraOutput = z.infer<typeof ComiteCompraOutputSchema>;

const SYSTEM_ADDENDUM = `
# Módulo 3: Comitê de Compra B2B (Buying Committee)

## 1. Objetivo Executivo e Estratégico
Mapear com precisão cirúrgica a dinâmica política, as dores e o processo de aprovação do comitê de compra B2B para o ICP definido no Módulo 2 e no Dossiê. É fundamental reutilizar as personas e cargos definidos no Dossiê, detalhando critérios de avaliação, objeções-chave e a mensagem exata para desarmar resistências. Persona é cargo arquetípico: não há nome de pessoa.

## 2. Metodologia Passo a Passo de Análise
1. Resgatar as personas do comitê de compra estabelecidas no Dossiê Estratégico, pelo cargo.
2. Detalhar para cada membro (Decisor, Influenciador, Usuário, Bloqueador/Financeiro) a dor primária, o gatilho de conversão e a objeção principal. Esses itens são hipótese até haver entrevista ou dado do cliente. Depoimentos em dores e gatilhos transcritos com o autor exatamente como consta na evidência citada; nunca trocar o sujeito da frase.
3. Especificar os critérios objetivos de avaliação de ROI/valor que cada membro utiliza na tomada de decisão.
4. Desenhar a dinâmica de aprovação corporativa, explicitando quem detém o poder de veto final (geralmente CFO ou CEO).
5. Definir a mensagem-chave da proposta comercial direcionada a cada stakeholder.

## 3. Guia Detalhado Campo a Campo
- \`membrosComite\`: Array com papel, cargo (sem nome de pessoa), dor primária, gatilho, objeção, critério de avaliação (Claims) e mensagem-chave (recomendação). O critério descreve o que o membro mede, sem valor-alvo: payback, ROI e redução de CAC aparecem como critério a apurar, nunca como resultado. Em \`mensagemChaveProposta\`, payback, prazos e percentuais de resultado só com [ID] de evidência que declare esse resultado para essa métrica; sem fonte, a mensagem descreve o mecanismo sem número.
- \`dinamicaAprovacao\`: Explicação de como o comitê delibera e quem tem veto.
- \`decisao\`: Ação tática imediata para engajamento do comitê.
- \`proximosPassos\`: Passos operacionais com prazos. Em \`acao\`, ações sem metas numéricas de resultado (sem %, sem payback em meses); números apenas de execução já contratada.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"papel": "Decisor (C-Level/Diretor)", "cargo": "CRO de SaaS B2B mid-market", "dorPrimaria": {"text": "Previsibilidade de forecast e ciclo de vendas longo em contas Enterprise; hipótese a partir da tese do Dossiê.", "status": "HIPOTESE", "evidenceIds": [], "howToValidate": "Entrevistar três CROs de clientes e prospects sobre o forecast mensal."}}\`
- MAL: \`{"papel": "Decisor", "cargo": "Chefe", "dorPrimaria": {"text": "Quer vender mais.", "status": "VERIFICADO", "evidenceIds": []}}\`

## 5. Antipadrões a Evitar
- Nunca inventar personas desconectadas do Dossiê Estratégico.
- Nunca ignorar a figura do Bloqueador Financeiro/CFO no processo de aprovação B2B no Brasil.
- Nunca tratar a dor de uma persona como fato observado na empresa.
- Sem modelo de precificação, fee variável, reembolso ou SLA sem fonte citada que declare esse termo.
- Depoimentos em dores e gatilhos transcritos com o autor exatamente como consta na evidência citada; nunca trocar o sujeito da frase.
- Anti-exemplo real (eval): MAL \`"mensagemChaveProposta": {"text": "Investimento de R$ [X] em [N] dias gera retorno de R$ [Y] via redução de CAC de [N]%.", "baseadoEm": []}\` → BOM \`"mensagemChaveProposta": {"text": "Piloto com escopo e custo fechados em proposta; o retorno é medido no CRM com o CAC apurado antes da assinatura [E1].", "baseadoEm": ["E1"]}\`
`;

export const comiteCompraPromptSpec: PromptSpec<ComiteCompraInput, ComiteCompraOutput> = {
  id: 'module.comite_compra',
  version: '2.0.1',
  task: 'module',
  system: SHARED_SYSTEM_PREAMBLE + SYSTEM_ADDENDUM,
  buildUser(input: ComiteCompraInput): string {
    return `Com base no Dossiê Estratégico e no ICP definido, gere o Módulo 3 (Comitê de Compra B2B) em JSON estrito.

DOSSIÊ ESTRATÉGICO:
${JSON.stringify(input.dossierSummary, null, 2)}

ICP DEFINIDO NO MÓDULO ANTERIOR:
${JSON.stringify(input.icpOutput, null, 2)}`;
  },
  schema: ComiteCompraOutputSchema,
};
