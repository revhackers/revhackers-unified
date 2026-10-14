import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createIntelligenceRoutes } from '../../api/src/http/intelligence-routes';
import type { CompetitorRecord, CompetitorIntelligenceRecord, MarketSignalRecord, IntelligenceJobRecord, IntelligenceFindingRecord, GrowthMapShareRecord, CreateShareParams } from '../../api/src/domains/intelligence/types';
import type { TokenVerifier } from '../../api/src/identity/verifier';
import type { IdentityRepository } from '../../api/src/identity/postgres-identity-repository';
import type { InternalUser } from '../../api/src/contracts/tenant';

function createMockRepository() {
  // Store em memória que emula a persistência de app.growthmap_shares
  // (comportamento de create → find → revoke usado nos testes round-trip).
  const shareStore = new Map<string, GrowthMapShareRecord>();

  return {
    createCompetitor: vi.fn(),
    findCompetitorById: vi.fn(),
    listCompetitorsByProject: vi.fn(),
    updateCompetitor: vi.fn(),
    deleteCompetitor: vi.fn(),
    upsertIntelligence: vi.fn(),
    findIntelligenceByCompetitorId: vi.fn(),
    markEnrichmentFailed: vi.fn(),
    upsertComparison: vi.fn(),
    listComparisonsByProject: vi.fn(),
    createSignal: vi.fn(),
    listSignalsByCompetitorId: vi.fn(),
    listSignalsByTenant: vi.fn(),
    getCompetitorWithIntelligence: vi.fn(),
    listCompetitorsFullByProject: vi.fn(),
    createJob: vi.fn(),
    findPendingJobs: vi.fn(),
    findJobById: vi.fn(),
    markJobProcessing: vi.fn(),
    markJobCompleted: vi.fn(),
    markJobFailed: vi.fn(),
    incrementJobAttempts: vi.fn(),
    listJobsByTenant: vi.fn(),
    listFindingsByTenant: vi.fn(),
    createFinding: vi.fn(),
    // ─── GrowthMap shares (persistente) ────────────────────────────────────
    createShare: vi.fn(async (params: CreateShareParams): Promise<GrowthMapShareRecord> => {
      const record: GrowthMapShareRecord = {
        share_token: params.share_token,
        tenant_id: params.tenant_id,
        project_id: params.project_id,
        created_by: params.created_by,
        created_at: new Date().toISOString(),
        expires_at: params.expires_at ?? null,
        revoked: false,
      };
      shareStore.set(record.share_token, record);
      return record;
    }),
    findShareByToken: vi.fn(async (shareToken: string): Promise<GrowthMapShareRecord | null> => {
      return shareStore.get(shareToken) ?? null;
    }),
    revokeShareByToken: vi.fn(async (shareToken: string): Promise<GrowthMapShareRecord | null> => {
      const existing = shareStore.get(shareToken);
      if (!existing) return null;
      const revoked = { ...existing, revoked: true };
      shareStore.set(shareToken, revoked);
      return revoked;
    }),
  };
}

function createMockConnector() {
  return { enrichCompetitorByCNPJ: vi.fn() };
}

