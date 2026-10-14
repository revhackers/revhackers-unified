import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import crypto from 'node:crypto';
import type { Pool } from 'pg';
import {
  handleProcessLifecycle,
  handleCalendarWebhook,
  handleGHLWebhook,
  handleListHooks,
  handleCreateHook,
  handleContactJourney,
} from '../../api/src/http/lifecycle-routes';
import type { AuthContext, AuthMiddleware } from '../../api/src/http/auth-middleware';

const mockEnv: Record<string, string> = {
  OPENAI_API_KEY: 'sk-test',
  GEMINI_API_KEY: 'AIza-test',
  DATABASE_URL: 'postgresql://test',
  GHL_WEBHOOK_SECRET: 'test-secret',
};

const CONTACT_ID = '12345678-1234-1234-1234-123456789012';

// Usuário sintético: os testes exercem só o tenantId, então um objeto mínimo basta.
const stubUser = {
  id: 'user-1',
  globalRole: null,
  status: 'active',
  memberships: [],
} as unknown as AuthContext['user'];

function stubAuth(tenantId = 'TENANT-A'): AuthMiddleware {
  return {
    authenticate: async (): Promise<AuthContext | Response> => ({ user: stubUser, tenantId }),
  } as unknown as AuthMiddleware;
}

function rejectingAuth(status = 401): AuthMiddleware {
  return {
    authenticate: async (): Promise<AuthContext | Response> =>
      new Response(
        JSON.stringify({ error: { code: 'unauthenticated', message: 'Token de autenticação ausente.' } }),
        { status, headers: { 'Content-Type': 'application/json' } },
      ),
  } as unknown as AuthMiddleware;
}

