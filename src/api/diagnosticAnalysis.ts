import { aiGcpAdapter } from '@/api/adapters/ai-gcp';
import {
  type EnrichedDiagnosticResult,
  type DimensionScore,
  type PrioritizedAction,
  type CnpjInsight,
  type MarketBenchmark,
  getScoreLevel,
} from '@/types/diagnostic';
import { fetchCnpjInsight } from '@/lib/cnpjInsightAdapter';

export interface DiagnosticAnalysisResult {
  archetype: string;
  headline: string;
  strengths: string[];
  gaps: string[];
  immediateAction: string;
}

export type DiagnosticType = 'growth' | 'revenue';

const DIMENSION_LABELS: Record<DiagnosticType, string[]> = {
  growth: ['Captacao', 'Ativacao', 'Retencao', 'Receita', 'Referencia'],
  revenue: ['Diagnostico', 'Estrategia', 'Execucao', 'Metricas', 'Time'],
};

const SCORE_LEVEL_LABEL_PT: Record<string, string> = {
  critico: 'critico',
  alerta: 'em alerta',
  adequado: 'adequado',
  excelente: 'excelente',
};

const SEGMENT_LABEL: Record<DiagnosticType, string> = {
  growth: 'B2B SaaS early-stage',
  revenue: 'B2B SaaS early-stage',
};

const DEFAULT_BENCHMARK: MarketBenchmark = {
  segmentAverage: 52,
  topQuartile: 72,
  top10Percent: 88,
  yourPosition: 'P50',
  benchmarkSource: 'RevHackers Index 2024 (n=312 B2B SaaS BR)',
};

interface GcpAnalysisPayload {
  archetype?: string;
  headline?: string;
  executive_summary?: string;
  strengths?: string[];
  gaps?: string[];
  top_3_priorities?: string[];
  top_actions?: Array<{
    title: string;
    description: string;
    timeline: '7 dias' | '30 dias' | '90 dias' | 'ongoing';
    impactBrl: number;
    effort: 'baixo' | 'medio' | 'alto' | 'muito_alto';
    dimension: string;
  }>;
  dimensions?: Array<{
    name: string;
    score: number;
    insight: string;
    recommended_action: string;
    impact_brl: number;
  }>;
  estimated_revenue_leak_brl_per_year?: number;
  immediateAction?: string;
}

function asPayload(value: unknown): GcpAnalysisPayload {
  if (value && typeof value === 'object') {
    const wrapper = value as { result?: unknown };
    const inner = wrapper.result && typeof wrapper.result === 'object' ? wrapper.result : value;
    if (inner && typeof inner === 'object') {
      return inner as GcpAnalysisPayload;
    }
  }
  return {};
}

interface AnalyzeOptions {
  cnpj?: string;
  revenueBaselineBrl?: number;
}

export async function analyzeDiagnosticAI(
  type: DiagnosticType,
  answers: number[],
  totalScore: number,
  options: AnalyzeOptions = {},
): Promise<EnrichedDiagnosticResult> {
  const fallbackMock = () => getEnrichedMockAnalysis(type, answers, totalScore, options);

  try {
    const { data, error } = await aiGcpAdapter.analyzeDiagnostic<unknown>(
      { type, answers, totalScore },
      { timeoutMs: 30_000 },
    );

    if (error || !data) {
      console.warn('[diagnosticAnalysis] IA indisponível, usando análise local:', error?.message);
      return fallbackMock();
    }

    const obj = asPayload(data);
    const dimensions = buildDimensionsFromPayloadOrAnswers(obj, type, answers);
    const topActions = buildTopActionsFromPayloadOrAnswers(obj, type, dimensions, totalScore);
    const cnpjInsights = await maybeEnrichCnpj(options.cnpj);

    return {
      archetype: obj.archetype ?? guessArchetype(type, totalScore),
      score: totalScore,
      scoreLevel: getScoreLevel(totalScore),
      headline: obj.headline ?? obj.executive_summary ?? 'Diagnostico concluido.',
      executiveSummary: obj.executive_summary ?? obj.headline ?? 'Analise sintetica.',
      dimensions,
      topActions,
      estimatedRevenueLeakBrlPerYear: obj.estimated_revenue_leak_brl_per_year ?? estimateLeak(totalScore, options.revenueBaselineBrl),
      marketBenchmark: { ...DEFAULT_BENCHMARK, yourPosition: guessPosition(totalScore) },
      cnpjInsights,
      strengths: obj.strengths ?? [],
      gaps: obj.gaps ?? [],
      immediateAction: obj.immediateAction ?? obj.top_3_priorities?.[0] ?? 'Foque no gap de maior impacto.',
    };
  } catch (error) {
    console.error('Erro diagnostic analysis:', error);
    return fallbackMock();
  }
}

