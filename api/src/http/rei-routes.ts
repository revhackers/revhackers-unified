import { z } from 'zod';
import { ApiError } from '../contracts/errors';
import type { PostgresREIRepository } from '../domains/rei/postgres-repository';
import type { IdentityRepository } from '../identity/postgres-identity-repository';
import type { TokenVerifier } from '../identity/verifier';
import { AuthMiddleware, type AuthContext } from './auth-middleware';
import {
  buildWelcomeEmail,
  buildKickoffDoc,
  buildWrapUpEmail,
} from '../domains/rei/templates';
import type { CreateREIOnboardingParams } from '../domains/rei/types';

// ============================================================================
// ZOD SCHEMAS — Input validation para cada endpoint REI
// ============================================================================

const EmailSchema = z.string().trim().email('E-mail inválido').max(254);
// IDs aceitam qualquer string não-vazia (validação de formato fica a cargo do banco)
const IdSchema = z.string().trim().min(1, 'ID é obrigatório').max(128);
const UrlSchema = z.string().url('URL inválida').max(2000);
const String256 = z.string().trim().max(256);

const CreateOnboardingSchema = z.object({
  rei_project_id: IdSchema,
  client_email: EmailSchema,
  cs_lead_email: EmailSchema,
  client_name: z.string().trim().min(1).max(256).optional(),
  client_company: z.string().trim().max(256).optional(),
  product_name: String256.optional(),
  product_slug: String256.optional(),
  duration_days: z.number().int().min(1).max(365).optional(),
});

const WelcomeSchema = z.object({
  onboarding_id: IdSchema,
  kickoff_link: UrlSchema,
});

const KickoffSchema = z.object({
  onboarding_id: IdSchema,
  goal_sentence: z.string().trim().min(10, 'Goal sentence precisa de pelo menos 10 caracteres').max(1024),
});

const QuickWinSchema = z.object({
  onboarding_id: IdSchema,
  description: z.string().trim().min(1).max(1024),
  url: UrlSchema,
  loom_url: UrlSchema.optional(),
});

const NpsSchema = z.object({
  onboarding_id: IdSchema,
  score: z.number().int().min(0, 'Score NPS mínimo é 0').max(10, 'Score NPS máximo é 10'),
});

const ExpansionSuggestionSchema = z.object({
  product_name: z.string().trim().min(1).max(256),
  product_description: z.string().trim().max(1024).optional(),
  estimated_value_brl: z.number().positive().max(999999999).optional(),
  ai_reasoning: z.string().trim().max(2048).optional(),
  opportunity_type: z.enum(['upsell', 'cross_sell', 'renewal', 'expansion_service', 'referral']).optional(),
});

const WrapUpSchema = z.object({
  onboarding_id: IdSchema,
  milestone1Result: z.string().trim().min(1).max(2048),
  quickWinResult: z.string().trim().min(1).max(2048),
  metricResult: z.string().trim().min(1).max(2048),
  nextPhaseAligned: z.string().trim().min(1).max(2048),
  npsLink: UrlSchema,
  expansion_suggestions: z.array(ExpansionSuggestionSchema).max(10).optional(),
});

const ExpansionSchema = z.object({
  tenant_id: IdSchema,
  rei_onboarding_id: IdSchema.optional(),
  project_id: IdSchema.optional(),
  opportunity_type: z.enum(['upsell', 'cross_sell', 'renewal', 'expansion_service', 'referral']),
  product_name: z.string().trim().min(1).max(256),
  product_description: z.string().trim().max(1024).optional(),
  estimated_value_brl: z.number().positive().max(999999999).optional(),
  ai_reasoning: z.string().trim().max(2048).optional(),
  created_by: EmailSchema,
});

// ============================================================================
// ROUTES
// ============================================================================

interface REIRoutesDependencies {
  repository: PostgresREIRepository;
  verifier: TokenVerifier;
  identities: IdentityRepository;
}

function forbiddenTenant(): Response {
  return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
}

function json(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function parseBody<T>(raw: unknown, schema: z.ZodType<T>): { data: T } | { error: { code: string; message: string; details?: Record<string, string[]> } } {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const flat: Record<string, string[]> = {};
    for (const k of Object.keys(fieldErrors)) {
      const v = (fieldErrors as Record<string, unknown>)[k];
      if (Array.isArray(v)) flat[k] = v as string[];
    }
    return {
      error: {
        code: 'validation_failed',
        message: 'Payload inválido.',
        details: flat,
      },
    };
  }
  return { data: result.data };
}

