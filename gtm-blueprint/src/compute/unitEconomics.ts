import type { PipelineInput } from '../pipeline.js';
import type { Evidence } from '../prompts/evidence.js';
import { formatPtBr } from '../prompts/numberGuard.js';

export type UnitEconomicsStatus = 'DADOS REAIS FORNECIDOS' | 'DADOS PARCIAIS' | 'DADOS AUSENTES - NECESSITA COLETA';
export type UnitEconomicsMissing = 'ticket médio mensal' | 'CAC' | 'churn mensal' | 'ciclo de vendas';

export interface UnitEconomicsComputed {
  status: UnitEconomicsStatus;
  arpuMensal: number | null;
  cac: number | null;
  /** Fração mensal: 0,035 = 3,5% ao mês. */
  churnMensal: number | null;
  cicloVendasDias: number | null;
  /** ARPU mensal ÷ churn mensal (receita; margem não é coletada). */
  ltv: number | null;
  /** CAC ÷ ARPU mensal. */
  paybackMeses: number | null;
  /** LTV ÷ CAC. */
  ltvCac: number | null;
  faltantes: UnitEconomicsMissing[];
}

type CrmInput = PipelineInput['crmOrFinancialInputs'];
type TamInput = PipelineInput['tamBottomUpData'];

/** Entrada válida é número finito e maior que zero; qualquer outro valor conta como ausente. */
function positiveOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null) return null;
  return numerator / denominator;
}

export function computeUnitEconomics(crm: CrmInput): UnitEconomicsComputed {
  const arpuMensal = positiveOrNull(crm?.arpuMonthly);
  const cac = positiveOrNull(crm?.cacEstimated);
  const churnMensal = positiveOrNull(crm?.churnMonthlyRate);
  const cicloVendasDias = positiveOrNull(crm?.salesCycleDays);

  const faltantes: UnitEconomicsMissing[] = [];
  if (arpuMensal === null) faltantes.push('ticket médio mensal');
  if (cac === null) faltantes.push('CAC');
  if (churnMensal === null) faltantes.push('churn mensal');
  if (cicloVendasDias === null) faltantes.push('ciclo de vendas');

  const present = 4 - faltantes.length;
  const status: UnitEconomicsStatus = present === 4
    ? 'DADOS REAIS FORNECIDOS'
    : present === 0
      ? 'DADOS AUSENTES - NECESSITA COLETA'
      : 'DADOS PARCIAIS';

  const ltv = ratio(arpuMensal, churnMensal);
  return {
    status,
    arpuMensal,
    cac,
    churnMensal,
    cicloVendasDias,
    ltv,
    paybackMeses: ratio(cac, arpuMensal),
    ltvCac: ratio(ltv, cac),
    faltantes,
  };
}

/** SOM anual = contas SOM × ARPU médio mensal × 12. Null quando falta algum dos dois valores. */
export function computeSomAnual(tam: TamInput): number | null {
  if (!tam) return null;
  const som = positiveOrNull(tam.estimatedSomAccounts);
  const arpu = positiveOrNull(tam.arpuMedioMensal);
  if (som === null || arpu === null) return null;
  return som * arpu * 12;
}

/**
 * Evidência `C1` (kind `computed`): uma linha por valor calculado, no mesmo formato da entrada `U1`.
 * Null quando nenhum valor foi calculado.
 */
export function computedEvidence(ue: UnitEconomicsComputed, somAnual: number | null): Evidence | null {
  const lines: string[] = [];
  if (ue.arpuMensal !== null) lines.push(`ARPU mensal: R$ ${formatPtBr(ue.arpuMensal)}`);
  if (ue.cac !== null) lines.push(`CAC: R$ ${formatPtBr(ue.cac)}`);
  if (ue.churnMensal !== null) lines.push(`Churn mensal: ${formatPtBr(ue.churnMensal)} (${formatPtBr(ue.churnMensal * 100)}%)`);
  if (ue.cicloVendasDias !== null) lines.push(`Ciclo de vendas: ${formatPtBr(ue.cicloVendasDias)} dias`);
  if (ue.ltv !== null) lines.push(`LTV (ARPU ÷ churn mensal): R$ ${formatPtBr(ue.ltv)}`);
  if (ue.paybackMeses !== null) lines.push(`Payback (CAC ÷ ARPU mensal): ${formatPtBr(ue.paybackMeses)} meses`);
  if (ue.ltvCac !== null) lines.push(`LTV/CAC: ${formatPtBr(ue.ltvCac)}x`);
  if (somAnual !== null) lines.push(`SOM anual (contas SOM × ARPU médio × 12): R$ ${formatPtBr(somAnual)}`);
  if (lines.length === 0) return null;
  return {
    id: 'C1',
    kind: 'computed',
    source: 'cálculo do GTM Blueprint',
    fetchedAt: new Date().toISOString(),
    content: lines.join('\n'),
  };
}
