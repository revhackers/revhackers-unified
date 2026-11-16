import type { Task, ModelRoute } from './types.js';

/**
 * Default model routes for GTM Blueprint tasks.
 * 
 * NOTE: To switch a provider, add a new adapter in `providers/` implementing LlmProvider,
 * register it in `providers/index.ts`, and set the route string (e.g. "openai:gpt-4o" or "bedrock:modelId").
 */
const DEFAULT_ROUTES: Record<Task, ModelRoute> = {
  extract: {
    provider: 'bedrock',
    model: 'amazon.nova-lite-v1:0',
    priceInPerM: 0.06,
    priceOutPerM: 0.24,
    maxTokens: 5000,
    temperature: 0,
  },
  module: {
    provider: 'bedrock',
    model: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    priceInPerM: 1.0,
    priceOutPerM: 5.0,
    maxTokens: 12000,
    temperature: 0.2,
  },
  dossier: {
    provider: 'bedrock',
    model: 'us.anthropic.claude-sonnet-4-6',
    priceInPerM: 3.0,
    priceOutPerM: 15.0,
    maxTokens: 16000,
    temperature: 0.2,
  },
  critic: {
    provider: 'bedrock',
    model: 'us.anthropic.claude-sonnet-4-6',
    priceInPerM: 3.0,
    priceOutPerM: 15.0,
    maxTokens: 10000,
    temperature: 0,
  },
};

export function getRoute(task: Task, env: Record<string, string | undefined> = process.env): ModelRoute {
  const defaultRoute = DEFAULT_ROUTES[task];
  const envKey = `GTMB_MODEL_${task.toUpperCase()}`;
  const override = env[envKey];

  if (!override) {
    return defaultRoute;
  }

  const [provider, ...modelParts] = override.split(':');
  const model = modelParts.join(':');
  if (!provider || !model) {
    return defaultRoute;
  }

  return {
    ...defaultRoute,
    provider,
    model,
  };
}
