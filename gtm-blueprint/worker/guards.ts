// Guardas puras do Worker: URL pública, hash de IP, limites diários e verificação Turnstile. Sem binding do Cloudflare.

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const UNKNOWN_IP = 'desconhecido';

export class UrlInvalidaError extends Error {
  constructor() {
    super('url_invalida');
    this.name = 'UrlInvalidaError';
  }
}

const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/;
const INTERNAL_SUFFIXES = ['.local', '.internal', '.localhost'];

/**
 * Aceita só http(s) em host público com nome de domínio. Rejeita IP literal (IPv4 ou IPv6), localhost e nomes
 * internos. O Worker busca essas URLs, então a checagem é contra SSRF. Devolve o href normalizado.
 */
export function assertPublicHttpUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UrlInvalidaError();
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new UrlInvalidaError();

  const host = url.hostname.toLowerCase();
  if (!host.includes('.')) throw new UrlInvalidaError();
  if (host === 'localhost' || INTERNAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) throw new UrlInvalidaError();
  if (host.startsWith('[') || IPV4_LITERAL.test(host)) throw new UrlInvalidaError();

  return url.href;
}

/** SHA-256 hex de `salt + ip`. Estável para o mesmo par; o IP bruto nunca vai para o D1. */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}${ip}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface DailyCounts {
  total: number;
  porIp: number;
}

export interface DailyLimits {
  total: number;
  porIp: number;
}

/** Permite enquanto a contagem das últimas 24 h está abaixo de cada limite. */
export function withinDailyLimits(counts: DailyCounts, limits: DailyLimits): boolean {
  return counts.porIp < limits.porIp && counts.total < limits.total;
}

/** Limite vindo de `vars`. Valor ausente ou inválido vira 0: fail-closed, nada passa sem configuração. */
export function parseLimit(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export interface TurnstileCheck {
  token: string;
  secret: string;
  remoteIp: string | null;
  fetch?: typeof fetch;
}

/** Valida o token no siteverify. Qualquer falha de rede ou resposta inesperada devolve false. */
export async function verifyTurnstile(check: TurnstileCheck): Promise<boolean> {
  const body = new FormData();
  body.set('secret', check.secret);
  body.set('response', check.token);
  if (check.remoteIp) body.set('remoteip', check.remoteIp);

  const doFetch = check.fetch ?? fetch;
  try {
    const res = await doFetch(TURNSTILE_VERIFY_URL, { method: 'POST', body });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: unknown };
    return data.success === true;
  } catch {
    return false;
  }
}
