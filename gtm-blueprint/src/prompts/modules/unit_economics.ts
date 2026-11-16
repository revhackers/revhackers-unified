import { z } from 'zod';
import type { PromptSpec } from '../types';
import { SHARED_SYSTEM_PREAMBLE } from '../shared';
import { ClaimSchema } from '../evidence';

export const UnitEconomicsInputSchema = z.object({
  dossierSummary: z.record(z.any()),
  crmOrFinancialInputs: z.object({
    arpuMonthly: z.number().nullable().optional(),
    cacEstimated: z.number().nullable().optional(),
    churnMonthlyRate: z.number().nullable().optional(),
    salesCycleDays: z.number().nullable().optional(),
  }),
});

export type UnitEconomicsInput = z.infer<typeof UnitEconomicsInputSchema>;

export const UnitEconomicsOutputSchema = z.object({
  statusDados: z.enum(['DADOS REAIS FORNECIDOS', 'BASEADO EM BENCHMARK DE MERCADO', 'DADOS AUSENTES - NECESSITA COLETA']),
  metricasCalculadasOuBenchmark: z.object({
    arpu: ClaimSchema,
    cac: ClaimSchema,
    ltv: ClaimSchema,
    paybackMeses: ClaimSchema,
    ltvCacRatio: ClaimSchema,
  }),
  travaFinanceiraRisco: ClaimSchema.describe('Análise de sustentabilidade financeira e queima de caixa'),
  dadosParaColetarSeAusentes: z.array(z.string()),
  decisao: z.string(),
  proximosPassos: z.array(z.object({
    acao: z.string(),
    responsavelRole: z.string(),
    prazoDias: z.number(),
  })).min(1),
});

export type UnitEconomicsOutput = z.infer<typeof UnitEconomicsOutputSchema>;

const SYSTEM_ADDENDUM = `
# Módulo 7: Unit Economics B2B (CAC, LTV, Payback)

## 1. Objetivo Executivo e Estratégico
Avaliar a saúde financeira da aquisição de clientes com base estrita nos dados informados ou em benchmarks setoriais devidamente assinalados como hipótese. É estritamente proibido inventar dados financeiros de CAC, LTV ou ARPU caso não tenham sido fornecidos no input. Se faltarem dados, classifique como 'DADOS AUSENTES - NECESSITA COLETA' e liste o que auditar no ERP/CRM.

## 2. Metodologia Passo a Passo de Análise
1. Verificar os dados financeiros de entrada (arpuMonthly, cacEstimated, churnMonthlyRate, salesCycleDays).
2. Se fornecidos, calcular métricas (LTV = ARPU / Churn; Payback = CAC / ARPU; LTV/CAC ratio) e marcar como VERIFICADO citando fontes ou inputs.
3. Se ausentes, utilizar faixas de benchmark de mercado brasileiro B2B SaaS devidamente explicitadas e marcadas como HIPÓTESE.
4. Analisar a sustentabilidade financeira, eficiência de capital e risco de queima de caixa (burn rate).
5. Listar os dados exatos que precisam ser extraídos do financeiro/CRM.

## 3. Guia Detalhado Campo a Campo
- \`statusDados\`: Classificação da origem dos dados.
- \`metricasCalculadasOuBenchmark\`: ARPU, CAC, LTV, Payback e LTV/CAC estruturados com Claims.
- \`travaFinanceiraRisco\`: Análise crítica de risco financeiro.
- \`dadosParaColetarSeAusentes\`: O que auditar no sistema.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"statusDados": "DADOS REAIS FORNECIDOS", "arpu": {"text": "ARPU mensal informado de R$ 2.500 conforme inputs financeiros.", "status": "VERIFICADO", "evidenceIds": []}}\`
- MAL: \`{"statusDados": "DADOS REAIS FORNECIDOS", "arpu": {"text": "ARPU de R$ 50.000", "status": "VERIFICADO", "evidenceIds": []}}\`

## 5. Antipadrões a Evitar
- Nunca inventar CAC e LTV quando os dados de entrada estiverem vazios ou nulos.
- Nunca ignorar a regra de payback ideal para SaaS B2B (< 12 meses).
`;

export const unitEconomicsPromptSpec: PromptSpec<UnitEconomicsInput, UnitEconomicsOutput> = {
  id: 'module.unit_economics',
  version: '1.0.0',
  task: 'module',
  system: SHARED_SYSTEM_PREAMBLE + SYSTEM_ADDENDUM,
  buildUser(input: UnitEconomicsInput): string {
    return `Com base no Dossiê e nos dados financeiros/CRM fornecidos, gere o Módulo 7 (Unit Economics) em JSON estrito.

DOSSIÊ ESTRATÉGICO:
${JSON.stringify(input.dossierSummary, null, 2)}

DADOS FINANCEIROS / CRM FORNECIDOS:
${JSON.stringify(input.crmOrFinancialInputs, null, 2)}`;
  },
  schema: UnitEconomicsOutputSchema,
};