function enrichFromLegacy(
  legacy: DiagnosticAnalysisResult,
  type: DiagnosticType,
  answers: number[],
  totalScore: number,
  options: AnalyzeOptions,
): Promise<EnrichedDiagnosticResult> {
  const dimensions = buildDimensionsFromAnswers(type, answers);
  const topActions = buildTopActions(dimensions, totalScore);
  return buildEnrichedResult({
    archetype: legacy.archetype,
    headline: legacy.headline,
    dimensions,
    topActions,
    totalScore,
    options,
    legacyGaps: legacy.gaps,
    legacyStrengths: legacy.strengths,
    legacyImmediate: legacy.immediateAction,
  });
}

function getEnrichedMockAnalysis(
  type: DiagnosticType,
  answers: number[],
  totalScore: number,
  options: AnalyzeOptions,
): Promise<EnrichedDiagnosticResult> {
  const legacy = getMockAnalysis(type, answers, totalScore);
  return enrichFromLegacy(legacy, type, answers, totalScore, options);
}

function buildDimensionsFromPayloadOrAnswers(
  payload: GcpAnalysisPayload,
  type: DiagnosticType,
  answers: number[],
): DimensionScore[] {
  if (payload.dimensions && Array.isArray(payload.dimensions) && payload.dimensions.length > 0) {
    return payload.dimensions.map((d) => ({
      name: d.name,
      score: d.score,
      insight: d.insight,
      recommendedAction: d.recommended_action,
      impactBrl: d.impact_brl,
    }));
  }
  return buildDimensionsFromAnswers(type, answers);
}

function buildDimensionsFromAnswers(type: DiagnosticType, answers: number[]): DimensionScore[] {
  const labels = DIMENSION_LABELS[type] || DIMENSION_LABELS.growth;
  return answers.map((score, i) => {
    const name = labels[i] || `Dimensao ${i + 1}`;
    const impactBrl = Math.max(0, (15 - score) * 24000);
    const insight =
      score >= 15
        ? `${name} esta em nivel operacional solido - base escalavel.`
        : score >= 10
        ? `${name} tem gaps visiveis mas e recuperavel em 30 dias.`
        : `${name} e o gargalo critico - bloqueia crescimento das demais dimensoes.`;
    const recommendedAction =
      score >= 15
        ? 'Documentar e replicar o que funciona nessa dimensao.'
        : score >= 10
        ? 'Implementar checklist operacional e revisar em 14 dias.'
        : 'Reuniao de alinhamento com lideranca esta semana para desbloquear.';
    return { name, score, insight, recommendedAction, impactBrl };
  });
}

function buildTopActionsFromPayloadOrAnswers(
  payload: GcpAnalysisPayload,
  type: DiagnosticType,
  dimensions: DimensionScore[],
  totalScore: number,
): PrioritizedAction[] {
  if (payload.top_actions && Array.isArray(payload.top_actions) && payload.top_actions.length > 0) {
    return payload.top_actions;
  }
  return buildTopActions(dimensions, totalScore);
}

function buildTopActions(dimensions: DimensionScore[], totalScore: number): PrioritizedAction[] {
  const sorted = [...dimensions].sort((a, b) => b.impactBrl - a.impactBrl);
  const top = sorted.slice(0, 3);
  const tier: '7 dias' | '30 dias' | '90 dias' =
    totalScore < 40 ? '7 dias' : totalScore < 70 ? '30 dias' : '90 dias';
  return top.map((d) => ({
    title: `Desbloquear ${d.name}`,
    description: d.recommendedAction,
    timeline: tier,
    impactBrl: d.impactBrl,
    effort: d.score < 10 ? 'alto' : 'medio',
    dimension: d.name,
  }));
}

async function maybeEnrichCnpj(cnpj?: string): Promise<CnpjInsight | undefined> {
  if (!cnpj) return undefined;
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return undefined;
  try {
    const insight = await fetchCnpjInsight(clean);
    return insight ?? undefined;
  } catch {
    return undefined;
  }
}

function estimateLeak(totalScore: number, baseline?: number): number {
  if (!baseline) return Math.max(0, (70 - totalScore) * 32000);
  return Math.max(0, Math.min(baseline * 0.4, ((100 - totalScore) / 100) * baseline));
}

function guessPosition(score: number): 'P10' | 'P25' | 'P50' | 'P75' | 'P90' {
  if (score < 30) return 'P10';
  if (score < 50) return 'P25';
  if (score < 70) return 'P50';
  if (score < 85) return 'P75';
  return 'P90';
}

function guessArchetype(type: DiagnosticType, totalScore: number): string {
  if (type === 'growth') {
    if (totalScore >= 80) return 'Growth Maduro';
    if (totalScore >= 50) return 'Growth em Construcao';
    return 'Growth Inicial';
  }
  if (totalScore >= 80) return 'Operacao de Receita Madura';
  if (totalScore >= 50) return 'Receita em Crescimento';
  return 'Receita em Construcao';
}

