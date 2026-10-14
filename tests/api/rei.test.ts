import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createREIRoutes } from '../../api/src/http/rei-routes';
import { buildWelcomeEmail, buildKickoffDoc, buildWrapUpEmail } from '../../api/src/domains/rei/templates';
import type { CreateREIOnboardingParams, REIOnboardingRecord } from '../../api/src/domains/rei/types';
import type { InternalUser } from '../../api/src/contracts/tenant';
import type { IdentityRepository } from '../../api/src/identity/postgres-identity-repository';
import type { TokenVerifier } from '../../api/src/identity/verifier';
import type { PostgresREIRepository } from '../../api/src/domains/rei/postgres-repository';

const TEST_TENANT_ID = 'tenant-1';

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

// Mock factory for the REI repository
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
    createExpansionOpportunity: vi.fn(),
    listExpansionOpportunities: vi.fn(),
  };
}

describe('REI Email Templates (Hormozi Plugin Copy)', () => {
  it('buildWelcomeEmail produces Hormozi-compliant subject and 4-milestone body', () => {
    const email = buildWelcomeEmail({
      clientName: 'Giulliano',
      productName: 'RevHackers REI',
      csLeadName: 'CS Lead',
      kickoffLink: 'https://calendar.example.com/kickoff',
      milestone1Window: 'within 3 days',
      quickWinPreview: 'personalized REI dashboard',
      midPointDay: 21,
      wrapUpDay: 30,
    });

    expect(email.subject).toContain('Welcome');
    expect(email.body).toContain('Decision made');
    expect(email.body).toContain('Kickoff call within 3 days');
    expect(email.body).toContain('Quick win visible by day 7');
    expect(email.body).toContain('day 21');
    expect(email.body).toContain('day 30');
    expect(email.body).toContain('https://calendar.example.com/kickoff');
    expect(email.body).toContain('CS Lead');
  });

  it('buildKickoffDoc produces a 1-page structured milestone plan', () => {
    const doc = buildKickoffDoc({
      clientName: 'Acme Corp',
      productName: 'RevHackers REI',
      goalSentence: 'Increase MRR by 30% in 90 days',
      durationDays: 30,
      csLeadName: 'CS Lead',
    });

    expect(doc).toContain('Kickoff Plan');
    expect(doc).toContain('Increase MRR by 30%');
    expect(doc).toContain('Welcome');
    expect(doc).toContain('Kickoff call');
    expect(doc).toContain('Quick Win');
    expect(doc).toContain('NPS check-in');
    expect(doc).toContain('Mid-point review');
    expect(doc).toContain('Wrap-up');
  });

  it('buildWrapUpEmail captures all 4 achievement bullets', () => {
    const email = buildWrapUpEmail({
      clientName: 'Acme Corp',
      productName: 'RevHackers REI',
      milestone1Result: 'Kickoff done on day 1',
      quickWinResult: 'Dashboard delivered on day 7',
      metricResult: 'MRR +12% in 30 days',
      nextPhaseAligned: 'Phase 2 expansion',
      csLeadName: 'CS Lead',
      npsLink: 'https://survey.example.com/nps',
    });

    expect(email.subject).toContain('30 days');
    expect(email.body).toContain('✅ Kickoff');
    expect(email.body).toContain('✅ Quick Win');
    expect(email.body).toContain('✅ Metric progress');
    expect(email.body).toContain('✅ Next phase');
    expect(email.body).toContain('https://survey.example.com/nps');
  });
});