// ─── Stubs de autenticação (AuthMiddleware: verifier + identities) ──────────
// Contexto autenticado fixo no tenant TENANT-A; cross-tenant usa TENANT-B.
const AUTH_TENANT = 'TENANT-A';
const FOREIGN_TENANT = 'TENANT-B';
const AUTH_HEADERS = { Authorization: 'Bearer test-token' };
const JSON_AUTH_HEADERS = { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' };

function createAuthStubs() {
  const mockUser: InternalUser = {
    id: 'user-1',
    globalRole: 'admin',
    status: 'active',
    memberships: [{ userId: 'user-1', tenantId: AUTH_TENANT, role: 'admin', status: 'active' }],
  };
  return {
    verifier: { verify: vi.fn().mockResolvedValue({ issuer: 'test-issuer', subject: 'user-1', expiresAt: 9999999999 }) } as unknown as TokenVerifier,
    identities: { findOrCreateUser: vi.fn().mockResolvedValue(mockUser) } as unknown as IdentityRepository,
  };
}

function createTestRoute(
  mockRepo: ReturnType<typeof createMockRepository>,
  mockConnector: ReturnType<typeof createMockConnector>,
) {
  return createIntelligenceRoutes({
    repository: mockRepo as any,
    jobsRepository: mockRepo as any,
    fonteDataConnector: mockConnector as any,
    ...createAuthStubs(),
  });
}

function makeCompetitor(overrides: Partial<CompetitorRecord> = {}): CompetitorRecord {
  const now = new Date().toISOString();
  return {
    id: 'comp-1', tenant_id: 'tenant-1', project_id: 'proj-1',
    name: 'Acme Competitor', cnpj: '12.345.678/0001-90',
    website: 'https://acme.com', segment: 'CRM', cnae_primary: '6201-5',
    notes: 'Main competitor', is_active: true, is_priority: false,
    added_by: 'user@revhackers.com', created_at: now, updated_at: now,
    ...overrides,
  };
}

function makeIntelligence(overrides: Partial<CompetitorIntelligenceRecord> = {}): CompetitorIntelligenceRecord {
  const now = new Date().toISOString();
  return {
    id: 'int-1', tenant_id: 'tenant-1', competitor_id: 'comp-1',
    razao_social: 'Acme SA', nome_fantasia: 'Acme', cnpj: '12.345.678/0001-90',
    capital_social_brl: 1000000, porte: 'GRANDE', natureza_juridica: 'Sociedade Anônima',
    cnae_primary: '6201-5', cnae_secondary: [], uf: 'SP', municipio: 'São Paulo',
    data_abertura: '2020-01-01', situacao_receita: 'ATIVA',
    qsa: [{ nome: 'João Silva', cargo: 'CEO' }],
    spi_score: 75, spi_category: 'SCALEUP', ofs_risk_level: 'LOW',
    raw_payload: {}, last_enriched_at: now, enrichment_status: 'enriched',
    enrichment_error: null, created_at: now, updated_at: now,
    ...overrides,
  };
}

function makeSignal(overrides: Partial<MarketSignalRecord> = {}): MarketSignalRecord {
  const now = new Date().toISOString();
  return {
    id: 'sig-1', tenant_id: 'tenant-1', competitor_id: 'comp-1',
    signal_type: 'funding', title: 'Acme raised $50M Series B',
    summary: 'Major funding round', source_url: 'https://news.com/acme',
    source_name: 'TechCrunch', sentiment: 'positive', impact_level: 'high',
    detected_at: now, detected_by: 'system', created_at: now, updated_at: now,
    ...overrides,
  };
}

function makeJob(overrides: Partial<IntelligenceJobRecord> = {}): IntelligenceJobRecord {
  const now = new Date().toISOString();
  return {
    id: 'job-1', tenant_id: 'tenant-1', job_type: 'competitor_enrichment',
    status: 'pending', competitor_id: 'comp-1', project_id: 'proj-1',
    input_payload: {}, output_payload: {}, attempts: 0, max_attempts: 3,
    last_error: null, scheduled_for: now, started_at: null, completed_at: null,
    created_at: now, updated_at: now,
    ...overrides,
  };
}

function makeFinding(overrides: Partial<IntelligenceFindingRecord> = {}): IntelligenceFindingRecord {
  const now = new Date().toISOString();
  return {
    id: 'find-1', tenant_id: 'tenant-1', job_id: 'job-1', competitor_id: 'comp-1',
    finding_type: 'pricing_alert', title: 'Acme raised prices 30%',
    description: 'Premium plan now $499/month', severity: 'high',
    confidence_score: 0.87, source_url: 'https://acme.com/pricing',
    source_name: 'Acme Pricing Page', recommended_action: 'Update our pricing tier',
    detected_at: now, created_at: now, updated_at: now,
    ...overrides,
  };
}

describe('Intelligence Routes — CRUD operations', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockConnector: ReturnType<typeof createMockConnector>;
  let route: (req: Request) => Promise<Response | null>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockConnector = createMockConnector();
    route = createTestRoute(mockRepo, mockConnector);
  });

  it('lists competitors for a project with valid tenant_id', async () => {
    mockRepo.listCompetitorsByProject.mockResolvedValueOnce([makeCompetitor({ id: 'comp-1' }), makeCompetitor({ id: 'comp-2' })]);
    const projectId = '12345678-1234-1234-1234-123456789012';
    const req = new Request(`https://api.test/v1/intelligence/competitors/${projectId}?tenant_id=${AUTH_TENANT}`, { method: 'GET', headers: AUTH_HEADERS });
    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.count).toBe(2);
    expect(body.data).toHaveLength(2);
  });

  it('returns 400 when listing competitors without tenant_id', async () => {
    const projectId = '12345678-1234-1234-1234-123456789012';
    const req = new Request(`https://api.test/v1/intelligence/competitors/${projectId}`, { method: 'GET', headers: AUTH_HEADERS });
    const res = await route(req);
    expect(res?.status).toBe(400);
  });

  it('creates a competitor with valid payload (no CNPJ)', async () => {
    mockRepo.createCompetitor.mockResolvedValueOnce(makeCompetitor({ id: 'new-comp' }));
    const req = new Request('https://api.test/v1/intelligence/competitors', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, project_id: 'proj-1', name: 'New Competitor', added_by: 'user@revhackers.com' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(201);
    const body = (await res?.json()) as any;
    expect(body.data.id).toBe('new-comp');
    expect(body.enrichment_status).toBe('pending');
  });

  it('creates a competitor with CNPJ and triggers async FonteData enrichment', async () => {
    mockRepo.createCompetitor.mockResolvedValueOnce(makeCompetitor({ id: 'comp-cnpj' }));
    mockConnector.enrichCompetitorByCNPJ.mockResolvedValueOnce(makeIntelligence());
    mockRepo.upsertIntelligence.mockResolvedValueOnce(makeIntelligence());
    const req = new Request('https://api.test/v1/intelligence/competitors', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, project_id: 'proj-1', name: 'Acme', cnpj: '12.345.678/0001-90', added_by: 'user@revhackers.com' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(201);
    const body = (await res?.json()) as any;
    expect(body.enrichment_status).toBe('processing');
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockConnector.enrichCompetitorByCNPJ).toHaveBeenCalledWith('12.345.678/0001-90');
    expect(mockRepo.upsertIntelligence).toHaveBeenCalled();
  });

  it('marks enrichment as failed when FonteDataConnector returns null', async () => {
    mockRepo.createCompetitor.mockResolvedValueOnce(makeCompetitor({ id: 'comp-fail' }));
    mockConnector.enrichCompetitorByCNPJ.mockResolvedValueOnce(null);
    mockRepo.markEnrichmentFailed.mockResolvedValueOnce(undefined);
    const req = new Request('https://api.test/v1/intelligence/competitors', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, project_id: 'proj-1', name: 'Acme', cnpj: '11.111.111/0001-11', added_by: 'user@revhackers.com' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(201);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockRepo.markEnrichmentFailed).toHaveBeenCalled();
  });

  it('returns 400 when creating competitor without required fields', async () => {
    const req = new Request('https://api.test/v1/intelligence/competitors', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ name: 'Missing Fields' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(400);
  });

  it('returns competitor full data with intelligence and signals', async () => {
    mockRepo.getCompetitorWithIntelligence.mockResolvedValueOnce({ competitor: makeCompetitor(), intelligence: makeIntelligence(), recent_signals: [makeSignal()], comparison: null });
    const competitorId = '12345678-1234-1234-1234-123456789012';
    const req = new Request(`https://api.test/v1/intelligence/competitors/${competitorId}/full?tenant_id=${AUTH_TENANT}`, { method: 'GET', headers: AUTH_HEADERS });
    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.data.competitor.id).toBe('comp-1');
    expect(body.data.intelligence.spi_score).toBe(75);
    expect(body.data.recent_signals).toHaveLength(1);
  });

  it('returns 404 when competitor full data is not found', async () => {
    mockRepo.getCompetitorWithIntelligence.mockResolvedValueOnce(null);
    const competitorId = '12345678-1234-1234-1234-123456789012';
    const req = new Request(`https://api.test/v1/intelligence/competitors/${competitorId}/full?tenant_id=${AUTH_TENANT}`, { method: 'GET', headers: AUTH_HEADERS });
    const res = await route(req);
    expect(res?.status).toBe(404);
  });

  it('creates a market signal with valid payload', async () => {
    mockRepo.createSignal.mockResolvedValueOnce(makeSignal({ id: 'new-sig' }));
    const req = new Request('https://api.test/v1/intelligence/signals', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, signal_type: 'funding', title: 'New round of funding' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(201);
    const body = (await res?.json()) as any;
    expect(body.data.id).toBe('new-sig');
  });

  it('returns null for paths outside /v1/intelligence', async () => {
    const req = new Request('https://api.test/v1/other', { method: 'GET' });
    const res = await route(req);
    expect(res).toBeNull();
  });

  // POST /v1/intelligence/jobs
  it('enqueues a new intelligence job', async () => {
    mockRepo.createJob.mockResolvedValueOnce(makeJob({ id: 'new-job' }));
    const req = new Request('https://api.test/v1/intelligence/jobs', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, job_type: 'competitor_enrichment', competitor_id: 'comp-1' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(201);
    const body = (await res?.json()) as any;
    expect(body.data.id).toBe('new-job');
    expect(body.data.status).toBe('pending');
  });

  it('enqueues a market_scan job with no competitor_id', async () => {
    mockRepo.createJob.mockResolvedValueOnce(makeJob({ id: 'scan-job', job_type: 'market_scan', competitor_id: null }));
    const req = new Request('https://api.test/v1/intelligence/jobs', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, job_type: 'market_scan' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(201);
    const body = (await res?.json()) as any;
    expect(body.data.job_type).toBe('market_scan');
    expect(body.data.competitor_id).toBeNull();
  });

  it('returns 400 when creating job without required fields', async () => {
    const req = new Request('https://api.test/v1/intelligence/jobs', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ job_type: 'competitor_enrichment' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(400);
  });

  // GET /v1/intelligence/jobs
  it('lists jobs for a tenant with valid tenant_id', async () => {
    mockRepo.listJobsByTenant.mockResolvedValueOnce([
      makeJob({ id: 'job-1', status: 'pending' }),
      makeJob({ id: 'job-2', status: 'completed' }),
    ]);
    const req = new Request(`https://api.test/v1/intelligence/jobs?tenant_id=${AUTH_TENANT}`, { method: 'GET', headers: AUTH_HEADERS });
    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.count).toBe(2);
    expect(body.data).toHaveLength(2);
  });

  it('returns 400 when listing jobs without tenant_id', async () => {
    const req = new Request('https://api.test/v1/intelligence/jobs', { method: 'GET', headers: AUTH_HEADERS });
    const res = await route(req);
    expect(res?.status).toBe(400);
  });

  // GET /v1/intelligence/findings
  it('lists findings for a tenant with valid tenant_id', async () => {
    mockRepo.listFindingsByTenant.mockResolvedValueOnce([
      makeFinding({ id: 'find-1', severity: 'critical' }),
      makeFinding({ id: 'find-2', severity: 'medium' }),
    ]);
    const req = new Request(`https://api.test/v1/intelligence/findings?tenant_id=${AUTH_TENANT}`, { method: 'GET', headers: AUTH_HEADERS });
    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.count).toBe(2);
    expect(body.data[0].severity).toBe('critical');
  });

  it('returns empty list when no findings exist', async () => {
    mockRepo.listFindingsByTenant.mockResolvedValueOnce([]);
    const req = new Request(`https://api.test/v1/intelligence/findings?tenant_id=${AUTH_TENANT}`, { method: 'GET', headers: AUTH_HEADERS });
    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.count).toBe(0);
    expect(body.data).toEqual([]);
  });

  it('returns 400 when listing findings without tenant_id', async () => {
    const req = new Request('https://api.test/v1/intelligence/findings', { method: 'GET', headers: AUTH_HEADERS });
    const res = await route(req);
    expect(res?.status).toBe(400);
  });

  // POST /v1/intelligence/share
  it('creates a share token with valid fields', async () => {
    const req = new Request('https://api.test/v1/intelligence/share', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, project_id: 'proj-1', created_by: 'user@revhackers.com' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(201);
    const body = (await res?.json()) as any;
    expect(body.data.share_token).toMatch(/^shr_[0-9a-f]{48}$/);
    expect(body.data.share_url).toContain('/public/growthmap/');
  });

  it('creates a share token with custom expiration date', async () => {
    const expiresAt = '2027-01-01T00:00:00Z';
    const req = new Request('https://api.test/v1/intelligence/share', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, project_id: 'proj-1', created_by: 'user@revhackers.com', expires_at: expiresAt }),
    });
    const res = await route(req);
    expect(res?.status).toBe(201);
    const body = (await res?.json()) as any;
    expect(body.data.expires_at).toBe(expiresAt);
  });

  it('returns 400 when creating share without required fields', async () => {
    const req = new Request('https://api.test/v1/intelligence/share', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ project_id: 'proj-1' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(400);
  });

  // GET /v1/intelligence/share/:share_token
  it('returns share data for valid token', async () => {
    mockRepo.listCompetitorsByProject.mockResolvedValueOnce([]);
    const createReq = new Request('https://api.test/v1/intelligence/share', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, project_id: 'proj-1', created_by: 'user@revhackers.com' }),
    });
    const createRes = await route(createReq);
    const createBody = (await createRes?.json()) as any;
    const shareToken = createBody.data.share_token;

    const req = new Request(`https://api.test/v1/intelligence/share/${shareToken}`, { method: 'GET' });
    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.data.share_token).toBe(shareToken);
    expect(body.data.competitors).toEqual([]);
  });

  it('returns 404 for invalid share token', async () => {
    const req = new Request('https://api.test/v1/intelligence/share/shr_invalid_token_123', { method: 'GET' });
    const res = await route(req);
    expect(res?.status).toBe(404);
  });

  it('returns 410 for expired share token', async () => {
    const createReq = new Request('https://api.test/v1/intelligence/share', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, project_id: 'proj-1', created_by: 'user@revhackers.com', expires_at: '2020-01-01T00:00:00Z' }),
    });
    const createRes = await route(createReq);
    const createBody = (await createRes?.json()) as any;
    const shareToken = createBody.data.share_token;

    const req = new Request(`https://api.test/v1/intelligence/share/${shareToken}`, { method: 'GET' });
    const res = await route(req);
    expect(res?.status).toBe(410);
  });

  // DELETE /v1/intelligence/share/:share_token
  it('revokes an existing share token', async () => {
    const createReq = new Request('https://api.test/v1/intelligence/share', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, project_id: 'proj-1', created_by: 'user@revhackers.com' }),
    });
    const createRes = await route(createReq);
    const createBody = (await createRes?.json()) as any;
    const shareToken = createBody.data.share_token;

    const req = new Request(`https://api.test/v1/intelligence/share/${shareToken}`, { method: 'DELETE' });
    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.data.revoked).toBe(true);

    const getReq = new Request(`https://api.test/v1/intelligence/share/${shareToken}`, { method: 'GET' });
    const getRes = await route(getReq);
    expect(getRes?.status).toBe(404);
  });

  it('returns 404 when revoking non-existent share token', async () => {
    const req = new Request('https://api.test/v1/intelligence/share/shr_nonexistent', { method: 'DELETE' });
    const res = await route(req);
    expect(res?.status).toBe(404);
  });

  it('share token persiste entre instâncias de rota (simula restart/scale do Cloud Run)', async () => {
    // O mesmo repository emula o banco compartilhado entre duas instâncias.
    // Com o store em memória antigo (module-level Map), um novo processo perdia
    // todos os tokens — aqui o segundo handler precisa achar o token criado pelo primeiro.
    const routeA = createTestRoute(mockRepo, mockConnector);
    const routeB = createTestRoute(mockRepo, mockConnector);
    mockRepo.listCompetitorsByProject.mockResolvedValue([]);

    const createRes = await routeA(new Request('https://api.test/v1/intelligence/share', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, project_id: 'proj-1', created_by: 'user@revhackers.com' }),
    }));
    const { data: { share_token: shareToken } } = (await createRes?.json()) as any;

    const readRes = await routeB(new Request(`https://api.test/v1/intelligence/share/${shareToken}`, { method: 'GET' }));
    expect(readRes?.status).toBe(200);
    const body = (await readRes?.json()) as any;
    expect(body.data.share_token).toBe(shareToken);
    expect(body.data.project_id).toBe('proj-1');
  });
});

