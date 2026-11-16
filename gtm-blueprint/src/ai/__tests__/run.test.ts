// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { runPrompt } from '../run.js';
import type { LlmProvider, LlmResponse } from '../types.js';

const schema = z.object({ items: z.array(z.string()).min(1), done: z.boolean() });

function makeProvider(script: LlmResponse[]): { provider: LlmProvider; seenMaxTokens: number[] } {
  const seenMaxTokens: number[] = [];
  let n = 0;
  const provider: LlmProvider = {
    name: 'fake',
    async complete(_model: string, req: { maxTokens: number }) {
      seenMaxTokens.push(req.maxTokens);
      const res = script[Math.min(n, script.length - 1)];
      n += 1;
      return res;
    },
  };
  return { provider, seenMaxTokens };
}

function resp(text: string, outputTokens: number, stopReason?: string): LlmResponse {
  return {
    text,
    usage: { inputTokens: 10, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 },
    model: 'm',
    provider: 'fake',
    latencyMs: 1,
    stopReason,
  };
}

const spec = {
  id: 'test.truncation',
  version: '0.0.1',
  task: 'module' as const,
  system: 'sys',
  buildUser: () => 'hi',
  schema,
};

const registry = () => ({
  provider: 'fake',
  model: 'm',
  priceInPerM: 1,
  priceOutPerM: 5,
  maxTokens: 12000,
  temperature: 0,
});

describe('repair after truncation', () => {
  it('widens the cap when the first output hit max_tokens', async () => {
    const { provider, seenMaxTokens } = makeProvider([
      // Truncated mid-array: the extractor salvages {items:['a']}, which fails
      // schema validation on the missing trailing `done` -> repair path.
      resp('{"items": ["a",', 11400, 'max_tokens'),
      resp('{"items": ["a", "b"], "done": true}', 40, 'end_turn'),
    ]);
    const out = await runPrompt(spec, {}, { registry: registry as never, providers: { fake: provider } });
    expect(out.data).toEqual({ items: ['a', 'b'], done: true });
    expect(seenMaxTokens).toEqual([12000, 16000]);
  });

  it('widens the cap on every repair (cap is free headroom)', async () => {
    const { provider, seenMaxTokens } = makeProvider([
      resp('{"items": [], "done": "yes"}', 30, 'end_turn'),
      resp('{"items": ["a"], "done": true}', 20, 'end_turn'),
    ]);
    const out = await runPrompt(spec, {}, { registry: registry as never, providers: { fake: provider } });
    expect(out.data).toEqual({ items: ['a'], done: true });
    expect(seenMaxTokens).toEqual([12000, 16000]);
  });
  });