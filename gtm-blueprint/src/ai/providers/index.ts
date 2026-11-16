import { createBedrockProvider, BedrockProviderOptions } from './bedrock.js';
import type { LlmProvider } from '../types.js';

export function createProviders(options: BedrockProviderOptions): Record<string, LlmProvider> {
  const bedrock = createBedrockProvider(options);
  return {
    bedrock,
  };
}
