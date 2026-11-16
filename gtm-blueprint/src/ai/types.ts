export type Task = 'extract' | 'dossier' | 'module' | 'critic';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system?: string;
  systemPreamble?: string;
  systemRest?: string;
  cacheSystem?: boolean;
  messages: LlmMessage[];
  maxTokens: number;
  temperature?: number;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface LlmResponse {
  text: string;
  usage: LlmUsage;
  model: string;
  provider: string;
  latencyMs: number;
  stopReason?: string;
}

export interface LlmProvider {
  readonly name: string;
  complete(model: string, req: LlmRequest): Promise<LlmResponse>;
}

export interface ModelRoute {
  provider: string;
  model: string;
  priceInPerM: number;
  priceOutPerM: number;
  maxTokens: number;
  temperature: number;
}