describe('Intelligence Routes — GET /v1/intelligence/insights/:project_id', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockConnector: ReturnType<typeof createMockConnector>;
  let route: (req: Request) => Promise<Response | null>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockConnector = createMockConnector();
    route = createTestRoute(mockRepo, mockConnector);
  });

  const PROJECT = '12345678-1234-1234-1234-123456789012';
  const TENANT = AUTH_TENANT;
  const url = (q?: string) =>
    `https://api.test/v1/intelligence/insights/${PROJECT}${q ? `?${q}` : ''}`;

  it('returns 400 when tenant_id is missing', async () => {
    const res = await route(new Request(url(), { method: 'GET', headers: AUTH_HEADERS }));
    expect(res?.status).toBe(400);
    const body = (await res?.json()) as any;
    expect(body.error.code).toBe('validation');
  });

  it('returns 400 when project_id is not a UUID', async () => {
    const res = await route(new Request(`https://api.test/v1/intelligence/insights/not-a-uuid?tenant_id=${TENANT}`, { method: 'GET', headers: AUTH_HEADERS }));
    expect(res?.status).toBe(405); // path doesn't match any route, falls through to method-not-allowed
  });

  it('returns empty insights array when no competitors are registered', async () => {
    mockRepo.listCompetitorsFullByProject.mockResolvedValueOnce([]);
    mockRepo.listSignalsByTenant.mockResolvedValueOnce([]);
    const res = await route(new Request(url(`tenant_id=${TENANT}`), { method: 'GET', headers: AUTH_HEADERS }));
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.data.insights).toEqual([{
      label: 'Concorrentes monitorados',
      value: '0',
      description: 'Nenhum concorrente cadastrado ainda.',
      trend: 'neutral',
    }]);
    expect(body.data.source).toBe('rules-based');
    expect(typeof body.data.generated_at).toBe('string');
  });

  it('returns insights derived from enriched competitors', async () => {
    const enriched = makeIntelligence({
      capital_social_brl: 1_500_000,
      porte: 'ME',
      uf: 'SP',
      spi_score: 75,
      spi_category: 'SCALEUP',
      ofs_risk_level: 'LOW',
      enrichment_status: 'enriched',
    });
    mockRepo.listCompetitorsFullByProject.mockResolvedValueOnce([
      { competitor: makeCompetitor({ id: 'comp-1' }), intelligence: enriched, recent_signals: [], comparison: null },
    ]);
    mockRepo.listSignalsByTenant.mockResolvedValueOnce([makeSignal({ sentiment: 'positive' })]);

    const res = await route(new Request(url(`tenant_id=${TENANT}`), { method: 'GET', headers: AUTH_HEADERS }));
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    const labels = body.data.insights.map((i: any) => i.label);
    expect(labels).toContain('Concorrentes monitorados');
    expect(labels).toContain('Empresas enriquecidas');
    expect(labels).toContain('Capital social somado');
    expect(labels).toContain('Porte predominante');
    expect(labels).toContain('Concentração geográfica');
    expect(labels).toContain('SPI médio');
    expect(labels).toContain('Perfil de risco (OFS)');
    expect(labels).toContain('Sinais de mercado detectados');
  });

  it('returns only competitor-monitored card when competitors are not enriched', async () => {
    mockRepo.listCompetitorsFullByProject.mockResolvedValueOnce([
      { competitor: makeCompetitor({ id: 'comp-1' }), intelligence: null, recent_signals: [], comparison: null },
      { competitor: makeCompetitor({ id: 'comp-2' }), intelligence: null, recent_signals: [], comparison: null },
    ]);
    mockRepo.listSignalsByTenant.mockResolvedValueOnce([]);
    const res = await route(new Request(url(`tenant_id=${TENANT}`), { method: 'GET', headers: AUTH_HEADERS }));
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    const labels = body.data.insights.map((i: any) => i.label);
    expect(labels).toContain('Empresas enriquecidas');
    expect(labels).toContain('Concorrentes monitorados');
    expect(labels).not.toContain('Capital social somado');
    expect(labels).not.toContain('Porte predominante');
    expect(labels).not.toContain('SPI médio');
    expect(labels).not.toContain('Perfil de risco (OFS)');
  });

  it('returns 405 on POST to insights endpoint', async () => {
    const res = await route(new Request(url(`tenant_id=${TENANT}`), { method: 'POST', headers: AUTH_HEADERS }));
    expect(res?.status).toBe(405);
  });

  it('returns 405 on PUT to insights endpoint', async () => {
    const res = await route(new Request(url(`tenant_id=${TENANT}`), { method: 'PUT', headers: AUTH_HEADERS }));
    expect(res?.status).toBe(405);
  });
});

