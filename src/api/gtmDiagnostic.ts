import type { LeadReport } from '../../gtm-blueprint/src/report/types';

export const GTM_DECLARED_PHASES = [
  'Estruturação Inicial',
  'Primeira Tração Validada',
  'Escala Estruturada',
  'Otimização e Eficiência',
] as const;

export type GtmDeclaredPhase = (typeof GTM_DECLARED_PHASES)[number];

export type GtmDiagnosticStatus = 'coletando' | 'aguardando_contato' | 'gerando' | 'pronto' | 'falhou';

export interface CreateGtmDiagnosticBody {
  companyName: string;
  websiteUrl: string;
  declaredPhase: GtmDeclaredPhase;
  declaredIcp?: string;
  competitors: string[];
  cnpj?: string;
  crm?: {
    arpuMonthly?: number;
    cacEstimated?: number;
    churnMonthlyPercent?: number;
    salesCycleDays?: number;
  };
  turnstileToken: string;
}

export interface GtmDiagnosticView {
  id: string;
  status: GtmDiagnosticStatus;
  errorCode: string | null;
  report: LeadReport;
}

/** Erro HTTP do Worker; `message` é o código `error` do corpo (ex.: `url_invalida`). */
export class GtmApiError extends Error {
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = 'GtmApiError';
    this.status = status;
  }
}

const API_BASE = import.meta.env.VITE_GTM_API_BASE ?? '';

function errorCodeOf(body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return 'erro_desconhecido';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}/api/gtm/diagnostics${path}`, {
    cache: 'no-store',
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new GtmApiError(errorCodeOf(body), response.status);
  }
  return body as T;
}

export function createGtmDiagnostic(body: CreateGtmDiagnosticBody): Promise<{ id: string }> {
  return request('', { method: 'POST', body: JSON.stringify(body) });
}

export function unlockGtmDiagnostic(id: string): Promise<{ ok: true }> {
  return request(`/${encodeURIComponent(id)}/unlock`, { method: 'POST' });
}

export function getGtmDiagnostic(id: string): Promise<GtmDiagnosticView> {
  return request(`/${encodeURIComponent(id)}`);
}
