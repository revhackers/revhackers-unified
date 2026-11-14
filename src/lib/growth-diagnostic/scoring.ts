// Motor de scoring do Diagnóstico Growth — DEMONSTRATIVO, NÃO validado.
//
// Funções puras, sem imports de UI. Faixas e recomendações reaproveitam
// textos já publicados no repo; nenhum número aqui tem validade
// metodológica. Para adicionar um eixo novo, basta acrescentar itens em
// GROWTH_AXES / GROWTH_QUESTIONS — nenhuma função precisa mudar.

import type { GrowthAxisId } from './spec';

export const SCORING_STATUS = 'DEMONSTRATIVO_NAO_VALIDADO' as const;

export type MaturityBand = 'critico' | 'alerta' | 'otimizado';

export interface AxisRecommendation {
  title: string;
  text: string;
  /** Arquivo real do repo de onde a recomendação foi adaptada. */
  source: string;
}

export interface GrowthDiagnosticResult {
  axisScores: Record<GrowthAxisId, number>;
  overall: number;
  band: MaturityBand;
  recommendations: Record<GrowthAxisId, AxisRecommendation>;
}

/** Converte um score bruto (score/max) para a escala 0-100. Divisão segura: max <= 0 retorna 0. */
export function normalizeOptionScore(score: number, max: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return 0;
  const clamped = Math.min(Math.max(score, 0), max);
  return Math.round((clamped / max) * 100);
}

/** Normaliza cada resposta por eixo para 0-100 (arredondado). Eixos extras passam intactos. */
export function computeAxisScores(
  answers: Record<GrowthAxisId, number>,
): Record<GrowthAxisId, number> {
  const entries = Object.entries(answers).map(([axisId, value]) => {
    const numeric = Number(value);
    const normalized = Number.isFinite(numeric)
      ? Math.min(Math.max(Math.round(numeric), 0), 100)
      : 0;
    return [axisId, normalized] as const;
  });
  return Object.fromEntries(entries) as Record<GrowthAxisId, number>;
}

/** Média aritmética 0-100, arredondada. Eixos extras entram na média sem quebrar o cálculo. */
export function computeOverall(axisScores: Record<GrowthAxisId, number>): number {
  const values = Object.values(axisScores).filter((v) => Number.isFinite(v));
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + (v as number), 0);
  return Math.round(sum / values.length);
}

/**
 * Faixas reaproveitadas de src/utils/diagnosticMapping.ts:10-14
 * (< 50 crítico, < 90 alerta, >= 90 otimizado).
 */
export function maturityBand(score: number): MaturityBand {
  if (score < 50) return 'critico';
  if (score < 90) return 'alerta';
  return 'otimizado';
}

const AXIS_RECOMMENDATIONS: Record<GrowthAxisId, AxisRecommendation> = {
  estrategia: {
    title: 'Defina o gargalo antes de acelerar',
    text: 'O maior limitador de crescimento raramente é onde os leads entram, é onde eles se perdem. Rode o ciclo Diagnóstico → Fundação antes de investir em aquisição.',
    source: 'src/pages/GrowthScore.tsx:28',
  },
  posicionamento: {
    title: 'Refine o ICP e a tese',
    text: 'Comunicação para todos ecoa para ninguém. Defina nicho, dor e tamanho na etapa de Fundação de Revenue para parar de atrair curiosos genéricos.',
    source: 'src/pages/GrowthScore.tsx:72',
  },
  aquisicao: {
    title: 'Distribua a matriz de canais',
    text: 'Depender de indicação não é estratégia, e depender só de tráfego pago concentra risco. Opere campanhas B2B com teto calculado de CAC (Aquisição Previsível).',
    source: 'src/pages/Metodologia.tsx:68-70',
  },
  demanda: {
    title: 'Saia do modo indicação',
    text: 'Implemente campanhas de aquisição e réguas de nutrição (Growth Loops) com testes A/B para tornar a geração de demanda repetível.',
    source: 'src/pages/Metodologia.tsx:144-145',
  },
  marketing: {
    title: 'Qualifique antes de vender',
    text: 'Conversar com curiosos desqualificados é o dinheiro mais caro que a empresa queima. Use IA de qualificação: corta quem não tem verba, agenda quem tem dor real.',
    source: 'src/pages/Metodologia.tsx:79-81',
  },
  vendas: {
    title: 'Documente o processo comercial',
    text: 'Esperança não é estratégia comercial: meta que não é fracionada até a atividade diária é inatingível de administrar. Formalize playbooks e revise com dados.',
    source: 'src/pages/RevenueScore.tsx:74',
  },
  crm: {
    title: 'Torne o CRM a fonte da verdade',
    text: 'Um CRM desatualizado é apenas uma planilha muito cara. Configure o CRM como um cofre de dados: zero pipeline viciado, zero oportunidade sem justificativa registrada.',
    source: 'src/pages/Metodologia.tsx:101-103',
  },
  revops: {
    title: 'Assine o SLA marketing-vendas',
    text: 'Guerra ou silos entre marketing e vendas custam receita anual. Defina tempo limite de abordagem, reporte de perda por etapa e arquitetura correta de CRM.',
    source: 'src/pages/RevenueScore.tsx:63',
  },
  retencao: {
    title: 'Trate churn como vazamento de caixa',
    text: 'Reter é parte do crescimento: avance para Escala & Otimização com automação de retenção e análise de coorte em vez de só comprar lead novo.',
    source: 'src/pages/Metodologia.tsx:151-152',
  },
  automacao: {
    title: 'Automatize o follow-up',
    text: 'Você não controla o que não processualiza. Plugue sistemas que perseguem o lead com consistência até ele preencher o calendário — o sistema não esquece de ligar.',
    source: 'src/pages/Metodologia.tsx:90-92',
  },
  maturidade: {
    title: 'Meça CAC teto e funil por etapa',
    text: 'Sem CAC teto (break-even), alavancar orçamento cega o caixa. Monte dashboards de conversão por etapa e monitore o limite semanalmente.',
    source: 'src/pages/GrowthScore.tsx:39',
  },
};

export function axisRecommendation(
  axisId: GrowthAxisId,
  _axisScore: number,
): AxisRecommendation {
  return AXIS_RECOMMENDATIONS[axisId];
}

export function buildResult(
  answers: Record<GrowthAxisId, number>,
): GrowthDiagnosticResult {
  const axisScores = computeAxisScores(answers);
  const overall = computeOverall(axisScores);
  const band = maturityBand(overall);
  const recommendations = Object.fromEntries(
    (Object.keys(axisScores) as GrowthAxisId[]).map((axisId) => [
      axisId,
      axisRecommendation(axisId, axisScores[axisId]),
    ]),
  ) as Record<GrowthAxisId, AxisRecommendation>;
  return { axisScores, overall, band, recommendations };
}
