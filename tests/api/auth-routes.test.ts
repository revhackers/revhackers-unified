import { createHash } from 'node:crypto';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { QueryablePool } from '../../api/src/db/postgres';
import { createAuthRoutes } from '../../api/src/http/auth-routes';

const MASTER_EMAIL = 'giulliano@revhackers.com.br';

function pool(): QueryablePool {
  return { query: async () => ({ rows: [] }) } as unknown as QueryablePool;
}

function loginBody(email: string, password: string): Request {
  return new Request('https://api.test/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

const sha256hex = (s: string): string => createHash('sha256').update(s).digest('hex');

afterEach(() => {
  delete process.env.MASTER_PASSWORD_HASH;
  vi.restoreAllMocks();
});

describe('POST /v1/auth/login master fail-closed', () => {
  test('sem MASTER_PASSWORD_HASH, qualquer senha recebe 401 (sem hash default)', async () => {
    delete process.env.MASTER_PASSWORD_HASH;
    const route = createAuthRoutes({ pool: pool() });
    const response = await route(loginBody(MASTER_EMAIL, 'qualquer-senha'));
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: 'E-mail ou senha inválidos.' });
  });

  test('com MASTER_PASSWORD_HASH, senha correta recebe 200 sem vazar o hash', async () => {
    process.env.MASTER_PASSWORD_HASH = sha256hex('senha-mestra-teste-123');
    const route = createAuthRoutes({ pool: pool() });
    const response = await route(loginBody(MASTER_EMAIL, 'senha-mestra-teste-123'));
    expect(response?.status).toBe(200);
    const body = (await response?.json()) as { user: { role: string }; token: string };
    expect(body.user.role).toBe('super_admin');
    expect(body.token).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(body)).not.toContain(process.env.MASTER_PASSWORD_HASH);
  });

  test('com MASTER_PASSWORD_HASH, senha errada recebe 401 com corpo identico ao fail-closed', async () => {
    process.env.MASTER_PASSWORD_HASH = sha256hex('senha-mestra-teste-123');
    const route = createAuthRoutes({ pool: pool() });
    const response = await route(loginBody(MASTER_EMAIL, 'senha-errada'));
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: 'E-mail ou senha inválidos.' });
  });
});

describe('POST /v1/auth/reset-password redirect allowlist', () => {
  async function capturedResetUrl(redirectTo: unknown): Promise<string> {
    const warned: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warned.push(args.map(String).join(' '));
    });
    const route = createAuthRoutes({ pool: pool() });
    const response = await route(
      new Request('https://api.test/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: MASTER_EMAIL, redirectTo }),
      })
    );
    expect(response?.status).toBe(200);
    const line = warned.find((w) => w.includes('Reset URL:'));
    expect(line).toBeDefined();
    return line!.split('Reset URL:')[1]!.trim();
  }

  test('redirectTo externo cai no default oficial', async () => {
    const url = await capturedResetUrl('https://evil.example/phish');
    expect(url.startsWith('https://revhackers.com.br/reset-password?')).toBe(true);
    expect(url).not.toContain('evil.example');
  });

  test('redirectTo javascript: cai no default oficial', async () => {
    const url = await capturedResetUrl('javascript:alert(1)');
    expect(url.startsWith('https://revhackers.com.br/reset-password?')).toBe(true);
  });

  test('redirectTo https no host oficial com path proprio e preservado sem query', async () => {
    const url = await capturedResetUrl('https://revhackers.com.br/cliente/reset?x=1#frag');
    expect(url.startsWith('https://revhackers.com.br/cliente/reset?')).toBe(true);
    expect(url).not.toContain('x=1');
    expect(url).not.toContain('frag');
  });
});
