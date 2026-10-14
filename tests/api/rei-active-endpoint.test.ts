import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createREIRoutes } from '../../api/src/http/rei-routes';
import type { REIOnboardingRecord } from '../../api/src/domains/rei/types';
import type { InternalUser } from '../../api/src/contracts/tenant';
import type { IdentityRepository } from '../../api/src/identity/postgres-identity-repository';
import type { TokenVerifier } from '../../api/src/identity/verifier';
import type { PostgresREIRepository } from '../../api/src/domains/rei/postgres-repository';

const TEST_TENANT_ID = 'tenant_a';

function makeAuthStubs(): { verifier: TokenVerifier; identities: IdentityRepository } {
  const verifier: TokenVerifier = {
    verify: async () => ({
      issuer: 'https://test.issuer',
      subject: 'user_1',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    }),
  };
  const user: InternalUser = {
    id: 'user_1',
    globalRole: 'admin',
    status: 'active',
    memberships: [{ userId: 'user_1', tenantId: TEST_TENANT_ID, role: 'owner', status: 'active' }],
  };
  const identities: IdentityRepository = {
    findUser: async () => user,
    findOrCreateUser: async () => user,
    resolveProjectTenant: async () => TEST_TENANT_ID,
  };
  return { verifier, identities };
}

function authHeaders(): Record<string, string> {
  return { authorization: 'Bearer test-token' };
}

function createMockRepository() {
  return {
    createOnboarding: vi.fn(),
    findById: vi.fn(),
    findByReiProjectId: vi.fn(),
    markWelcomeSent: vi.fn(),
    markKickoff: vi.fn(),
    deliverQuickWin: vi.fn(),
    recordNPS: vi.fn(),
    listActive: vi.fn(),
  };
}

function makeRecord(overrides: Partial<REIOnboardingRecord> = {}): REIOnboardingRecord {
  const now = new Date().toISOString();
  return {
    id: 'onb-test',
    tenant_id: 'test-tenant',
    rei_project_id: 'proj-1',
    client_name: 'Test Client',
    client_email: 'test@example.com',
    client_company: 'Test Co',
    product_name: 'Test Product',
    product_slug: 'test-product',
    company_slug: 'test-co',
    duration_days: 30,
    type: 'guided',
    avg_ticket_range: '5k-30k',
    cs_lead_name: 'CS Lead',
    cs_lead_email: 'cs@revhackers.com',
    backup_name: null,
    backup_email: null,
    current_phase: 'O3_KICKOFF',
    current_milestone: 'M2_QUICK_WIN',
    welcome_sent_at: null,
    kickoff_at: null,
    quick_win_delivered_at: null,
    nps_d14_score: null,
    mid_review_at: null,
    wrap_up_at: null,
    completed_at: null,
    quick_win_description: null,
    quick_win_url: null,
    quick_win_loom_url: null,
    health_score: 100,
    engagement_rate: 0,
    churn_risk: 'low',
    founder_intervention_required: false,
    notes: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('GET /v1/rei/onboarding/active — days_into_journey calculation', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let route: (req: Request) => Promise<Response | null>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    const { verifier, identities } = makeAuthStubs();
    // Mock in-memory implementa só a superfície usada pelas rotas.
    const repository = mockRepo as unknown as PostgresREIRepository;
    route = createREIRoutes({ repository, verifier, identities });
  });

  it('returns days_into_journey = 0 when no dates are set (defaults to created_at today)', async () => {
    mockRepo.listActive.mockResolvedValueOnce([makeRecord({ created_at: new Date().toISOString() })]);

    const req = new Request('https://api.test/v1/rei/onboarding/active', { method: 'GET', headers: authHeaders() });
    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.data[0].days_into_journey).toBe(0);
  });

  it('calculates days_since from kickoff_at when available', async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    mockRepo.listActive.mockResolvedValueOnce([makeRecord({
      kickoff_at: sevenDaysAgo,
      welcome_sent_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    })]);

    const req = new Request('https://api.test/v1/rei/onboarding/active', { method: 'GET', headers: authHeaders() });
    const res = await route(req);
    const body = (await res?.json()) as any;
    expect(body.data[0].days_into_journey).toBe(7);
  });

  it('falls back to welcome_sent_at when kickoff_at is null', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    mockRepo.listActive.mockResolvedValueOnce([makeRecord({
      kickoff_at: null,
      welcome_sent_at: threeDaysAgo,
    })]);

    const req = new Request('https://api.test/v1/rei/onboarding/active', { method: 'GET', headers: authHeaders() });
    const res = await route(req);
    const body = (await res?.json()) as any;
    expect(body.data[0].days_into_journey).toBe(3);
  });

  it('returns days_into_journey = 0 when kickoff_at is in the future (negative clamped)', async () => {
    const futureDate = new Date(Date.now() + 5 * 86400000).toISOString();
    mockRepo.listActive.mockResolvedValueOnce([makeRecord({ kickoff_at: futureDate })]);

    const req = new Request('https://api.test/v1/rei/onboarding/active', { method: 'GET', headers: authHeaders() });
    const res = await route(req);
    const body = (await res?.json()) as any;
    expect(body.data[0].days_into_journey).toBe(0);
  });

  it('falls back to created_at when both kickoff_at and welcome_sent_at are null', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
    mockRepo.listActive.mockResolvedValueOnce([makeRecord({
      kickoff_at: null,
      welcome_sent_at: null,
      created_at: tenDaysAgo,
    })]);

    const req = new Request('https://api.test/v1/rei/onboarding/active', { method: 'GET', headers: authHeaders() });
    const res = await route(req);
    const body = (await res?.json()) as any;
    expect(body.data[0].days_into_journey).toBe(10);
  });

  it('returns count and data structure correctly with multiple records', async () => {
    mockRepo.listActive.mockResolvedValueOnce([
      makeRecord({ id: 'onb-1', kickoff_at: new Date(Date.now() - 5 * 86400000).toISOString() }),
      makeRecord({ id: 'onb-2', kickoff_at: new Date(Date.now() - 15 * 86400000).toISOString() }),
      makeRecord({ id: 'onb-3', kickoff_at: null, welcome_sent_at: null, created_at: new Date().toISOString() }),
    ]);

    const req = new Request('https://api.test/v1/rei/onboarding/active', { method: 'GET', headers: authHeaders() });
    const res = await route(req);
    const body = (await res?.json()) as any;
    expect(body.count).toBe(3);
    expect(body.data).toHaveLength(3);
    expect(body.data[0].days_into_journey).toBe(5);
    expect(body.data[1].days_into_journey).toBe(15);
    expect(body.data[2].days_into_journey).toBe(0);
  });

  it('handles empty list correctly', async () => {
    mockRepo.listActive.mockResolvedValueOnce([]);

    const req = new Request('https://api.test/v1/rei/onboarding/active', { method: 'GET', headers: authHeaders() });
    const res = await route(req);
    const body = (await res?.json()) as any;
    expect(body.count).toBe(0);
    expect(body.data).toEqual([]);
  });

  it('handles invalid date strings gracefully (NaN check)', async () => {
    mockRepo.listActive.mockResolvedValueOnce([makeRecord({
      kickoff_at: 'invalid-date-string',
      welcome_sent_at: null,
    })]);

    const req = new Request('https://api.test/v1/rei/onboarding/active', { method: 'GET', headers: authHeaders() });
    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.data[0].days_into_journey).toBe(0);
  });
});