function safeJsonParse(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

export function createREIRoutes(deps: REIRoutesDependencies) {
  const auth = new AuthMiddleware(deps);

  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/v1/rei')) return null;

    const authResult = await auth.authenticate(request);
    if (authResult instanceof Response) return authResult;
    const ctx: AuthContext = authResult;

    try {
      // POST /v1/rei/onboarding — Inicia o onboarding de um novo cliente REI
      if (request.method === 'POST' && url.pathname === '/v1/rei/onboarding') {
        const raw = await safeJsonParse(request);
        const parsed = parseBody(raw, CreateOnboardingSchema);
        if ('error' in parsed) return json(400, { error: parsed.error });
        const body = parsed.data;
        const record = await deps.repository.createOnboarding(body as unknown as CreateREIOnboardingParams);
        return json(201, { data: record });
      }

      // POST /v1/rei/welcome — Dispara o Milestone 0 (Welcome email Hormozi)
      if (request.method === 'POST' && url.pathname === '/v1/rei/welcome') {
        const raw = await safeJsonParse(request);
        const parsed = parseBody(raw, WelcomeSchema);
        if ('error' in parsed) return json(400, { error: parsed.error });
        const { onboarding_id, kickoff_link } = parsed.data;
        const record = await deps.repository.findById(onboarding_id);
        if (!record) throw ApiError.validation('Onboarding não encontrado.');
        if (record.tenant_id !== ctx.tenantId) return forbiddenTenant();

        const email = buildWelcomeEmail({
          clientName: record.client_name,
          productName: record.product_name,
          csLeadName: record.cs_lead_name,
          kickoffLink: kickoff_link,
          milestone1Window: 'within 3 days',
          quickWinPreview: 'personalized REI dashboard with real metrics',
          midPointDay: 21,
          wrapUpDay: 30,
        });

        await deps.repository.markWelcomeSent(onboarding_id);
        return json(200, {
          data: {
            onboarding_id,
            email_sent: true,
            welcome_email: email,
          },
        });
      }

      // POST /v1/rei/kickoff — Registra o Milestone 1 (Kickoff call)
      if (request.method === 'POST' && url.pathname === '/v1/rei/kickoff') {
        const raw = await safeJsonParse(request);
        const parsed = parseBody(raw, KickoffSchema);
        if ('error' in parsed) return json(400, { error: parsed.error });
        const { onboarding_id, goal_sentence } = parsed.data;
        const record = await deps.repository.findById(onboarding_id);
        if (!record) throw ApiError.validation('Onboarding não encontrado.');
        if (record.tenant_id !== ctx.tenantId) return forbiddenTenant();

        const doc = buildKickoffDoc({
          clientName: record.client_name,
          productName: record.product_name,
          goalSentence: goal_sentence,
          durationDays: record.duration_days,
          csLeadName: record.cs_lead_name,
        });

        await deps.repository.markKickoff(onboarding_id, goal_sentence);
        return json(200, {
          data: {
            onboarding_id,
            kickoff_completed: true,
            kickoff_doc: doc,
          },
        });
      }

      // POST /v1/rei/quick-win — Registra o Milestone 2 (Quick Win D7)
      if (request.method === 'POST' && url.pathname === '/v1/rei/quick-win') {
        const raw = await safeJsonParse(request);
        const parsed = parseBody(raw, QuickWinSchema);
        if ('error' in parsed) return json(400, { error: parsed.error });
        const body = parsed.data;
        const quickWinRecord = await deps.repository.findById(body.onboarding_id);
        if (quickWinRecord && quickWinRecord.tenant_id !== ctx.tenantId) return forbiddenTenant();
        await deps.repository.deliverQuickWin(body.onboarding_id, {
          description: body.description,
          url: body.url,
          loom_url: body.loom_url,
        });
        return json(200, {
          data: { onboarding_id: body.onboarding_id, quick_win_delivered: true },
        });
      }

      // POST /v1/rei/nps — Registra o NPS do Milestone 3 (D14)
      if (request.method === 'POST' && url.pathname === '/v1/rei/nps') {
        const raw = await safeJsonParse(request);
        const parsed = parseBody(raw, NpsSchema);
        if ('error' in parsed) return json(400, { error: parsed.error });
        const { onboarding_id, score } = parsed.data;
        const npsRecord = await deps.repository.findById(onboarding_id);
        if (npsRecord && npsRecord.tenant_id !== ctx.tenantId) return forbiddenTenant();
        await deps.repository.recordNPS(onboarding_id, score);
        const churn_risk = score < 7 ? 'high' : score < 8 ? 'medium' : 'low';
        return json(200, {
          data: { onboarding_id, nps_score: score, churn_risk },
        });
      }

      // GET /v1/rei/onboarding/active — Lista onboardings ativos (para dashboard)
      if (request.method === 'GET' && url.pathname === '/v1/rei/onboarding/active') {
        const records = await deps.repository.listActive(ctx.tenantId);
        const enriched = records.map((r) => {
          const startDate = r.kickoff_at ?? r.welcome_sent_at ?? r.created_at;
          const parsedTime = startDate ? new Date(startDate).getTime() : NaN;
          const daysIntoJourney = !isNaN(parsedTime)
            ? Math.floor((Date.now() - parsedTime) / 86400000)
            : 0;
          return { ...r, days_into_journey: Math.max(0, daysIntoJourney) };
        });
        return json(200, { data: enriched, count: enriched.length });
      }

      // POST /v1/rei/wrap-up — Milestone 5 (D30 Wrap-up + NPS formal)
      if (request.method === 'POST' && url.pathname === '/v1/rei/wrap-up') {
        const raw = await safeJsonParse(request);
        const parsed = parseBody(raw, WrapUpSchema);
        if ('error' in parsed) return json(400, { error: parsed.error });
        const body = parsed.data;

        const record = await deps.repository.findById(body.onboarding_id);
        if (!record) {
          return json(404, { error: { code: 'not_found', message: 'Onboarding não encontrado.' } });
        }
        if (record.tenant_id !== ctx.tenantId) return forbiddenTenant();

        const email = buildWrapUpEmail({
          clientName: record.client_name,
          productName: record.product_name,
          milestone1Result: body.milestone1Result,
          quickWinResult: body.quickWinResult,
          metricResult: body.metricResult,
          nextPhaseAligned: body.nextPhaseAligned,
          csLeadName: record.cs_lead_name,
          npsLink: body.npsLink,
        });

        const expansionSuggestions = body.expansion_suggestions || [];
        const expansionCount = { created: 0, errors: 0 };
        for (const suggestion of expansionSuggestions) {
          try {
            await deps.repository.createExpansionOpportunity({
              tenant_id: record.tenant_id,
              rei_onboarding_id: record.id,
              project_id: record.rei_project_id,
              opportunity_type: suggestion.opportunity_type || 'upsell',
              product_name: suggestion.product_name,
              product_description: suggestion.product_description || null,
              estimated_value_brl: suggestion.estimated_value_brl || null,
              ai_reasoning: suggestion.ai_reasoning || null,
              created_by: record.cs_lead_email,
            });
            expansionCount.created++;
          } catch (err) {
            console.error('[REIRoutes] Erro ao criar expansion opportunity:', err);
            expansionCount.errors++;
          }
        }

        return json(200, {
          data: {
            wrap_up_email: email,
            expansion_opportunities_created: expansionCount.created,
            expansion_opportunities_failed: expansionCount.errors,
          },
        });
      }

      // POST /v1/rei/expansion
      if (request.method === 'POST' && url.pathname === '/v1/rei/expansion') {
        const raw = await safeJsonParse(request);
        const parsed = parseBody(raw, ExpansionSchema);
        if ('error' in parsed) return json(400, { error: parsed.error });
        const body = parsed.data;

        if (body.tenant_id !== ctx.tenantId) return forbiddenTenant();

        await deps.repository.createExpansionOpportunity({
          tenant_id: ctx.tenantId,
          rei_onboarding_id: body.rei_onboarding_id || null,
          project_id: body.project_id || null,
          opportunity_type: body.opportunity_type,
          product_name: body.product_name,
          product_description: body.product_description || null,
          estimated_value_brl: body.estimated_value_brl || null,
          ai_reasoning: body.ai_reasoning || null,
          created_by: body.created_by,
        });
        return json(201, {
          data: {
            tenant_id: ctx.tenantId,
            opportunity_type: body.opportunity_type,
            product_name: body.product_name,
            status: 'identified',
            created_at: new Date().toISOString(),
          },
        });
      }

      // GET /v1/rei/expansion
      if (request.method === 'GET' && url.pathname === '/v1/rei/expansion') {
        const tenantId = url.searchParams.get('tenant_id');
        const onboardingId = url.searchParams.get('onboarding_id') || undefined;
        const status = url.searchParams.get('status') || undefined;

        if (!tenantId) {
          return json(400, { error: { code: 'validation', message: 'tenant_id é obrigatório.' } });
        }
        if (tenantId !== ctx.tenantId) return forbiddenTenant();

        const options: { onboarding_id?: string; status?: string } = {};
        if (onboardingId) options.onboarding_id = onboardingId;
        if (status) options.status = status;

        const opportunities = await deps.repository.listExpansionOpportunities(ctx.tenantId, options);
        return json(200, { data: opportunities, count: opportunities.length });
      }

      return json(405, { error: { code: 'method_not_allowed', message: 'Método HTTP não suportado.' } });
    } catch (error) {
      if (error instanceof ApiError) {
        return json(400, { error: { code: error.code, message: error.message } });
      }
      console.error('[REIRoute] Erro interno:', error);
      return json(500, { error: { code: 'internal', message: 'Erro interno no motor REI.' } });
    }
  };
}