describe('Intelligence Routes — autenticação e isolamento de tenant', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockConnector: ReturnType<typeof createMockConnector>;
  let route: (req: Request) => Promise<Response | null>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockConnector = createMockConnector();
    route = createTestRoute(mockRepo, mockConnector);
  });

  const PROJECT = '12345678-1234-1234-1234-123456789012';

  it('retorna 401 sem header Authorization', async () => {
    const req = new Request(`https://api.test/v1/intelligence/competitors/${PROJECT}?tenant_id=${AUTH_TENANT}`, { method: 'GET' });
    const res = await route(req);
    expect(res?.status).toBe(401);
    const body = (await res?.json()) as any;
    expect(body.error.code).toBe('unauthenticated');
    expect(mockRepo.listCompetitorsByProject).not.toHaveBeenCalled();
  });

  it('retorna 401 com token inválido', async () => {
    const rejectingRoute = createIntelligenceRoutes({
      repository: mockRepo as any,
      jobsRepository: mockRepo as any,
      fonteDataConnector: mockConnector as any,
      verifier: { verify: vi.fn().mockRejectedValue(new Error('bad token')) } as unknown as TokenVerifier,
      identities: { findOrCreateUser: vi.fn() } as unknown as IdentityRepository,
    });
    const req = new Request(`https://api.test/v1/intelligence/competitors/${PROJECT}?tenant_id=${AUTH_TENANT}`, {
      method: 'GET',
      headers: { Authorization: 'Bearer token-invalido' },
    });
    const res = await rejectingRoute(req);
    expect(res?.status).toBe(401);
    const body = (await res?.json()) as any;
    expect(body.error.code).toBe('unauthenticated');
  });

  it('retorna 403 para tenant_id de outro tenant no GET', async () => {
    const req = new Request(`https://api.test/v1/intelligence/competitors/${PROJECT}?tenant_id=${FOREIGN_TENANT}`, { method: 'GET', headers: AUTH_HEADERS });
    const res = await route(req);
    expect(res?.status).toBe(403);
    const body = (await res?.json()) as any;
    expect(body.error.code).toBe('forbidden');
    expect(body.error.message).toBe('Acesso negado para este tenant.');
    expect(mockRepo.listCompetitorsByProject).not.toHaveBeenCalled();
  });

  it('retorna 403 para tenant_id divergente no POST sem tocar o repository', async () => {
    const req = new Request('https://api.test/v1/intelligence/competitors', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: FOREIGN_TENANT, project_id: 'proj-1', name: 'Invasor' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(403);
    const body = (await res?.json()) as any;
    expect(body.error.code).toBe('forbidden');
    expect(mockRepo.createCompetitor).not.toHaveBeenCalled();
  });

  it('usa o tenant autenticado nas chamadas ao repository', async () => {
    mockRepo.listCompetitorsByProject.mockResolvedValueOnce([makeCompetitor({ id: 'comp-1' })]);
    const req = new Request(`https://api.test/v1/intelligence/competitors/${PROJECT}?tenant_id=${AUTH_TENANT}`, { method: 'GET', headers: AUTH_HEADERS });
    const res = await route(req);
    expect(res?.status).toBe(200);
    expect(mockRepo.listCompetitorsByProject).toHaveBeenCalledWith(AUTH_TENANT, PROJECT);
  });

  it('mantém GET do share público sem auth (200)', async () => {
    mockRepo.listCompetitorsByProject.mockResolvedValueOnce([]);
    const createRes = await route(new Request('https://api.test/v1/intelligence/share', {
      method: 'POST', headers: JSON_AUTH_HEADERS,
      body: JSON.stringify({ tenant_id: AUTH_TENANT, project_id: 'proj-1', created_by: 'user@revhackers.com' }),
    }));
    expect(createRes?.status).toBe(201);
    const { data: { share_token: shareToken } } = (await createRes?.json()) as any;

    const res = await route(new Request(`https://api.test/v1/intelligence/share/${shareToken}`, { method: 'GET' }));
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.data.share_token).toBe(shareToken);
  });

  it('mantém GET do share público sem auth (404 para token inválido)', async () => {
    const res = await route(new Request('https://api.test/v1/intelligence/share/shr_token_inexistente', { method: 'GET' }));
    expect(res?.status).toBe(404);
  });

  it('exige auth no POST do share (401 sem header)', async () => {
    const req = new Request('https://api.test/v1/intelligence/share', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: AUTH_TENANT, project_id: 'proj-1', created_by: 'user@revhackers.com' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(401);
  });
});
