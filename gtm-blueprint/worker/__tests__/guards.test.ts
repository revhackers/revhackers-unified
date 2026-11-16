import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assertPublicHttpUrl, hashIp, parseLimit, TURNSTILE_VERIFY_URL, UrlInvalidaError, verifyTurnstile, withinDailyLimits } from '../guards.js';

describe('assertPublicHttpUrl', () => {
  it.each(['https://revhackers.com.br', 'http://growthmachine.com.br/sobre', 'https://www.acme.com.br/planos?x=1'])('aceita host público: %s', (url) => {
    expect(() => assertPublicHttpUrl(url)).not.toThrow();
  });

  it('devolve o href normalizado', () => {
    expect(assertPublicHttpUrl('https://Acme.com.br')).toBe('https://acme.com.br/');
  });

  it.each([
    'ftp://acme.com.br',
    'javascript:alert(1)',
    'http://localhost:8080',
    'http://intranet/',
    'http://127.0.0.1',
    'http://10.0.0.5/admin',
    'http://0x7f000001',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/',
    'http://servico.internal',
    'http://app.local',
    'http://painel.localhost',
    'nao e url',
    '',
  ])('rejeita %s', (url) => {
    expect(() => assertPublicHttpUrl(url)).toThrow(UrlInvalidaError);
  });
});

describe('hashIp', () => {
  it('é SHA-256 hex de salt + ip', async () => {
    const expected = createHash('sha256').update('sal-teste203.0.113.10').digest('hex');
    expect(await hashIp('203.0.113.10', 'sal-teste')).toBe(expected);
  });

  it('é estável para o mesmo par e muda com o IP ou o salt', async () => {
    const base = await hashIp('203.0.113.10', 'sal');
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashIp('203.0.113.10', 'sal')).toBe(base);
    expect(await hashIp('203.0.113.11', 'sal')).not.toBe(base);
    expect(await hashIp('203.0.113.10', 'outro')).not.toBe(base);
  });

  it('não expõe o IP bruto', async () => {
    expect(await hashIp('203.0.113.10', 'sal')).not.toContain('203.0.113');
  });
});

describe('withinDailyLimits', () => {
  const limits = { total: 40, porIp: 3 };

  it('permite enquanto está abaixo dos dois limites', () => {
    expect(withinDailyLimits({ total: 2, porIp: 2 }, limits)).toBe(true);
  });

  it('bloqueia o quarto diagnóstico do mesmo IP', () => {
    expect(withinDailyLimits({ total: 3, porIp: 3 }, limits)).toBe(false);
  });

  it('bloqueia quando o total do dia chega ao limite, mesmo para IP novo', () => {
    expect(withinDailyLimits({ total: 40, porIp: 0 }, limits)).toBe(false);
  });
});

describe('parseLimit', () => {
  it('lê inteiro não negativo', () => {
    expect(parseLimit('40')).toBe(40);
    expect(parseLimit('0')).toBe(0);
  });

  it('valor ausente, vazio, negativo ou não inteiro vira 0 (fail-closed)', () => {
    expect(parseLimit(undefined)).toBe(0);
    expect(parseLimit('')).toBe(0);
    expect(parseLimit('abc')).toBe(0);
    expect(parseLimit('-1')).toBe(0);
    expect(parseLimit('2.5')).toBe(0);
  });
});

describe('verifyTurnstile', () => {
  it('aceita success true e envia secret, token e remoteip no siteverify', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const fetchStub = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), body: init?.body });
      return new Response(JSON.stringify({ success: true }));
    }) as typeof fetch;

    const ok = await verifyTurnstile({ token: 't-1', secret: 's-1', remoteIp: '203.0.113.10', fetch: fetchStub });

    expect(ok).toBe(true);
    expect(calls[0].url).toBe(TURNSTILE_VERIFY_URL);
    const form = calls[0].body;
    if (!(form instanceof FormData)) throw new Error('corpo do siteverify deveria ser FormData');
    expect(form.get('secret')).toBe('s-1');
    expect(form.get('response')).toBe('t-1');
    expect(form.get('remoteip')).toBe('203.0.113.10');
  });

  it('omite remoteip quando o IP é desconhecido', async () => {
    let body: unknown;
    const fetchStub = (async (_input: string | URL | Request, init?: RequestInit) => {
      body = init?.body;
      return new Response(JSON.stringify({ success: true }));
    }) as typeof fetch;

    await verifyTurnstile({ token: 't', secret: 's', remoteIp: null, fetch: fetchStub });

    if (!(body instanceof FormData)) throw new Error('corpo do siteverify deveria ser FormData');
    expect(body.has('remoteip')).toBe(false);
  });

  it('success false, HTTP de erro ou falha de rede devolvem false', async () => {
    const reprovado = (async () => new Response(JSON.stringify({ success: false }))) as typeof fetch;
    const erroHttp = (async () => new Response('x', { status: 500 })) as typeof fetch;
    const redeCaiu = (async () => {
      throw new Error('network');
    }) as typeof fetch;

    expect(await verifyTurnstile({ token: 't', secret: 's', remoteIp: null, fetch: reprovado })).toBe(false);
    expect(await verifyTurnstile({ token: 't', secret: 's', remoteIp: null, fetch: erroHttp })).toBe(false);
    expect(await verifyTurnstile({ token: 't', secret: 's', remoteIp: null, fetch: redeCaiu })).toBe(false);
  });
});
