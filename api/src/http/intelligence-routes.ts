import { z } from 'zod';
import { ApiError } from '../contracts/errors';
import type { PostgresIntelligenceJobsRepository } from '../domains/intelligence/postgres-repository-jobs';
import type { PostgresIntelligenceRepository } from '../domains/intelligence/postgres-repository';
import type { FonteDataIntelligenceConnector } from '../domains/intelligence/fonte-data-connector';
import { buildIndustryInsights } from '../domains/intelligence/insights-builder';
import { AuthMiddleware } from './auth-middleware';
import type { IdentityRepository } from '../identity/postgres-identity-repository';
import type { TokenVerifier } from '../identity/verifier';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const IdSchema = z.string().trim().min(1, 'ID é obrigatório').max(128);
const String512 = z.string().trim().max(512);

const CreateCompetitorSchema = z.object({
  tenant_id: IdSchema,
  project_id: IdSchema.optional(),
  name: z.string().trim().min(1, 'Nome do concorrente é obrigatório').max(256),
  cnpj: z.string().trim().max(20).optional(),
  website: String512.optional(),
  segment: String512.optional(),
  cnae_primary: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(2048).optional(),
  is_priority: z.boolean().optional(),
  added_by: z.string().trim().max(256).optional(),
});

const CreateSignalSchema = z.object({
  tenant_id: IdSchema,
  competitor_id: IdSchema.optional(),
  signal_type: z.enum(['news', 'funding', 'launch', 'pricing_change', 'hiring', 'partnership', 'acquisition', 'other']),
  title: z.string().trim().min(1, 'Título do sinal é obrigatório').max(512),
  summary: z.string().trim().max(2048).optional(),
  source_url: String512.optional(),
  source_name: z.string().trim().max(256).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  impact_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  detected_at: z.string().datetime().optional(),
  detected_by: z.string().trim().max(256).optional(),
});

const CreateJobSchema = z.object({
  tenant_id: IdSchema,
  job_type: z.enum(['competitor_enrichment', 'comparison_generation', 'signal_detection', 'framework_regeneration', 'market_scan']),
  competitor_id: IdSchema.optional(),
  project_id: IdSchema.optional(),
  input_payload: z.record(z.string(), z.unknown()).optional(),
  scheduled_for: z.string().datetime().optional(),
  max_attempts: z.number().int().min(1).max(10).optional(),
});

const CreateShareSchema = z.object({
  tenant_id: IdSchema,
  project_id: IdSchema,
  created_by: z.string().trim().min(1).max(256),
  expires_at: z.string().datetime().optional(),
});

/**
 * Token de compartilhamento criptograficamente seguro (padrão LinkCapability
 * de contracts/identity.ts: token opaco, escopo mínimo, expiração, revogação).
 * Persistido em app.growthmap_shares — sobrevive a restart/scale do Cloud Run.
 */
function generateShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `shr_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

interface IntelligenceRoutesDependencies {
  repository: PostgresIntelligenceRepository;
  jobsRepository: PostgresIntelligenceJobsRepository;
  fonteDataConnector: FonteDataIntelligenceConnector;
  verifier: TokenVerifier;
  identities: IdentityRepository;
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
    const flat = {} as Record<string, string[]>;
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

export function createIntelligenceRoutes(deps: IntelligenceRoutesDependencies) {
  const auth = new AuthMiddleware(deps);

  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/v1/intelligence')) return null;
    // Rotas de capability por posse do token (leitura pública do share e
    // revogação pelo portador) — sem Bearer auth, por desenho LinkCapability.
    const shareCapabilityMatch = url.pathname.match(/^\/v1\/intelligence\/share\/([a-zA-Z0-9_-]+)$/);
    const isShareCapabilityRoute =
      shareCapabilityMatch !== null && (request.method === 'GET' || request.method === 'DELETE');

    let authedTenantId = '';
    if (!isShareCapabilityRoute) {
      const authResult = await auth.authenticate(request);
      if (authResult instanceof Response) return authResult;
      authedTenantId = authResult.tenantId;
    }

    try {
      // GET /v1/intelligence/competitors/:project_id
      const listMatch = url.pathname.match(/^\/v1\/intelligence\/competitors\/([0-9a-f-]{36})$/);
      if (request.method === 'GET' && listMatch) {
        const projectId = listMatch[1];
        const tenantId = url.searchParams.get('tenant_id');
        if (!tenantId) return json(400, { error: { code: 'validation', message: 'tenant_id é obrigatório.' } });
        if (tenantId !== authedTenantId) return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
        const competitors = await deps.repository.listCompetitorsByProject(authedTenantId, projectId);
        return json(200, { data: competitors, count: competitors.length });
      }

      // GET /v1/intelligence/competitors/:id/full
      const fullMatch = url.pathname.match(/^\/v1\/intelligence\/competitors\/([0-9a-f-]{36})\/full$/);
      if (request.method === 'GET' && fullMatch) {
        const competitorId = fullMatch[1]!;
        const tenantId = url.searchParams.get('tenant_id');
        if (!tenantId) return json(400, { error: { code: 'validation', message: 'tenant_id é obrigatório.' } });
        if (tenantId !== authedTenantId) return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
        const result = await deps.repository.getCompetitorWithIntelligence(authedTenantId, competitorId);
        if (!result) return json(404, { error: { code: 'not_found', message: 'Concorrente não encontrado.' } });
        return json(200, { data: result });
      }

      // GET /v1/intelligence/signals/:project_id
      const signalsMatch = url.pathname.match(/^\/v1\/intelligence\/signals\/([0-9a-f-]{36})$/);
      if (request.method === 'GET' && signalsMatch) {
        const tenantId = url.searchParams.get('tenant_id');
        if (!tenantId) return json(400, { error: { code: 'validation', message: 'tenant_id é obrigatório.' } });
        if (tenantId !== authedTenantId) return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
        const signals = await deps.repository.listSignalsByTenant(authedTenantId, 50);
        return json(200, { data: signals, count: signals.length });
      }

      // POST /v1/intelligence/competitors — Create + async FonteData enrichment
      if (request.method === 'POST' && url.pathname === '/v1/intelligence/competitors') {
        const raw = await safeJsonParse(request);
        const parsed = parseBody(raw, CreateCompetitorSchema);
        if ('error' in parsed) return json(400, { error: parsed.error });
        const body = parsed.data;
        if (body.tenant_id !== authedTenantId) {
          return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
        }
        const competitor = await deps.repository.createCompetitor({
          tenant_id: authedTenantId,
          project_id: body.project_id ?? null,
          name: body.name,
          cnpj: body.cnpj ?? null,
          website: body.website ?? null,
          segment: body.segment ?? null,
          cnae_primary: body.cnae_primary ?? null,
          notes: body.notes ?? null,
          is_priority: body.is_priority ?? false,
          added_by: body.added_by ?? null,
        });
        if (body.cnpj) {
          setImmediate(async () => {
            try {
              const enriched = await deps.fonteDataConnector.enrichCompetitorByCNPJ(body.cnpj!);
              if (enriched) {
                await deps.repository.upsertIntelligence({
                  tenant_id: authedTenantId,
                  competitor_id: competitor.id,
                  ...enriched,
                });
              } else {
                await deps.repository.markEnrichmentFailed(authedTenantId, competitor.id, 'FonteData enrichment retornou null');
              }
            } catch (err) {
              await deps.repository.markEnrichmentFailed(authedTenantId, competitor.id, err instanceof Error ? err.message : 'Unknown error');
            }
          });
        }
        return json(201, { data: competitor, enrichment_status: body.cnpj ? 'processing' : 'pending' });
      }

      // POST /v1/intelligence/signals — Manual signal entry
      if (request.method === 'POST' && url.pathname === '/v1/intelligence/signals') {
        const raw = await safeJsonParse(request);
        const parsed = parseBody(raw, CreateSignalSchema);
        if ('error' in parsed) return json(400, { error: parsed.error });
        const body = parsed.data;
        if (body.tenant_id !== authedTenantId) {
          return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
        }
        const signal = await deps.repository.createSignal({
          tenant_id: authedTenantId,
          competitor_id: body.competitor_id ?? null,
          signal_type: body.signal_type,
          title: body.title,
          summary: body.summary ?? '',
          source_url: body.source_url ?? null,
          source_name: body.source_name ?? null,
          sentiment: (body.sentiment ?? 'neutral') as 'positive' | 'neutral' | 'negative',
          impact_level: (body.impact_level ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
          detected_by: body.detected_by ?? 'manual',
        });
        return json(201, { data: signal });
      }

      // POST /v1/intelligence/jobs
      if (request.method === 'POST' && url.pathname === '/v1/intelligence/jobs') {
        const raw = await safeJsonParse(request);
        const parsed = parseBody(raw, CreateJobSchema);
        if ('error' in parsed) return json(400, { error: parsed.error });
        const body = parsed.data;
        if (body.tenant_id !== authedTenantId) {
          return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
        }
        const job = await deps.jobsRepository.createJob({
          tenant_id: authedTenantId,
          job_type: body.job_type,
          competitor_id: body.competitor_id ?? null,
          project_id: body.project_id ?? null,
          input_payload: body.input_payload ?? {},
          scheduled_for: body.scheduled_for ?? null,
          max_attempts: body.max_attempts ?? 3,
        });
        return json(201, { data: job });
      }

      // GET /v1/intelligence/jobs
      if (request.method === 'GET' && url.pathname === '/v1/intelligence/jobs') {
        const tenantId = url.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(400, { error: { code: 'validation', message: 'tenant_id é obrigatório.' } });
        }
        if (tenantId !== authedTenantId) {
          return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
        }
        const jobs = await deps.jobsRepository.listJobsByTenant(authedTenantId, 50);
        return json(200, { data: jobs, count: jobs.length });
      }

      // GET /v1/intelligence/findings
      if (request.method === 'GET' && url.pathname === '/v1/intelligence/findings') {
        const tenantId = url.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(400, { error: { code: 'validation', message: 'tenant_id é obrigatório.' } });
        }
        if (tenantId !== authedTenantId) {
          return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
        }
        const findings = await deps.jobsRepository.listFindingsByTenant(authedTenantId, 50);
        return json(200, { data: findings, count: findings.length });
      }

      // POST /v1/intelligence/share — Gerar token de compartilhamento (persistente)
      if (request.method === 'POST' && url.pathname === '/v1/intelligence/share') {
        const raw = await safeJsonParse(request);
        const parsed = parseBody(raw, CreateShareSchema);
        if ('error' in parsed) return json(400, { error: parsed.error });
        const body = parsed.data;
        if (body.tenant_id !== authedTenantId) {
          return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
        }
        const share = await deps.repository.createShare({
          share_token: generateShareToken(),
          tenant_id: authedTenantId,
          project_id: body.project_id,
          created_by: body.created_by,
          expires_at: body.expires_at ?? null,
        });
        return json(201, {
          data: {
            share_token: share.share_token,
            share_url: `${url.origin}/public/growthmap/${share.share_token}`,
            expires_at: share.expires_at,
          },
        });
      }

      // GET /v1/intelligence/share/:share_token — Visualizar dados compartilhados (PÚBLICO, sem auth)
      if (request.method === 'GET' && shareCapabilityMatch) {
        const shareToken = shareCapabilityMatch[1]!;
        const tokenData = await deps.repository.findShareByToken(shareToken);
        if (!tokenData || tokenData.revoked) {
          return json(404, { error: { code: 'not_found', message: 'Link de compartilhamento inválido ou revogado.' } });
        }
        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
          return json(410, { error: { code: 'gone', message: 'Link de compartilhamento expirado.' } });
        }
        const competitors = await deps.repository.listCompetitorsByProject(tokenData.tenant_id, tokenData.project_id);
        return json(200, {
          data: {
            share_token: shareToken,
            tenant_id: tokenData.tenant_id,
            project_id: tokenData.project_id,
            created_at: tokenData.created_at,
            expires_at: tokenData.expires_at,
            competitors: competitors.map((c) => ({
              id: c.id, name: c.name, website: c.website, segment: c.segment, is_active: c.is_active,
            })),
          },
        });
      }

      // DELETE /v1/intelligence/share/:share_token — Revogar token (portador só revoga o próprio)
      if (request.method === 'DELETE' && shareCapabilityMatch) {
        const shareToken = shareCapabilityMatch[1]!;
        const revoked = await deps.repository.revokeShareByToken(shareToken);
        if (!revoked) {
          return json(404, { error: { code: 'not_found', message: 'Link de compartilhamento não encontrado.' } });
        }
        return json(200, { data: { share_token: shareToken, revoked: true } });
      }

      // GET /v1/intelligence/insights/:project_id — Industry Insights derived from enriched competitor data
      const insightsMatch = url.pathname.match(/^\/v1\/intelligence\/insights\/([0-9a-f-]{36})$/);
      if (request.method === 'GET' && insightsMatch) {
        const projectId = insightsMatch[1]!;
        const tenantId = url.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(400, { error: { code: 'validation', message: 'tenant_id é obrigatório.' } });
        }
        if (tenantId !== authedTenantId) {
          return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
        }
        const [fullCompetitors, signals] = await Promise.all([
          deps.repository.listCompetitorsFullByProject(authedTenantId, projectId),
          deps.repository.listSignalsByTenant(authedTenantId, 100),
        ]);
        const insights = buildIndustryInsights(fullCompetitors, signals);
        return json(200, { data: { insights, source: 'rules-based', generated_at: new Date().toISOString() } });
      }

      // GET /v1/intelligence/findings/:id/full — Drill-down de finding
      const findingFullMatch = url.pathname.match(/^\/v1\/intelligence\/findings\/([0-9a-f-]{36})\/full$/);
      if (request.method === 'GET' && findingFullMatch) {
        const findingId = findingFullMatch[1]!;
        const tenantId = url.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(400, { error: { code: 'validation', message: 'tenant_id é obrigatório.' } });
        }
        if (tenantId !== authedTenantId) {
          return json(403, { error: { code: 'forbidden', message: 'Acesso negado para este tenant.' } });
        }

        const allFindings = await deps.jobsRepository.listFindingsByTenant(authedTenantId, 500);
        const finding = allFindings.find((f) => f.id === findingId);
        if (!finding) {
          return json(404, { error: { code: 'not_found', message: 'Finding não encontrado.' } });
        }

        let job: any = null;
        if (finding.job_id) {
          job = await deps.jobsRepository.findJobById(authedTenantId, finding.job_id);
        }

        let competitor: any = null;
        if (finding.competitor_id) {
          competitor = await deps.repository.findCompetitorById(authedTenantId, finding.competitor_id);
        }

        return json(200, {
          data: {
            finding,
            job,
            competitor: competitor ? {
              id: competitor.id,
              name: competitor.name,
              website: competitor.website,
              segment: competitor.segment,
              cnpj: competitor.cnpj,
            } : null,
          },
        });
      }

      return json(405, { error: { code: 'method_not_allowed', message: 'Método HTTP não suportado.' } });
    } catch (error) {
      if (error instanceof ApiError) {
        return json(400, { error: { code: error.code, message: error.message } });
      }
      console.error('[IntelligenceRoute] Erro interno:', error);
      return json(500, { error: { code: 'internal', message: 'Erro interno no motor de inteligência.' } });
    }
  };
}
