import type { PromptSpec } from '../prompts/types.js';
import type { LlmProvider, LlmResponse, ModelRoute, Task } from './types.js';
import { getRoute } from './registry.js';
import { extractJson, JsonExtractionError } from './json.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SHARED_SYSTEM_PREAMBLE } from '../prompts/shared.js';

export class PromptOutputError extends Error {
  constructor(
    message: string,
    public readonly promptId: string,
    public readonly rawText: string,
    public readonly validationErrors?: unknown
  ) {
    super(message);
    this.name = 'PromptOutputError';
  }
}

export interface RunPromptDeps {
  registry?: (task: Task, env?: Record<string, string | undefined>) => ModelRoute;
  providers: Record<string, LlmProvider>;
}

export async function runPrompt<I, O>(
  spec: PromptSpec<I, O>,
  input: I,
  deps: RunPromptDeps
): Promise<{ data: O; raw: LlmResponse; costUsd: number }> {
  const routeFn = deps.registry || getRoute;
  const route = routeFn(spec.task);

  const provider = deps.providers[route.provider];
  if (!provider) {
    throw new Error(`LLM provider '${route.provider}' not found in providers registry for prompt '${spec.id}'`);
  }

  const jsonSchema = zodToJsonSchema(spec.schema, { name: 'OutputSchema', target: 'jsonSchema7' });
  const preamble = SHARED_SYSTEM_PREAMBLE;
  const rest = spec.system.startsWith(SHARED_SYSTEM_PREAMBLE)
    ? spec.system.slice(SHARED_SYSTEM_PREAMBLE.length)
    : spec.system;
  // Política dos redatores; extração e auditoria mantêm seus contratos próprios.
  const grounding = spec.task === 'dossier' || spec.task === 'module' ? `
# ATERRAMENTO DOS REDATORES
- Fatos da empresa exigem fonte que sustente a afirmação inteira, não apenas um ID existente. Nunca transforme dores de uma persona em fatos observados na empresa.
- Métricas financeiras, percentuais, volumes, tamanhos de mercado e benchmarks só podem repetir dados explicitamente fornecidos, com a fonte correspondente. Número encontrado no concorrente não descreve a empresa analisada.
- Sem dado, explique qualitativamente a lacuna e como coletá-lo. Não invente faixas, exemplos numéricos, garantias comerciais, nomes de pessoas ou resultados, nem mesmo dentro de HIPOTESE ou howToValidate.
- Personas sem pessoa comprovada são cargos hipotéticos, não pessoas identificadas. Mensagens propostas são recomendações, nunca promessas comerciais verificadas.
- Prazos de execução e notas de priorização exigidos pelo schema são propostas, não resultados observados. Não use essa exceção para inventar CAC, receita, conversão ou metas.
- Preserve profundidade com diagnóstico específico, consequência, decisão e validação concreta. Frases densas e curtas, sem repetir o dossiê nem preencher lacunas com números.
` : '';
  const fullRest = `${rest}\n${grounding}\n# ESQUEMA JSON OBRIGATÓRIO\nSeu retorno DEVE ser um objeto JSON que obedeça estritamente ao seguinte JSON Schema (incluindo descrições de campos):\n\`\`\`json\n${JSON.stringify(jsonSchema, null, 2)}\n\`\`\``;

  const userPrompt = spec.buildUser(input);
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: userPrompt },
  ];

  let raw: LlmResponse;
  try {
    raw = await provider.complete(route.model, {
      systemPreamble: preamble,
      systemRest: fullRest,
      cacheSystem: true,
      messages,
      maxTokens: route.maxTokens,
      temperature: route.temperature,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new PromptOutputError(`LLM call failed for prompt '${spec.id}': ${msg}`, spec.id, '');
  }

  let parsedJson: unknown;
  try {
    parsedJson = extractJson(raw.text);
  } catch (err: unknown) {
    if (err instanceof JsonExtractionError) {
      // Attempt 1 repair retry
      return await retryRepair(spec, input, provider, route, preamble, fullRest, messages, raw, err.message);
    }
    throw err;
  }

  const validation = spec.schema.safeParse(parsedJson);
  if (!validation.success) {
    // Attempt 1 repair retry with validation errors
    return await retryRepair(spec, input, provider, route, preamble, fullRest, messages, raw, JSON.stringify(validation.error.format()));
  }

  const costUsd = computeCost(raw, route);
  return {
    data: validation.data,
    raw,
    costUsd,
  };
}

async function retryRepair<I, O>(
  spec: PromptSpec<I, O>,
  input: I,
  provider: LlmProvider,
  route: ModelRoute,
  preamble: string,
  fullRest: string,
  originalMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  firstResponse: LlmResponse,
  errorDetails: string
): Promise<{ data: O; raw: LlmResponse; costUsd: number }> {
  // maxTokens is a cap, not a target: widening it costs nothing unless the model
  // uses it. The repair re-sends the whole failed output, so it always needs at
  // least as much headroom as the first attempt.
  const repairMaxTokens = Math.min(Math.ceil(route.maxTokens * 1.5), 16000);
  const outputTokens = firstResponse.usage?.outputTokens ?? 0;
  const truncated =
    firstResponse.stopReason === 'max_tokens' || outputTokens >= route.maxTokens * 0.95;
  const repairPrompt = truncated
    ? `Your previous output was CUT OFF at the token limit and is missing required trailing fields (validation error: ${errorDetails}). Return the COMPLETE object matching the requested schema, keeping each text field concise so it fits. No extra conversational text or markdown outside the JSON object.`
    : `Your previous output failed JSON extraction or Zod validation with the following error:\n${errorDetails}\n\nPlease correct your output and return ONLY a valid JSON object matching the requested schema. No extra conversational text or markdown outside the JSON object.`;

  const repairMessages = [
    ...originalMessages,
    { role: 'assistant' as const, content: firstResponse.text },
    { role: 'user' as const, content: repairPrompt },
  ];

  let raw: LlmResponse;
  try {
    raw = await provider.complete(route.model, {
      systemPreamble: preamble,
      systemRest: fullRest,
      cacheSystem: true,
      messages: repairMessages,
      maxTokens: repairMaxTokens,
      temperature: 0, // strict temperature for repair
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new PromptOutputError(`Repair LLM call failed for prompt '${spec.id}': ${msg}`, spec.id, firstResponse.text);
  }

  let parsedJson: unknown;
  try {
    parsedJson = extractJson(raw.text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new PromptOutputError(`Repair failed JSON extraction for prompt '${spec.id}': ${msg}`, spec.id, raw.text);
  }

  const validation = spec.schema.safeParse(parsedJson);
  if (!validation.success) {
    throw new PromptOutputError(
      `Repair failed Zod schema validation for prompt '${spec.id}': ${validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' | ')}`,
      spec.id,
      raw.text,
      validation.error.format()
    );
  }

  // Combine cost of first attempt + repair attempt (estimated or additive)
  const costUsd = computeCost(firstResponse, route) + computeCost(raw, route);

  return {
    data: validation.data,
    raw,
    costUsd,
  };
}

/**
 * Compute estimated cost in USD based on route pricing per million tokens.
 * Note: Cache reads are priced at 10% of standard input price (estimate).
 */
function computeCost(res: LlmResponse, route: ModelRoute): number {
  const inputUncached = Math.max(0, res.usage.inputTokens - res.usage.cacheReadTokens);
  const cacheRead = res.usage.cacheReadTokens;
  const output = res.usage.outputTokens;

  const costInputUncached = (inputUncached / 1_000_000) * route.priceInPerM;
  const costCacheRead = (cacheRead / 1_000_000) * (route.priceInPerM * 0.1);
  const costOutput = (output / 1_000_000) * route.priceOutPerM;

  return costInputUncached + costCacheRead + costOutput;
}