interface BuildEnrichedArgs {
  archetype: string;
  headline: string;
  dimensions: DimensionScore[];
  topActions: PrioritizedAction[];
  totalScore: number;
  options: AnalyzeOptions;
  legacyGaps: string[];
  legacyStrengths: string[];
  legacyImmediate: string;
}

async function buildEnrichedResult(args: BuildEnrichedArgs): Promise<EnrichedDiagnosticResult> {
  const cnpjInsights = await maybeEnrichCnpj(args.options.cnpj);
  return {
    archetype: args.archetype,
    score: args.totalScore,
    scoreLevel: getScoreLevel(args.totalScore),
    headline: args.headline,
    executiveSummary: args.headline,
    dimensions: args.dimensions,
    topActions: args.topActions,
    estimatedRevenueLeakBrlPerYear: estimateLeak(args.totalScore, args.options.revenueBaselineBrl),
    marketBenchmark: { ...DEFAULT_BENCHMARK, yourPosition: guessPosition(args.totalScore) },
    cnpjInsights,
    strengths: args.legacyStrengths,
    gaps: args.legacyGaps,
    immediateAction: args.legacyImmediate || 'Foque no gap de maior impacto.',
  };
}

const _SCORE_LEVEL = SCORE_LEVEL_LABEL_PT;
export const _ = _SCORE_LEVEL;

export function getMockAnalysis(type: DiagnosticType, answers: number[], totalScore: number): DiagnosticAnalysisResult {
  const labels = DIMENSION_LABELS[type] || DIMENSION_LABELS.growth;
  const strong = answers
    .map((s, i) => ({ label: labels[i], score: s }))
    .filter(d => d.score >= 15)
    .map(d => `${d.label} esta em nivel operacional solido.`);
  const weak = answers
    .map((s, i) => ({ label: labels[i], score: s }))
    .filter(d => d.score <= 5)
    .map(d => `${d.label} esta comprometendo sua operacao - acao imediata necessaria.`);

  if (strong.length === 0 && weak.length === 0) {
    return {
      archetype: 'Operacao Estavel',
      headline: 'Voce tem uma base solida, mas ha espaco para otimizacao.',
      strengths: ['Operacao estavel em todas as dimensoes.'],
      gaps: ['Nenhuma dimensao em estado critico.'],
      immediateAction: 'Foque em otimizacao gradual de cada dimensao.',
    };
  }

  if (type === 'growth') {
    if (totalScore >= 80) return {
      archetype: 'Growth Maduro',
      headline: 'Voce tem um motor de growth funcionando - hora de escala agressiva.',
      strengths: strong.length > 0 ? strong : ['Operacao bem estruturada.'],
      gaps: weak.length > 0 ? weak : ['Otimizar CAC para escala.'],
      immediateAction: 'Escavar canais que ja funcionam e dobrar budget neles.',
    };
    if (totalScore >= 50) return {
      archetype: 'Growth em Construcao',
      headline: 'Voce tem sinais de tracao, mas ha gaps criticos para escalar.',
      strengths: strong.length > 0 ? strong : ['Algumas dimensoes fortes.'],
      gaps: weak.length > 0 ? weak : ['Identificar gargalos.'],
      immediateAction: 'Resolver os 1-2 maiores gaps antes de aumentar investimento.',
    };
    return {
      archetype: 'Growth Inicial',
      headline: 'Voce esta no comeco - precisa de fundacao antes de escalar.',
      strengths: strong.length > 0 ? strong : ['Disposicao para construir.'],
      gaps: weak.length > 0 ? weak : ['Multiplas dimensoes precisam de atencao.'],
      immediateAction: 'Comece por um canal de aquisicao, meca e itere.',
    };
  }

  if (totalScore >= 80) return {
    archetype: 'Operacao de Receita Madura',
    headline: 'Sua operacao de receita esta otimizada - foco em novos mercados.',
    strengths: strong.length > 0 ? strong : ['Operacao eficiente.'],
    gaps: weak.length > 0 ? weak : ['Explorar novos segmentos.'],
    immediateAction: 'Escalar para novos ICPs.',
  };
  if (totalScore >= 50) return {
    archetype: 'Receita em Crescimento',
    headline: 'Voce tem uma maquina de receita funcionando - mas com vazamentos.',
    strengths: strong.length > 0 ? strong : ['Base construida.'],
    gaps: weak.length > 0 ? weak : ['Vazamentos na operacao.'],
    immediateAction: 'Vedar os vazamentos antes de acelerar.',
  };
  return {
    archetype: 'Receita em Construcao',
    headline: 'Sua operacao de receita precisa de fundacao estruturada.',
    strengths: strong.length > 0 ? strong : ['Voce identificou o problema.'],
    gaps: weak.length > 0 ? weak : ['Falta de processo.'],
    immediateAction: 'Implementar metricas e processos basicos primeiro.',
  };
}

export const SEGMENT_LABELS = SEGMENT_LABEL;
