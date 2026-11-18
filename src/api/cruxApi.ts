/**
 * cruxApi - Benchmark de CrUX (Chrome UX Report) via GCP AI handler
 * (Wave 1.3 - usa invokeAi).
 */

import { invokeAi } from '@/hooks/useAiInvoke';

export type CrUXCategory = 'FAST' | 'AVERAGE' | 'SLOW';

export interface CrUXMetric {
    p75: number;
    category: CrUXCategory;
}

export interface CrUXMetrics {
    url: string;
    lcp: CrUXMetric;
    cls: CrUXMetric;
    inp: CrUXMetric;
    ttfb: CrUXMetric;
    formFactor: string;
    collectionPeriod?: string;
    error?: string;
}

export interface RankingEntry {
    url: string;
    score: number;
    position: number;
}

export interface AiInterpretation {
    summary: string;
    client_standout: string[];
    client_concerns: string[];
    competitor_advantages: Array<{ competitor: string; advantages: string[] }>;
    recommendations: string[];
}

export interface BenchmarkResult {
    clientSite: CrUXMetrics;
    competitors: CrUXMetrics[];
    ranking: RankingEntry[];
    aiInterpretation?: AiInterpretation | string;
    collectionPeriod?: string;
    formFactor: string;
}

/**
 * Realiza benchmark do site do cliente contra concorrentes via GCP AI.
 * API key gerenciada server-side (nao passa como parametro).
 */
export async function runCompetitiveBenchmark(
    clientUrl: string,
    competitorUrls: string[],
    formFactor: 'PHONE' | 'DESKTOP' = 'PHONE'
): Promise<BenchmarkResult> {
    const { data, error } = await invokeAi<BenchmarkResult>('crux-benchmark', {
        clientUrl,
        competitorUrls,
        formFactor,
    });
    if (error) throw error;
    if (!data) throw new Error('Resposta vazia do handler de benchmark.');
    return data;
}

/**
 * Formata valor de metrica para exibicao
 */
export function formatMetricValue(metric: 'lcp' | 'cls' | 'inp' | 'ttfb', value: number): string {
    switch (metric) {
        case 'lcp':
        case 'ttfb':
            return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
        case 'cls':
            return value.toFixed(2);
        case 'inp':
            return `${Math.round(value)}ms`;
        default:
            return String(value);
    }
}

/**
 * Retorna cor baseada na categoria
 */
export function getCategoryColor(category: CrUXCategory): string {
    switch (category) {
        case 'FAST': return '#00C853';
        case 'AVERAGE': return '#FFAB00';
        case 'SLOW': return '#FF1744';
        default: return '#9E9E9E';
    }
}
