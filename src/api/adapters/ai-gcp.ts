/**
 * Adapter GCP para handlers AI.
 *
 * Chamadas autenticadas para a API GCP. Legado: o build de producao nao
 * define VITE_GCP_*, entao este adapter fica inerte.
 */

import { authenticatedRequest } from './_base';

export interface InvokeOptions {
  /** Timeout em ms (default 30000). */
  timeoutMs?: number;
  /** Provider override (minimax|openai|gemini). */
  provider?: string;
  /** Model override. */
  model?: string;
}

export interface InvokeResult<T> {
  data: T | null;
  error: Error | null;
}

async function invoke<T>(
  handlerName: string,
  body: Record<string, unknown>,
  options: InvokeOptions = {},
): Promise<InvokeResult<T>> {
  const { timeoutMs = 30_000, ...restOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await authenticatedRequest(`/v1/ai/${handlerName}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, ...restOptions }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { data: null, error: new Error(`AI ${handlerName} failed (${response.status}): ${errText.slice(0, 300)}`) };
    }
    const payload = (await response.json()) as { data?: T };
    return { data: payload.data ?? null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  } finally {
    clearTimeout(timer);
  }
}

export const aiGcpAdapter = {
  invoke,

  // ---- Helpers especificos por handler ----

  analyzeDiagnostic: <T = unknown>(input: { type: 'growth' | 'revenue' | 'founder'; answers: number[]; totalScore?: number; linkedinUrl?: string }, options?: InvokeOptions) =>
    invoke<T>('analyze-diagnostic', input, options),

  generateGrowthmap: <T = unknown>(input: { framework: string; company_name: string; company_description?: string; segment?: string; rei_responses?: Record<string, unknown>; competitors?: Array<{ nome: string; url?: string }> }, options?: InvokeOptions) =>
    invoke<T>('generate-growthmap', input, options),

  generateStrategicPlan: <T = unknown>(input: Record<string, unknown>, options?: InvokeOptions) =>
    invoke<T>('generate-strategic-plan', input, options),

  agentChat: <T = unknown>(input: { messages: Array<{ role: string; content: string }>; agentId?: string; model?: string; raw_mode?: boolean }, options?: InvokeOptions) =>
    invoke<T>('agent-chat', input, options),

  autoEnrichProject: <T = unknown>(input: { project_id?: string; opportunity_id?: string; projectId?: string }, options?: InvokeOptions) =>
    invoke<T>('auto-enrich-project', input, options),

  marketIntelligence: <T = unknown>(input: Record<string, unknown>, options?: InvokeOptions) =>
    invoke<T>('market-intelligence', input, options),

  inspectWebsite: <T = unknown>(input: { url: string }, options?: InvokeOptions) =>
    invoke<T>('inspect-website', input, options),

  scrapeProfile: <T = unknown>(input: Record<string, unknown>, options?: InvokeOptions) =>
    invoke<T>('scrape-profile', input, options),

  generatePlaybook: <T = unknown>(input: { projectId: string; framework: string }, options?: InvokeOptions) =>
    invoke<T>('generate-playbook', input, options),

  generateSuccessPlan: <T = unknown>(input: { project_id?: string; opportunity_id?: string; success_plan_id?: string }, options?: InvokeOptions) =>
    invoke<T>('generate-success-plan', input, options),

  cruxBenchmark: <T = unknown>(input: { clientUrl: string; competitorUrls: string[]; formFactor?: string }, options?: InvokeOptions) =>
    invoke<T>('crux-benchmark', input, options),

  generateImage: <T = unknown>(input: { prompt: string }, options?: InvokeOptions) =>
    invoke<T>('generate-image', input, options),

  triggerPostReiEnrichment: <T = unknown>(input: { projectId: string; reiType?: string }, options?: InvokeOptions) =>
    invoke<T>('trigger-post-rei-enrichment', input, options),

  // ---- NOVAS FEATURES (Wave 1 - MiniMax growth hub) ----

  /** Analise SWOT automatica via MiniMax para um competitor. */
  swotAnalysis: <T = unknown>(input: { company_name: string; company_url?: string; industry?: string; description?: string; client_context?: string }, options?: InvokeOptions) =>
    invoke<T>('swot-analysis', input, options),

  /** Auto-sugestao dos 3 frameworks prioritarios do Growth Map. */
  growthmapSuggest: <T = unknown>(input: { archetype: string; totalScore: number; dimensionScores?: Record<string, number>; segment?: string; objective?: string }, options?: InvokeOptions) =>
    invoke<T>('growthmap-suggest', input, options),
};
