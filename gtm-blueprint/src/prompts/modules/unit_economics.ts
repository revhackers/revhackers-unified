import { z } from 'zod';
import type { PromptSpec } from '../types';
import { SHARED_SYSTEM_PREAMBLE } from '../shared';
import { ClaimSchema } from '../evidence';
import type { UnitEconomicsComputed } from '../../compute/unitEconomics';

export const UnitEconomicsInputSchema = z.object({
  dossierSummary: z.record(z.any()),
  calculado: z.custom<UnitEconomicsComputed>().describe('Valores de unit economics calculados por código (nulos = ausentes)'),
});

export type UnitEconomicsInput = z.infer<typeof UnitEconomicsInputSchema>;

export const UnitEconomicsOutputSchema = z.object({
  leituraFinanceira: ClaimSchema.describe('Leitura dos valores calculados. Com status AUSENTES, descreve o que não dá para concluir e por quê.'),
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
# Módulo 7: Unit Economics B2B (ARPU, CAC, LTV, Payback)

## 1. Objetivo Executivo e Estratégico
Interpretar a saúde financeira da aquisição de clientes a partir dos valores já calculados por código no campo \`calculado\`. Não calcule, não estime e não cite benchmark. Quando \`calculado.status\` for AUSENTES, o módulo descreve o que não dá para concluir e por quê.

## 2. Metodologia Passo a Passo de Análise
1. Ler \`calculado\`: ARPU mensal, CAC, churn mensal (fração mensal), ciclo de vendas, LTV (ARPU ÷ churn), payback (CAC ÷ ARPU) e LTV/CAC.
2. Interpretar apenas os valores não nulos. Valor nulo é dado ausente: não o substitua por faixa de mercado.
3. Analisar sustentabilidade financeira, eficiência de capital e risco de queima de caixa com base nesses valores.
4. Listar os dados exatos que precisam ser extraídos do financeiro/CRM (\`faltantes\` e campos nulos).

## 3. Guia Detalhado Campo a Campo
- \`leituraFinanceira\`: Leitura dos valores calculados, ou da lacuna quando o status for AUSENTES.
- \`travaFinanceiraRisco\`: Análise crítica de risco financeiro sobre os valores calculados. Sem CAC ou ARPU, o risco é descrito como lacuna, não quantificado.
- \`dadosParaColetarSeAusentes\`: O que auditar no ERP/CRM.
- \`decisao\` & \`proximosPassos\`: Governança financeira.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"leituraFinanceira": {"text": "Ticket médio, CAC, churn e ciclo de vendas não foram informados: não é possível concluir o retorno por cliente nem a viabilidade da aquisição.", "status": "HIPOTESE", "evidenceIds": [], "howToValidate": "Extrair do ERP a receita mensal por cliente ativo e do financeiro o gasto com mídia e comercial dos últimos 6 meses."}}\`
- MAL: \`{"leituraFinanceira": {"text": "O LTV é de R$ 50.000 e o payback de 3 meses.", "status": "VERIFICADO", "evidenceIds": []}}\`

## 5. Antipadrões a Evitar
- Nunca inventar CAC, LTV, ARPU ou benchmark quando o valor estiver nulo em \`calculado\`.
- Nunca recalcular LTV, payback ou LTV/CAC com fórmula própria.
- Anti-exemplo real (eval): MAL \`{"travaFinanceiraRisco": {"text": "CAC acima de R$ [X] queima caixa e o payback passa de [N] meses.", "status": "VERIFICADO", "evidenceIds": []}}\` → BOM \`{"travaFinanceiraRisco": {"text": "O risco de queima de caixa não pode ser medido: o CAC não consta em calculado, e sem ele o payback não tem base.", "status": "HIPOTESE", "evidenceIds": [], "howToValidate": "Somar o gasto com mídia e comercial do período e dividir pelo número de clientes novos do mesmo período."}}\`
`;

export const unitEconomicsPromptSpec: PromptSpec<UnitEconomicsInput, UnitEconomicsOutput> = {
  id: 'module.unit_economics',
  version: '2.0.1',
  task: 'module',
  system: SHARED_SYSTEM_PREAMBLE + SYSTEM_ADDENDUM,
  buildUser(input: UnitEconomicsInput): string {
    return `Com base no Dossiê e nos valores calculados por código, gere o Módulo 7 (Unit Economics) em JSON estrito.

DOSSIÊ ESTRATÉGICO:
${JSON.stringify(input.dossierSummary, null, 2)}

VALORES CALCULADOS POR CÓDIGO (calculado):
${JSON.stringify(input.calculado, null, 2)}`;
  },
  schema: UnitEconomicsOutputSchema,
};