describe('Lifecycle Routes', () => {
  let pool: Pool;
  let queryMock: Mock;
  const request = (url: string, init?: RequestInit) => new Request(`https://api.test${url}`, init);

  beforeEach(() => {
    queryMock = vi.fn();
    // Test double no lugar de pg.Pool: os handlers usam só pool.query.
    pool = { query: queryMock } as unknown as Pool;
  });

  // ============================================
  // POST /v1/lifecycle/process
  // ============================================
  describe('POST /v1/lifecycle/process', () => {
    const env = { ...mockEnv, LIFECYCLE_TRIGGER_SECRET: 'trig-test' };
    const authed = { headers: { authorization: 'Bearer trig-test' } };

    it('processes a lifecycle event successfully', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] }); // logHookExecution

      const res = await handleProcessLifecycle(
        request('/v1/lifecycle/process', {
          method: 'POST',
          ...authed,
          body: JSON.stringify({
            contact_id: 'c-123',
            tenant_id: 't-1',
            from_stage: 'mql',
            to_stage: 'sql',
          }),
        }),
        env,
        pool,
      );

      expect(res?.status).toBe(200);
      await expect(res?.json()).resolves.toMatchObject({ success: true });
    });

    it('returns 400 for invalid JSON body', async () => {
      const res = await handleProcessLifecycle(
        request('/v1/lifecycle/process', {
          method: 'POST',
          ...authed,
          body: 'invalid json{',
        }),
        env,
        pool,
      );

      expect(res?.status).toBe(400);
    });

    it('returns 401 without Bearer trigger secret', async () => {
      const res = await handleProcessLifecycle(
        request('/v1/lifecycle/process', {
          method: 'POST',
          body: JSON.stringify({ contact_id: 'c-123', tenant_id: 't-1', to_stage: 'sql' }),
        }),
        env,
        pool,
      );

      expect(res?.status).toBe(401);
      await expect(res?.json()).resolves.toEqual({ success: false, error: 'unauthorized' });
    });

    it('returns 500 when LIFECYCLE_TRIGGER_SECRET is not configured', async () => {
      const res = await handleProcessLifecycle(
        request('/v1/lifecycle/process', {
          method: 'POST',
          headers: { authorization: 'Bearer qualquer' },
          body: JSON.stringify({ contact_id: 'c-123', tenant_id: 't-1', to_stage: 'sql' }),
        }),
        mockEnv,
        pool,
      );

      expect(res?.status).toBe(500);
      await expect(res?.json()).resolves.toEqual({ success: false, error: 'trigger_secret_not_configured' });
    });

    it('returns null for non-POST methods (not its route)', async () => {
      const res = await handleProcessLifecycle(
        request('/v1/lifecycle/process', { method: 'GET' }),
        mockEnv,
        pool,
      );

      expect(res).toBeNull();
    });
  });

  // ============================================
  // POST /v1/lifecycle/webhook/calendar
  // ============================================
  describe('POST /v1/lifecycle/webhook/calendar', () => {
    const env = { ...mockEnv, CALENDAR_WEBHOOK_SECRET: 'cal-test' };

    it('rejects payload with missing required fields', async () => {
      const res = await handleCalendarWebhook(
        request('/v1/lifecycle/webhook/calendar', {
          method: 'POST',
          headers: { 'x-goog-channel-token': 'cal-test' },
          body: JSON.stringify({ event_id: 'evt-1' }), // missing start_time, end_time
        }),
        env,
        pool,
      );

      expect(res?.status).toBe(400);
    });

    it('returns 401 when channel token is wrong', async () => {
      const res = await handleCalendarWebhook(
        request('/v1/lifecycle/webhook/calendar', {
          method: 'POST',
          headers: { 'x-goog-channel-token': 'token-errado' },
          body: JSON.stringify({ event_id: 'evt-1', start_time: 'x', end_time: 'y' }),
        }),
        env,
        pool,
      );

      expect(res?.status).toBe(401);
      await expect(res?.json()).resolves.toEqual({ success: false, error: 'unauthorized' });
    });

    it('returns 500 when CALENDAR_WEBHOOK_SECRET is not configured', async () => {
      const res = await handleCalendarWebhook(
        request('/v1/lifecycle/webhook/calendar', {
          method: 'POST',
          headers: { 'x-goog-channel-token': 'qualquer' },
          body: JSON.stringify({ event_id: 'evt-1', start_time: 'x', end_time: 'y' }),
        }),
        mockEnv,
        pool,
      );

      expect(res?.status).toBe(500);
      await expect(res?.json()).resolves.toEqual({ success: false, error: 'calendar_secret_not_configured' });
    });

    it('returns null for non-POST methods (not its route)', async () => {
      const res = await handleCalendarWebhook(
        request('/v1/lifecycle/webhook/calendar', { method: 'GET' }),
        mockEnv,
        pool,
      );

      expect(res).toBeNull();
    });
  });

  // ============================================
  // POST /v1/lifecycle/webhook/ghl
  // ============================================
  describe('POST /v1/lifecycle/webhook/ghl', () => {
    const GHL_SECRET = 'test-secret';
    function signGhlPayload(payload: string): string {
      return crypto.createHmac('sha256', GHL_SECRET).update(payload).digest('hex');
    }

    it('processes a GHL webhook with valid HMAC signature', async () => {
      const payload = JSON.stringify({ event_type: 'contact_updated', contact_id: 'c-1' });
      const signature = signGhlPayload(payload);
      const res = await handleGHLWebhook(
        request('/v1/lifecycle/webhook/ghl', {
          method: 'POST',
          body: payload,
          headers: { 'x-ghl-signature': signature },
        }),
        mockEnv,
        pool,
      );

      expect(res?.status).toBe(200);
    });

    it('returns 401 when signature header is missing', async () => {
      const res = await handleGHLWebhook(
        request('/v1/lifecycle/webhook/ghl', {
          method: 'POST',
          body: JSON.stringify({ event_type: 'contact_updated', contact_id: 'c-1' }),
        }),
        mockEnv,
        pool,
      );

      expect(res?.status).toBe(401);
    });

    it('returns 401 when signature is invalid', async () => {
      const res = await handleGHLWebhook(
        request('/v1/lifecycle/webhook/ghl', {
          method: 'POST',
          body: JSON.stringify({ event_type: 'contact_updated', contact_id: 'c-1' }),
          headers: { 'x-ghl-signature': 'deadbeef'.repeat(8) }, // 64 hex chars válidos mas signature errada
        }),
        mockEnv,
        pool,
      );

      expect(res?.status).toBe(401);
    });

    it('returns 500 when GHL_WEBHOOK_SECRET is not configured', async () => {
      const { GHL_WEBHOOK_SECRET: _dropped, ...envNoSecret } = mockEnv;
      void _dropped;
      const res = await handleGHLWebhook(
        request('/v1/lifecycle/webhook/ghl', {
          method: 'POST',
          body: JSON.stringify({ event_type: 'contact_updated', contact_id: 'c-1' }),
          headers: { 'x-ghl-signature': 'deadbeef'.repeat(8) },
        }),
        envNoSecret,
        pool,
      );

      expect(res?.status).toBe(500);
    });

    it('returns null for non-POST methods (not its route)', async () => {
      const res = await handleGHLWebhook(
        request('/v1/lifecycle/webhook/ghl', { method: 'DELETE' }),
        mockEnv,
        pool,
      );

      expect(res).toBeNull();
    });
  });

  // ============================================
  // GET /v1/lifecycle/hooks
  // ============================================
  describe('GET /v1/lifecycle/hooks', () => {
    it('lists hooks scoped to the authenticated tenant', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      const res = await handleListHooks(
        request('/v1/lifecycle/hooks', { method: 'GET' }),
        mockEnv,
        pool,
        { auth: stubAuth('TENANT-A') },
      );

      expect(res?.status).toBe(200);
      expect(queryMock.mock.calls[0]?.[1]).toEqual(['TENANT-A']);
    });

    it('returns 403 for another tenant', async () => {
      const res = await handleListHooks(
        request('/v1/lifecycle/hooks?tenant_id=TENANT-B', { method: 'GET' }),
        mockEnv,
        pool,
        { auth: stubAuth('TENANT-A') },
      );

      expect(res?.status).toBe(403);
      await expect(res?.json()).resolves.toEqual({ success: false, error: 'forbidden' });
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('returns 401 without a valid token', async () => {
      const res = await handleListHooks(
        request('/v1/lifecycle/hooks', { method: 'GET' }),
        mockEnv,
        pool,
        { auth: rejectingAuth() },
      );

      expect(res?.status).toBe(401);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('returns null for non-GET methods (not its route)', async () => {
      const res = await handleListHooks(
        request('/v1/lifecycle/hooks', { method: 'POST' }),
        mockEnv,
        pool,
        { auth: stubAuth() },
      );

      expect(res).toBeNull();
    });
  });

  // ============================================
  // POST /v1/lifecycle/hooks
  // ============================================
  describe('POST /v1/lifecycle/hooks', () => {
    const validBody = JSON.stringify({ action_type: 'send_email', action_config: {} });

    it('creates a hook scoped to the authenticated tenant', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ id: 'h-1' }] });

      const res = await handleCreateHook(
        request('/v1/lifecycle/hooks?tenant_id=TENANT-A', { method: 'POST', body: validBody }),
        mockEnv,
        pool,
        { auth: stubAuth('TENANT-A') },
      );

      expect(res?.status).toBe(201);
      const params = queryMock.mock.calls[0]?.[1];
      expect(Array.isArray(params) && params[0]).toBe('TENANT-A');
    });

    it('returns 403 for another tenant', async () => {
      const res = await handleCreateHook(
        request('/v1/lifecycle/hooks?tenant_id=TENANT-B', { method: 'POST', body: validBody }),
        mockEnv,
        pool,
        { auth: stubAuth('TENANT-A') },
      );

      expect(res?.status).toBe(403);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('returns 401 without a valid token', async () => {
      const res = await handleCreateHook(
        request('/v1/lifecycle/hooks?tenant_id=TENANT-A', { method: 'POST', body: validBody }),
        mockEnv,
        pool,
        { auth: rejectingAuth() },
      );

      expect(res?.status).toBe(401);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('returns null for non-POST methods (not its route)', async () => {
      const res = await handleCreateHook(
        request('/v1/lifecycle/hooks?tenant_id=t-1', { method: 'GET' }),
        mockEnv,
        pool,
        { auth: stubAuth() },
      );

      expect(res).toBeNull();
    });
  });

  // ============================================
  // GET /v1/lifecycle/contacts/:id/journey
  // ============================================
  describe('GET /v1/lifecycle/contacts/:id/journey', () => {
    it('fetches the journey scoped to the authenticated tenant', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      const res = await handleContactJourney(
        request(`/v1/lifecycle/contacts/${CONTACT_ID}/journey`, { method: 'GET' }),
        mockEnv,
        pool,
        { auth: stubAuth('TENANT-A') },
      );

      expect(res?.status).toBe(200);
      const firstArg = queryMock.mock.calls[0]?.[0];
      expect(typeof firstArg === 'string' && firstArg.includes('tenant_id')).toBe(true);
      expect(queryMock.mock.calls[0]?.[1]).toEqual([CONTACT_ID, 'TENANT-A']);
    });

    it('returns 401 without a valid token', async () => {
      const res = await handleContactJourney(
        request(`/v1/lifecycle/contacts/${CONTACT_ID}/journey`, { method: 'GET' }),
        mockEnv,
        pool,
        { auth: rejectingAuth() },
      );

      expect(res?.status).toBe(401);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('returns null for invalid contact_id format (not its route)', async () => {
      const res = await handleContactJourney(
        request('/v1/lifecycle/contacts/invalid-id/journey', { method: 'GET' }),
        mockEnv,
        pool,
        { auth: stubAuth() },
      );

      expect(res).toBeNull();
    });

    it('returns null for non-GET methods (not its route)', async () => {
      const res = await handleContactJourney(
        request(`/v1/lifecycle/contacts/${CONTACT_ID}/journey`, { method: 'POST' }),
        mockEnv,
        pool,
        { auth: stubAuth() },
      );

      expect(res).toBeNull();
    });
  });
});
