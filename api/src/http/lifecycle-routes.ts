// @ts-nocheck
/**
 * lifecycle-routes.ts
 *
 * HTTP routes that orchestrate the 7 migrated services (T9.1-T9.7).
 * Replaces all Supabase Edge Function endpoints related to lifecycle pipeline.
 * 
 * ENDPOINTS:
 * - POST /v1/lifecycle/process           (process lifecycle event - trigger hooks)
 * - POST /v1/lifecycle/webhook/calendar  (receive Google Calendar webhook)
 * - POST /v1/lifecycle/webhook/ghl       (receive GHL webhook)
 * - GET  /v1/lifecycle/hooks              (list active hooks for tenant)
 * - POST /v1/lifecycle/hooks              (create new hook config)
 * - GET  /v1/lifecycle/contacts/:id/journey (get contact journey history)
 */

import { Pool } from 'pg';
import crypto from 'node:crypto';
import { z } from 'zod';
import { processLifecycleEvent, pollLifecycleHistory } from '../services/lifecycle-hook';
import { handleMediaOrchestrator, orchestrateMedia } from '../services/media-orchestrator';
import { sendEventToGHL } from '../services/ghl-service';
import type { AuthMiddleware } from './auth-middleware';

// Comparação em tempo constante para segredos compartilhados (mesmo padrão de verifyWebhookSignature).
function secretsEqual(provided: string | null, expected: string): boolean {
  if (provided === null) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Autentica via AuthMiddleware e resolve o tenant: query `tenant_id` ausente usa o
// tenant do contexto autenticado; presente e divergente => 403.
async function resolveLifecycleTenant(
  request: Request,
  url: URL,
  options: { auth: AuthMiddleware },
): Promise<{ tenantId: string } | Response> {
  const authResult = await options.auth.authenticate(request);
  if (authResult instanceof Response) return authResult;
  const requested = url.searchParams.get('tenant_id');
  if (requested !== null && requested !== '' && requested !== authResult.tenantId) {
    return new Response(JSON.stringify({ success: false, error: 'forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return { tenantId: requested !== null && requested !== '' ? requested : authResult.tenantId };
}

// ============================================================================
// Type Definitions
// ============================================================================

const LifecycleEventSchema = z.object({
  contact_id: z.string(),
  tenant_id: z.string(),
  from_stage: z.string().nullable(),
  to_stage: z.string(),
  metadata: z.record(z.any()).optional(),
});

const HookConfigSchema = z.object({
  from_stage: z.string().nullable().optional(),
  to_stage: z.string().optional(),
  action_type: z.enum(['send_email', 'create_ghl_opportunity', 'trigger_rei_onboarding', 'add_ghl_tag', 'notify_team', 'send_exit_survey', 'webhook']),
  action_config: z.record(z.any()),
  is_active: z.boolean().default(true),
  priority: z.number().int().default(100),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function matchPath(request: Request, method: string, pattern: string | RegExp): URL | null {
  if (request.method !== method && request.method !== 'OPTIONS') return null;
  const url = new URL(request.url);
  if (typeof pattern === 'string') {
    if (url.pathname !== pattern) return null;
  } else if (!pattern.test(url.pathname)) {
    return null;
  }
  return url;
}

function methodNotAllowed(): Response {
  return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Verify HMAC SHA-256 signature of an incoming webhook.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param rawBody - exact raw request body (must be the same string sent by GHL)
 * @param signature - signature provided in the header (hex-encoded)
 * @param secret - shared secret configured in GHL webhook
 * @returns true if signature is valid
 */
function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Both buffers must be the same length to use timingSafeEqual
  if (signature.length !== expected.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    // Invalid hex input from the header → reject
    return false;
  }
}

// ============================================================================
// HTTP Handlers
// ============================================================================

// POST /v1/lifecycle/process - manually trigger lifecycle event processing
export async function handleProcessLifecycle(
  request: Request,
  env: Record<string, string>,
  pool: Pool,
): Promise<Response | null> {
  const url = matchPath(request, 'POST', '/v1/lifecycle/process');
  if (!url) return null;
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') return methodNotAllowed();
  const triggerSecret = env.LIFECYCLE_TRIGGER_SECRET;
  if (!triggerSecret) {
    console.error('[LifecycleRoutes] LIFECYCLE_TRIGGER_SECRET não configurado. Rejeitando trigger por segurança.');
    return new Response(
      JSON.stringify({ success: false, error: 'trigger_secret_not_configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (!secretsEqual(request.headers.get('authorization'), `Bearer ${triggerSecret}`)) {
    console.warn('[LifecycleRoutes] Lifecycle process sem Bearer válido rejeitado.');
    return new Response(
      JSON.stringify({ success: false, error: 'unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let event;
  try {
    const body = await request.json();
    event = LifecycleEventSchema.parse(body);
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await processLifecycleEvent(event, env, pool);
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// POST /v1/lifecycle/webhook/calendar - receive Google Calendar webhook
export async function handleCalendarWebhook(
  request: Request,
  env: Record<string, string>,
  pool: Pool,
): Promise<Response | null> {
  const url = matchPath(request, 'POST', '/v1/lifecycle/webhook/calendar');
  if (!url) return null;
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') return methodNotAllowed();
  const calendarSecret = env.CALENDAR_WEBHOOK_SECRET;
  if (!calendarSecret) {
    console.error('[LifecycleRoutes] CALENDAR_WEBHOOK_SECRET não configurado. Rejeitando webhook por segurança.');
    return new Response(
      JSON.stringify({ success: false, error: 'calendar_secret_not_configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const channelToken = request.headers.get('x-goog-channel-token') ?? url.searchParams.get('token');
  if (!secretsEqual(channelToken, calendarSecret)) {
    console.warn('[LifecycleRoutes] Calendar webhook com token inválido rejeitado.');
    return new Response(
      JSON.stringify({ success: false, error: 'unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const payload = await request.json();

    // Validate that this is a Google Calendar webhook
    if (!payload.event_id || !payload.start_time || !payload.end_time) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required Google Calendar fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Trigger MediaOrchestrator (which handles transcript + analysis)
    const result = await handleMediaOrchestrator(
      new Request('http://internal/orchestrate', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      }),
      env,
      pool,
    );

    const data = await result.json();
    return new Response(JSON.stringify({ success: true, data: data.data || data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Webhook processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// POST /v1/lifecycle/webhook/ghl - receive GHL webhook
// PROTEGIDO por HMAC SHA-256 — alinhado ao padrão de ghl-service.ts:verifyWebhookSignature.
// GHL envia o header "x-ghl-signature" com o hex digest do body usando o secret compartilhado.
// O secret vem de env.GHL_WEBHOOK_SECRET (injetado via Secret Manager no Cloud Run).
export async function handleGHLWebhook(
  request: Request,
  env: Record<string, string>,
  pool: Pool,
): Promise<Response | null> {
  const url = matchPath(request, 'POST', '/v1/lifecycle/webhook/ghl');
  if (!url) return null;
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') return methodNotAllowed();

  try {
    // 1. Ler o body raw (text) para verificar a assinatura antes de parsear JSON.
    const rawBody = await request.text();
    const signature =
      request.headers.get('x-ghl-signature')
      ?? request.headers.get('ghl-signature')
      ?? request.headers.get('x-signature')
      ?? null;
    const secret = env.GHL_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[LifecycleRoutes] GHL_WEBHOOK_SECRET não configurado. Rejeitando webhook por segurança.');
      return new Response(
        JSON.stringify({ success: false, error: 'webhook_secret_not_configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      console.warn('[LifecycleRoutes] GHL webhook com assinatura inválida rejeitado.');
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Parse seguro do JSON após validação da assinatura.
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    console.log('[LifecycleRoutes] Received GHL webhook (verified):', payload);

    // Process GHL event (e.g., contact updated, opportunity created)
    // In real impl, map GHL event types to lifecycle actions
    return new Response(JSON.stringify({ success: true, processed: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'GHL webhook processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// GET /v1/lifecycle/hooks - list active hooks for tenant
export async function handleListHooks(
  request: Request,
  env: Record<string, string>,
  pool: Pool,
  options: { auth: AuthMiddleware },
): Promise<Response | null> {
  const url = matchPath(request, 'GET', '/v1/lifecycle/hooks');
  if (!url) return null;
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'GET') return methodNotAllowed();

  const tenant = await resolveLifecycleTenant(request, url, options);
  if (tenant instanceof Response) return tenant;
  const tenantId = tenant.tenantId;

  try {
    const result = await pool.query(
      `SELECT id, tenant_id, from_stage, to_stage, action_type, action_config, is_active, priority, created_at
       FROM app.lifecycle_hooks
       WHERE tenant_id = $1
       ORDER BY priority DESC, created_at DESC`,
      [tenantId],
    );

    return new Response(JSON.stringify({ success: true, data: result.rows }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'List hooks failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// POST /v1/lifecycle/hooks - create new hook config
export async function handleCreateHook(
  request: Request,
  env: Record<string, string>,
  pool: Pool,
  options: { auth: AuthMiddleware },
): Promise<Response | null> {
  const url = matchPath(request, 'POST', '/v1/lifecycle/hooks');
  if (!url) return null;
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') return methodNotAllowed();

  const tenant = await resolveLifecycleTenant(request, url, options);
  if (tenant instanceof Response) return tenant;
  const tenantId = tenant.tenantId;

  let body;
  try {
    body = HookConfigSchema.parse(await request.json());
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO app.lifecycle_hooks (
        tenant_id, from_stage, to_stage, action_type, action_config, is_active, priority, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      RETURNING *`,
      [
        tenantId,
        body.from_stage || null,
        body.to_stage || null,
        body.action_type,
        JSON.stringify(body.action_config),
        body.is_active ?? true,
        body.priority ?? 100,
      ],
    );

    return new Response(JSON.stringify({ success: true, data: result.rows[0] }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Create hook failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// GET /v1/lifecycle/contacts/:id/journey - get contact journey history
export async function handleContactJourney(
  request: Request,
  env: Record<string, string>,
  pool: Pool,
  options: { auth: AuthMiddleware },
): Promise<Response | null> {
  const url = matchPath(request, 'GET', /^\/v1\/lifecycle\/contacts\/([0-9a-f-]{36})\/journey$/);
  if (!url) return null;
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'GET') return methodNotAllowed();

  const match = url.pathname.match(/^\/v1\/lifecycle\/contacts\/([0-9a-f-]{36})\/journey$/);
  if (!match) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid contact_id format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const contactId = match[1];

  const tenant = await resolveLifecycleTenant(request, url, options);
  if (tenant instanceof Response) return tenant;

  try {
    const result = await pool.query(
      `SELECT id, from_stage, to_stage, triggered_by, metadata, transitioned_at
       FROM app.lifecycle_history
       WHERE contact_id = $1 AND tenant_id = $2
       ORDER BY transitioned_at DESC`,
      [contactId, tenant.tenantId],
    );

    return new Response(JSON.stringify({ success: true, data: result.rows }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Journey fetch failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
