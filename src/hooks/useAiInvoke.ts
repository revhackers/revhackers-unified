/**
 * useAiInvoke - Hook para chamar handlers AI no backend configurado.
 *
 * Sem backend (VITE_GCP_ENABLED diferente de 'true'), devolve erro e os
 * consumers usam a análise local.
 */

import { useCallback } from 'react';
import { aiGcpAdapter, type InvokeOptions, type InvokeResult } from '@/api/adapters/ai-gcp';

interface UseAiInvokeOptions {
  /** Timeout em ms (default 30s). */
  timeoutMs?: number;
}

const GCP_ENABLED = import.meta.env.VITE_GCP_ENABLED === 'true';
const IS_DEV = import.meta.env.DEV;

/** Implementacao compartilhada entre hook e helper. */
async function invokeInternal<T = unknown>(
  handlerName: string,
  body: Record<string, unknown>,
  options: UseAiInvokeOptions = {},
): Promise<InvokeResult<T>> {
  const timeoutMs = options.timeoutMs ?? 30_000;

  if (!GCP_ENABLED) {
    return { data: null, error: new Error('IA indisponível: backend não configurado.') };
  }

  const result = await aiGcpAdapter.invoke<T>(handlerName, body, { timeoutMs });
  if (IS_DEV && !result.error) {
    console.info(`[useAiInvoke] GCP ${handlerName} OK`);
  }
  return result;
}

export function useAiInvoke() {
  const invoke = useCallback(invokeInternal, []);
  return { invoke };
}

/** Helper one-shot para uso fora de componentes React. */
export async function invokeAi<T = unknown>(
  handlerName: string,
  body: Record<string, unknown>,
  options: UseAiInvokeOptions = {},
): Promise<InvokeResult<T>> {
  return invokeInternal<T>(handlerName, body, options);
}