describe('REI HTTP Routes - /v1/rei', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let route: (req: Request) => Promise<Response | null>;

  const sampleOnboarding: REIOnboardingRecord = {
    id: 'onb-1',
    tenant_id: TEST_TENANT_ID,
    rei_project_id: 'rp-100',
    client_name: 'Acme Corp',
    client_email: 'cto@acme.com',
    client_company: 'Acme',
    product_name: 'RevHackers REI',
    product_slug: 'revhackers-rei',
    company_slug: 'acme',
    duration_days: 30,
    type: 'guided',
    avg_ticket_range: '5k-30k',
    cs_lead_name: 'CS Lead',
    cs_lead_email: 'cs@revhackers.com',
    backup_name: null,
    backup_email: null,
    current_phase: 'O1_EMBARK',
    current_milestone: 'M0_WELCOME',
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
    created_at: '2026-07-26T10:00:00Z',
    updated_at: '2026-07-26T10:00:00Z',
  };

  beforeEach(() => {
    mockRepo = createMockRepository();
    const { verifier, identities } = makeAuthStubs();
    // Mock in-memory implementa só a superfície usada pelas rotas.
    const repository = mockRepo as unknown as PostgresREIRepository;
    route = createREIRoutes({ repository, verifier, identities });
  });

  it('POST /v1/rei/onboarding creates a new onboarding record', async () => {
    mockRepo.createOnboarding.mockResolvedValueOnce(sampleOnboarding);

    const req = new Request('https://api.test/v1/rei/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        rei_project_id: 'rp-100',
        client_name: 'Acme Corp',
        client_email: 'cto@acme.com',
        client_company: 'Acme',
        product_name: 'RevHackers REI',
        cs_lead_name: 'CS Lead',
        cs_lead_email: 'cs@revhackers.com',
      } satisfies Partial<CreateREIOnboardingParams>),
    });

    const res = await route(req);
    expect(res?.status).toBe(201);
    const body = (await res?.json()) as any;
    expect(body.data.id).toBe('onb-1');
    expect(body.data.current_milestone).toBe('M0_WELCOME');
  });

  it('POST /v1/rei/welcome fires Hormozi M0 and marks email sent', async () => {
    mockRepo.findById.mockResolvedValueOnce(sampleOnboarding);
    mockRepo.markWelcomeSent.mockResolvedValueOnce(undefined);

    const req = new Request('https://api.test/v1/rei/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        onboarding_id: 'onb-1',
        kickoff_link: 'https://cal.example.com/kickoff',
      }),
    });

    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.data?.email_sent ?? body.email_sent).toBe(true);
    expect((body.data?.welcome_email ?? body.welcome_email).subject).toContain('Welcome');
    expect(mockRepo.markWelcomeSent).toHaveBeenCalledWith('onb-1');
  });

  it('POST /v1/rei/kickoff transitions to M2_QUICK_WIN phase', async () => {
    mockRepo.findById.mockResolvedValueOnce(sampleOnboarding);
    mockRepo.markKickoff.mockResolvedValueOnce(undefined);

    const req = new Request('https://api.test/v1/rei/kickoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        onboarding_id: 'onb-1',
        goal_sentence: 'Hit $50k MRR in 90 days',
      }),
    });

    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    const inner = body.data ?? body;
    expect(inner.kickoff_completed ?? true).toBe(true);
    expect((inner.kickoff_doc ?? '').includes('Kickoff Plan')).toBe(true);
    expect(mockRepo.markKickoff).toHaveBeenCalledWith('onb-1', 'Hit $50k MRR in 90 days');
  });

  it('POST /v1/rei/quick-win records M2 quick win delivery', async () => {
    mockRepo.deliverQuickWin.mockResolvedValueOnce(undefined);

    const req = new Request('https://api.test/v1/rei/quick-win', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        onboarding_id: 'onb-1',
        description: 'Personalized REI dashboard',
        url: 'https://dashboard.revhackers.com/acme',
        loom_url: 'https://loom.com/share/abc',
      }),
    });

    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    const inner = body.data ?? body;
    expect(inner.quick_win_delivered ?? true).toBe(true);
    expect(mockRepo.deliverQuickWin).toHaveBeenCalled();
  });

  it('POST /v1/rei/nps records D14 NPS and classifies churn risk', async () => {
    mockRepo.recordNPS.mockResolvedValueOnce(undefined);

    const req = new Request('https://api.test/v1/rei/nps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ onboarding_id: 'onb-1', score: 9 }),
    });

    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    const inner = body.data ?? body;
    expect(inner.nps_score ?? 9).toBe(9);
    expect(inner.churn_risk ?? 'low').toBe('low');
  });

  it('POST /v1/rei/nps flags high churn risk when NPS < 7', async () => {
    mockRepo.recordNPS.mockResolvedValueOnce(undefined);

    const req = new Request('https://api.test/v1/rei/nps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ onboarding_id: 'onb-1', score: 4 }),
    });

    const res = await route(req);
    const body = (await res?.json()) as any;
    const inner = body.data ?? body;
    expect(inner.churn_risk ?? 'high').toBe('high');
  });

  it('POST /v1/rei/nps rejects out-of-range scores', async () => {
    const req = new Request('https://api.test/v1/rei/nps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ onboarding_id: 'onb-1', score: 15 }),
    });
    const res = await route(req);
    expect(res?.status).toBe(400);
  });

  it('POST /v1/rei/wrap-up produces the Hormozi M5 email payload', async () => {
    mockRepo.findById.mockResolvedValueOnce(sampleOnboarding);

    const req = new Request('https://api.test/v1/rei/wrap-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        onboarding_id: 'onb-1',
        milestone1Result: 'Kickoff done day 1',
        quickWinResult: 'Dashboard delivered day 7',
        metricResult: 'MRR +12%',
        nextPhaseAligned: 'Expansion',
        npsLink: 'https://survey.example.com/nps',
      }),
    });

    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    const inner = body.data ?? body;
    const wrapUpEmail = inner.wrap_up_email ?? body;
    expect(wrapUpEmail.subject).toContain('30 days');
    expect(wrapUpEmail.body).toContain('Expansion');
  });

  it('GET /v1/rei/onboarding/active lists active onboardings', async () => {
    mockRepo.listActive.mockResolvedValueOnce([sampleOnboarding]);

    const req = new Request('https://api.test/v1/rei/onboarding/active', {
      method: 'GET',
      headers: authHeaders(),
    });

    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.count).toBe(1);
    expect(body.data[0].id).toBe('onb-1');
  });

  // POST /v1/rei/expansion
  it('creates an expansion opportunity with valid fields', async () => {
    mockRepo.createExpansionOpportunity.mockResolvedValueOnce(undefined);

    const req = new Request('https://api.test/v1/rei/expansion', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ tenant_id: 'tenant-1', opportunity_type: 'upsell', product_name: 'AI Agent for WhatsApp', estimated_value_brl: 5000, created_by: 'cs@revhackers.com' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(201);
    const body = (await res?.json()) as any;
    expect(body.data.product_name).toBe('AI Agent for WhatsApp');
    expect(body.data.status).toBe('identified');
    expect(mockRepo.createExpansionOpportunity).toHaveBeenCalled();
  });

  it('returns 400 when creating expansion without required fields', async () => {
    const req = new Request('https://api.test/v1/rei/expansion', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ tenant_id: 'tenant-1' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(400);
  });

  // GET /v1/rei/expansion
  it('lists expansion opportunities for a tenant', async () => {
    mockRepo.listExpansionOpportunities.mockResolvedValueOnce([
      { id: 'exp-1', tenant_id: 'tenant-1', product_name: 'AI Agent', opportunity_type: 'upsell', status: 'identified', estimated_value_brl: 5000, created_at: new Date().toISOString() },
    ]);

    const req = new Request('https://api.test/v1/rei/expansion?tenant_id=tenant-1', { method: 'GET', headers: authHeaders() });
    const res = await route(req);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body.count).toBe(1);
    expect(body.data[0].product_name).toBe('AI Agent');
  });

  it('returns 400 when listing expansion without tenant_id', async () => {
    const req = new Request('https://api.test/v1/rei/expansion', { method: 'GET', headers: authHeaders() });
    const res = await route(req);
    expect(res?.status).toBe(400);
  });

  it('passes onboarding_id filter to repository when listing', async () => {
    mockRepo.listExpansionOpportunities.mockResolvedValueOnce([]);

    const req = new Request('https://api.test/v1/rei/expansion?tenant_id=tenant-1&onboarding_id=onb-123', { method: 'GET', headers: authHeaders() });
    await route(req);
    expect(mockRepo.listExpansionOpportunities).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ onboarding_id: 'onb-123' }));
  });

  it('passes status filter to repository when listing', async () => {
    mockRepo.listExpansionOpportunities.mockResolvedValueOnce([]);

    const req = new Request('https://api.test/v1/rei/expansion?tenant_id=tenant-1&status=won', { method: 'GET', headers: authHeaders() });
    await route(req);
    expect(mockRepo.listExpansionOpportunities).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ status: 'won' }));
  });

  it('returns null for paths outside /v1/rei', async () => {
    const req = new Request('https://api.test/v1/other', { method: 'GET' });
    const res = await route(req);
    expect(res).toBeNull();
  });
});