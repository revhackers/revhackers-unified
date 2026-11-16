import { AwsClient } from 'aws4fetch';
import type { LlmProvider, LlmRequest, LlmResponse } from '../types.js';
import type { AwsCredentials } from '../credentials.js';

export interface BedrockProviderOptions {
  region: string;
  credentials: () => Promise<AwsCredentials>;
}

export class BedrockError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly modelId: string,
    public readonly errorType?: string
  ) {
    super(message);
    this.name = 'BedrockError';
  }
}

export function createBedrockProvider(options: BedrockProviderOptions): LlmProvider {
  const region = options.region;

  return {
    name: 'bedrock',
    async complete(model: string, req: LlmRequest): Promise<LlmResponse> {
      const startTime = Date.now();
      const creds = await options.credentials();

      const aws = new AwsClient({
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
        service: 'bedrock',
        region,
      });

      // aws4fetch signs the path as given; single URI-encoding of the modelId is what Bedrock expects.
      const encodedModel = encodeURIComponent(model);
      const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodedModel}/converse`;

      const systemBlock: Array<{ text?: string; cachePoint?: { type: 'default' } }> = [];
      if (req.systemPreamble) {
        systemBlock.push({ text: req.systemPreamble });
        if (req.cacheSystem) {
          systemBlock.push({ cachePoint: { type: 'default' } });
        }
        if (req.systemRest) {
          systemBlock.push({ text: req.systemRest });
        }
      } else if (req.system) {
        systemBlock.push({ text: req.system });
        if (req.cacheSystem) {
          systemBlock.push({ cachePoint: { type: 'default' } });
        }
      }

      const body = {
        system: systemBlock,
        messages: req.messages.map((m) => ({
          role: m.role,
          content: [{ text: m.content }],
        })),
        inferenceConfig: {
          maxTokens: req.maxTokens,
          ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        },
      };

      const maxRetries = 3;
      let attempt = 0;
      let response: Response | null = null;
      let responseData: unknown;

      while (attempt < maxRetries) {
        attempt++;
        try {
          response = await aws.fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (response.ok) {
            responseData = await response.json();
            break;
          }

          const status = response.status;
          const errorText = await response.text();
          let errorType = '';
          try {
            const errJson = JSON.parse(errorText) as unknown;
            if (errJson && typeof errJson === 'object' && errJson !== null && '__type' in errJson) {
              errorType = String((errJson as Record<string, unknown>).__type);
            } else if (errJson && typeof errJson === 'object' && errJson !== null && 'message' in errJson) {
              errorType = String((errJson as Record<string, unknown>).message);
            }
          } catch {
            errorType = errorText;
          }

          const isThrottling = status === 429 || errorType.includes('Throttling') || errorType.includes('TooManyRequests');
          const isServerErr = status >= 500 && status < 600;

          if ((isThrottling || isServerErr) && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          if (status === 403 || errorType.includes('AccessDenied')) {
            throw new BedrockError(
              `Bedrock Access Denied for model '${model}' (Region: ${region}): ${errorType}`,
              status,
              model,
              'AccessDenied'
            );
          }

          if (status === 400 || errorType.includes('ValidationException')) {
            throw new BedrockError(
              `Bedrock Validation Exception for model '${model}': ${errorType}`,
              status,
              model,
              'ValidationException'
            );
          }

          throw new BedrockError(
            `Bedrock request failed for model '${model}' with status ${status}: ${errorType}`,
            status,
            model,
            errorType
          );
        } catch (err: unknown) {
          if (err instanceof BedrockError) {
            throw err;
          }
          if (attempt >= maxRetries) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new BedrockError(
              `Bedrock request network/runtime failure for model '${model}': ${msg}`,
              500,
              model,
              'NetworkError'
            );
          }
          const delay = Math.pow(2, attempt) * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (!responseData || typeof responseData !== 'object') {
        throw new BedrockError(`Invalid empty or non-object response from Bedrock for model '${model}'`, 500, model, 'InvalidResponse');
      }

      const data = responseData as {
        output?: {
          message?: {
            content?: Array<{ text?: string }>;
          };
        };
        usage?: {
          inputTokens?: number;
          outputTokens?: number;
          cacheReadInputTokens?: number;
          cacheWriteInputTokens?: number;
        };
        stopReason?: string;
      };

      const text = data.output?.message?.content?.map((c) => c.text || '').join('') || '';
      const usage = data.usage || {};
      const latencyMs = Date.now() - startTime;

      return {
        text,
        usage: {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          cacheReadTokens: usage.cacheReadInputTokens ?? 0,
          cacheWriteTokens: usage.cacheWriteInputTokens ?? 0,
        },
        model,
        provider: 'bedrock',
        latencyMs,
        stopReason: data.stopReason,
      };
    },
  };
}
