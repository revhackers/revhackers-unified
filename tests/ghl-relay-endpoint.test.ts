import { afterEach, describe, expect, test, vi } from 'vitest';
import { sendToGHL } from '@/lib/ghlRelay';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('sendToGHL fail-closed por env', () => {
  test('sem VITE_GHL_RELAY_URL: retorna false e nao faz fetch', async () => {
    vi.stubEnv('VITE_GHL_RELAY_URL', '');
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await sendToGHL('contact_form', { email: 'a@b.co', name: 'A' });

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('com VITE_GHL_RELAY_URL: POSTA exatamente nesse endpoint', async () => {
    vi.stubEnv('VITE_GHL_RELAY_URL', '/api/ghl.php');
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await sendToGHL('contact_form', { email: 'a@b.co', name: 'A' });

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/ghl.php');
  });

  test('nunca aponta para producao quando env ausente, mesmo fora de revhackers.com.br', async () => {
    vi.stubEnv('VITE_GHL_RELAY_URL', '');
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await sendToGHL('lead_capture', { email: 'x@y.co' });

    const urls = fetchSpy.mock.calls.map((c) => String(c[0] ?? ''));
    expect(urls.some((u) => u.includes('revhackers.com.br'))).toBe(false);
  });
});
