import { invokeAi } from '@/hooks/useAiInvoke';
import {
  type EnrichedFounderResult,
  type DimensionScore,
  type PrioritizedAction,
  type MarketBenchmark,
  getScoreLevel,
} from '@/types/diagnostic';

export interface FounderAnalysisResult {
  archetype: string;
  score: number;
  headline: string;
  analysis: string;
  strengths: string[];
  blindSpots: string[];
  brandingGaps?: string[];
  actionableInsight?: string;
  linkedinData?: {
    fullName?: string;
    headline?: string;
    followerCount?: number;
    authorityScore?: number;
  };
}

const DEFAULT_BENCHMARK: MarketBenchmark = {
  segmentAverage: 58,
  topQuartile: 76,
  top10Percent: 91,
  yourPosition: 'P50',
  benchmarkSource: 'RevHackers Founder Index 2024 (n=184 founders B2B SaaS)',
};

function buildFounderDimensions(answers: number[], quizScore: number): DimensionScore[] {
  const names = ['Autoridade', 'Consistencia', 'Tese', 'Distribuicao', 'Conversao'];
  return answers.map((score, i) => ({
    name: names[i] || `Dimensao ${i + 1}`,
    score,
    insight:
      score >= 15
        ? `${names[i]} e o seu diferencial - explore isso.`
        : score >= 10
        ? `${names[i]} tem sinais de crescimento - mantenha ritmo.`
        : `${names[i]} e o gap mais urgente do seu perfil.`,
    recommendedAction:
      score >= 15
        ? 'Documentar e usar como ativo de marca.'
        : score >= 10
        ? 'Cadencia semanal de publico nessa frente.'
        : 'Reposicionar narrativa nessa dimensao.',
    impactBrl: Math.max(0, (18 - score) * 18000),
  }));
}

function buildFounderActions(dimensions: DimensionScore[], quizScore: number): PrioritizedAction[] {
  const sorted = [...dimensions].sort((a, b) => b.impactBrl - a.impactBrl);
  const tier: '7 dias' | '30 dias' | '90 dias' = quizScore < 50 ? '7 dias' : '30 dias';
  return sorted.slice(0, 3).map((d) => ({
    title: `Fortalecer ${d.name}`,
    description: d.recommendedAction,
    timeline: tier,
    impactBrl: d.impactBrl,
    effort: d.score < 10 ? 'alto' : 'medio',
    dimension: d.name,
  }));
}

function getMockAnalysis(score: number): EnrichedFounderResult {
  const archetype: EnrichedFounderResult['archetype'] = score > 80 ? 'Visionario' : score > 50 ? 'Relacionamento' : 'Tecnico';
  const dimensions = buildFounderDimensions([score / 5, score / 5, score / 5, score / 5, score / 5], score);
  const topActions = buildFounderActions(dimensions, score);
  const base = {
    archetype,
    score,
    scoreLevel: getScoreLevel(score),
    marketBenchmark: { ...DEFAULT_BENCHMARK, yourPosition: guessPosition(score) },
  };
  if (score > 80) {
    return {
      ...base,
      archetypeConfidence: 0.82,
      headline: 'O Lider de Mercado',
      analysis: 'Sua presenca impoe respeito, mas cuidado para nao se distanciar da realidade operacional.',
      dimensions,
      topActions,
      strengths: ['Autoridade Clara', 'Visao de Futuro'],
      blindSpots: ['Distancia do Cliente', 'Excesso de Abstracao'],
      brandingGaps: ['Falta de conteudo tecnico', 'Audiencia nao qualificada'],
      actionableInsight: 'Publique um caso de estudo real com metricas concretas esta semana.',
    };
  }
  if (score > 50) {
    return {
      ...base,
      archetypeConfidence: 0.71,
      headline: 'O Conector Estrategico',
      analysis: 'Voce gera movimento e networking, mas falta profundidade tecnica para sustentar LTV longo.',
      dimensions,
      topActions,
      strengths: ['Energia Alta', 'Rede de Contatos'],
      blindSpots: ['Churn Alto', 'Conteudo Raso'],
      brandingGaps: ['Perfil sem tese clara', 'Posts sem CTA de conversao'],
      actionableInsight: 'Defina sua tese proprietaria em 1 frase e a adicione ao headline do LinkedIn.',
    };
  }
  return {
    ...base,
    archetypeConfidence: 0.65,
    headline: 'O Especialista Oculto',
    analysis: 'Voce e brilhante tecnicamente, mas o mercado nao sabe que voce existe. Isso custa milhoes.',
    dimensions,
    topActions,
    strengths: ['Produto Solido', 'Conhecimento Profundo'],
    blindSpots: ['Invisibilidade', 'Vendas Passivas'],
    brandingGaps: ['Zero presenca digital', 'Nenhum conteudo publicado'],
    actionableInsight: 'Crie um post no LinkedIn contando 1 resultado real de um cliente. Faca isso hoje.',
  };
}

function guessPosition(score: number): 'P10' | 'P25' | 'P50' | 'P75' | 'P90' {
  if (score < 30) return 'P10';
  if (score < 50) return 'P25';
  if (score < 70) return 'P50';
  if (score < 85) return 'P75';
  return 'P90';
}

export async function analyzeFounderProfileAI(
  linkedinUrl: string,
  answers: number[],
  quizScore: number
): Promise<EnrichedFounderResult> {
  try {
    const result = await invokeAi<Record<string, unknown>>('analyze-diagnostic', {
      type: 'founder',
      answers,
      totalScore: quizScore,
      linkedinUrl,
    });

    if (result.error) {
      console.warn('[founderAnalysis] invokeAi failed:', result.error.message);
      return getMockAnalysis(quizScore);
    }

    const raw = result.data as { result?: unknown } | undefined;
    const data = ((raw?.result as Record<string, unknown>) || raw || {}) as Record<string, unknown>;

    const dimensions = buildFounderDimensions(answers, quizScore);
    const topActions = buildFounderActions(dimensions, quizScore);

    return {
      archetype: ((data.archetype as EnrichedFounderResult['archetype']) || 'Executor'),
      archetypeConfidence: typeof data.confidence === 'number' ? data.confidence : 0.65,
      score: quizScore,
      scoreLevel: getScoreLevel(quizScore),
      headline: ((data.linkedinData as Record<string, unknown>)?.headline as string) || 'Analise de perfil fundador',
      analysis: (data.analysis as string) || '',
      dimensions,
      topActions,
      strengths: ((data.strengths as string[]) || []).slice(0, 3),
      blindSpots: ((data.blindSpots as string[]) || []).slice(0, 3),
      brandingGaps: ((data.brandingGaps as string[]) || []).slice(0, 3),
      actionableInsight: (data.actionableInsight as string) || '',
      linkedinData: (data.linkedinData as EnrichedFounderResult['linkedinData']) || undefined,
      marketBenchmark: { ...DEFAULT_BENCHMARK, yourPosition: guessPosition(quizScore) },
    };
  } catch (error) {
    console.error('Erro founder analysis:', error);
    return getMockAnalysis(quizScore);
  }
}

export const _legacy = getMockAnalysis;
