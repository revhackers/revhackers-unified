import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createREIRoutes } from '../../api/src/http/rei-routes';
import type { REIOnboardingRecord } from '../../api/src/domains/rei/types';
import type { InternalUser } from '../../api/src/contracts/tenant';
import type { IdentityRepository } from '../../api/src/identity/postgres-identity-repository';
import type { TokenVerifier } from '../../api/src/identity/verifier';
import type { PostgresREIRepository } from '../../api/src/domains/rei/postgres-repository';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory repo mock — implements the public surface used by rei-routes
// ─────────────────────────────────────────────────────────────────────────────

interface ExpansionOpportunity {
  id: string;
  tenant_id: string;
  rei_onboarding_id: string | null;
  project_id: string | null;
  opportunity_type: string;
  product_name: string;
  product_description: string | null;
  estimated_value_brl: number | null;
  ai_reasoning: string | null;
  created_by: string;
  status: string;
  created_at: string;
}

function makeRecord(overrides: Partial<REIOnboardingRecord> = {}): REIOnboardingRecord {
  const base: REIOnboardingRecord = {
    id: 'onb_1',
    tenant_id: 'tenant_a',
    rei_project_id: 'proj_1',
    client_name: 'Acme Corp',
    client_email: 'client@acme.com',
    client_company: 'Acme',
    product_name: 'REI Sprint',
    product_slug: 'rei-sprint',
    company_slug: 'acme',
    duration_days: 30,
    type: 'done-with-you',
    avg_ticket_range: '10k-50k',
    cs_lead_name: 'CS Lead',
    cs_lead_email: 'cs@revhackers.com',
    backup_name: null,
    backup_email: null,
    current_phase: 'O3_KICKOFF',
    current_milestone: 'M1_KICKOFF',
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
    health_score: 80,
    engagement_rate: 0.5,
    churn_risk: 'low',
    founder_intervention_required: false,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
  return { ...base, ...overrides };
}

function createMockRepo() {
  const onboardings = new Map<string, REIOnboardingRecord>();
  const expansions: ExpansionOpportunity[] = [];

  return {
    createOnboarding: vi.fn(async (params: any) => {
      const rec = makeRecord({
        id: `onb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...params,
      });
      onboardings.set(rec.id, rec);
      return rec;
    }),
    findById: vi.fn(async (id: string) => onboardings.get(id) ?? null),
    findByReiProjectId: vi.fn(async (reiProjectId: string) => {
      return Array.from(onboardings.values()).find((o) => o.rei_project_id === reiProjectId) ?? null;
    }),
    markWelcomeSent: vi.fn(async (id: string) => {
      const r = onboardings.get(id);
      if (r) {
        onboardings.set(id, { ...r, welcome_sent_at: new Date().toISOString() });
      }
    }),
    markKickoff: vi.fn(async (id: string, goalSentence: string) => {
      const r = onboardings.get(id);
      if (r) {
        onboardings.set(id, {
          ...r,
          kickoff_at: new Date().toISOString(),
          current_milestone: 'M2_QUICK_WIN',
          notes: goalSentence,
        });
      }
    }),
    deliverQuickWin: vi.fn(async (id: string, payload: any) => {
      const r = onboardings.get(id);
      if (r) {
        onboardings.set(id, {
          ...r,
          quick_win_delivered_at: new Date().toISOString(),
          quick_win_description: payload.description,
          quick_win_url: payload.url,
          quick_win_loom_url: payload.loom_url ?? null,
          current_milestone: 'M3_NPS_D14',
        });
      }
    }),
    recordNPS: vi.fn(async (id: string, score: number) => {
      const r = onboardings.get(id);
      if (r) {
        onboardings.set(id, {
          ...r,
          nps_d14_score: score,
          churn_risk: score < 7 ? 'high' : score < 8 ? 'medium' : 'low',
        });
      }
    }),
    listActive: vi.fn(async () =>
      Array.from(onboardings.values()).filter((o) => o.current_milestone !== 'COMPLETED'),
    ),
    createExpansionOpportunity: vi.fn(async (params: any) => {
      const opp: ExpansionOpportunity = {
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...params,
        status: 'identified',
        created_at: new Date().toISOString(),
      };
      expansions.push(opp);
      return opp;
    }),
    listExpansionOpportunities: vi.fn(async (tenantId: string, options?: { onboarding_id?: string; status?: string; limit?: number }) => {
      let list = expansions.filter((e) => e.tenant_id === tenantId);
      if (options?.onboarding_id) list = list.filter((e) => e.rei_onboarding_id === options.onboarding_id);
      if (options?.status) list = list.filter((e) => e.status === options.status);
      const limit = options?.limit ?? 50;
      return list.slice(0, limit);
    }),
    // Test helpers
    _seed: (rec: REIOnboardingRecord) => onboardings.set(rec.id, rec),
    _getExpansion: (id: string) => expansions.find((e) => e.id === id),
    _expansions: () => expansions,
  };
}

const TEST_TENANT_ID = 'tenant_a';

function makeAuthStubs(tenantId: string = TEST_TENANT_ID): { verifier: TokenVerifier; identities: IdentityRepository } {
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
    memberships: [{ userId: 'user_1', tenantId, role: 'owner', status: 'active' }],
  };
  const identities: IdentityRepository = {
    findUser: async () => user,
    findOrCreateUser: async () => user,
    resolveProjectTenant: async () => tenantId,
  };
  return { verifier, identities };
}

function makeRoute(repo: ReturnType<typeof createMockRepo>, tenantId: string = TEST_TENANT_ID) {
  const { verifier, identities } = makeAuthStubs(tenantId);
  // Mock in-memory implementa só a superfície usada pelas rotas.
  const repository = repo as unknown as PostgresREIRepository;
  return createREIRoutes({ repository, verifier, identities });
}

function jsonRequest(url: string, method: string, body?: unknown, withAuth = true) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (withAuth) headers.authorization = 'Bearer test-token';
  return new Request(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/rei/onboarding
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /v1/rei/onboarding', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let route: ReturnType<typeof makeRoute>;

  beforeEach(() => {
    repo = createMockRepo();
    route = makeRoute(repo);
  });

  it('cria onboarding com payload válido', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/onboarding', 'POST', {
      rei_project_id: 'proj_1',
      client_email: 'client@acme.com',
      cs_lead_email: 'cs@revhackers.com',
      client_name: 'Acme Corp',
      client_company: 'Acme',
      product_name: 'REI Sprint',
      product_slug: 'rei-sprint',
      duration_days: 30,
    }));

    expect(res?.status).toBe(201);
    const body = await res!.json();
    expect(body.data).toBeDefined();
    expect(body.data.client_email).toBe('client@acme.com');
    expect(repo.createOnboarding).toHaveBeenCalledTimes(1);
  });

  it('retorna 400 quando payload é inválido', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/onboarding', 'POST', {
      // rei_project_id ausente
      client_email: 'not-an-email',
      cs_lead_email: 'cs@revhackers.com',
    }));

    expect(res?.status).toBe(400);
    const body = await res!.json();
    expect(body.error.code).toBe('validation_failed');
  });

  it('retorna 400 quando JSON é inválido', async () => {
    const req = new Request('https://api.test/v1/rei/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test-token' },
      body: 'not json',
    });
    const res = await route(req);
    expect(res?.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/rei/welcome
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /v1/rei/welcome', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let route: ReturnType<typeof makeRoute>;

  beforeEach(() => {
    repo = createMockRepo();
    route = makeRoute(repo);
  });

  it('envia email e marca welcome_sent_at', async () => {
    repo._seed(makeRecord({ id: 'onb_1' }));

    const res = await route(jsonRequest('https://api.test/v1/rei/welcome', 'POST', {
      onboarding_id: 'onb_1',
      kickoff_link: 'https://example.com/kickoff',
    }));

    expect(res?.status).toBe(200);
    const body = await res!.json();
    expect(body.data.email_sent).toBe(true);
    expect(body.data.welcome_email).toBeDefined();
    expect(repo.markWelcomeSent).toHaveBeenCalledWith('onb_1');
  });

  it('retorna 400 quando onboarding não existe', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/welcome', 'POST', {
      onboarding_id: 'ghost',
      kickoff_link: 'https://example.com/kickoff',
    }));

    // ApiError.validation mapeado a 400 pelo catch genérico
    expect(res?.status).toBe(400);
    expect(repo.markWelcomeSent).not.toHaveBeenCalled();
  });

  it('retorna 400 quando URL é inválida', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/welcome', 'POST', {
      onboarding_id: 'onb_1',
      kickoff_link: 'not-a-url',
    }));
    expect(res?.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/rei/kickoff
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /v1/rei/kickoff', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let route: ReturnType<typeof makeRoute>;

  beforeEach(() => {
    repo = createMockRepo();
    route = makeRoute(repo);
  });

  it('registra kickoff com goal_sentence', async () => {
    repo._seed(makeRecord({ id: 'onb_1' }));

    const res = await route(jsonRequest('https://api.test/v1/rei/kickoff', 'POST', {
      onboarding_id: 'onb_1',
      goal_sentence: 'Aumentar o MRR em 50% em 90 dias.',
    }));

    expect(res?.status).toBe(200);
    const body = await res!.json();
    expect(body.data.kickoff_completed).toBe(true);
    expect(body.data.kickoff_doc).toBeDefined();
    expect(repo.markKickoff).toHaveBeenCalledWith('onb_1', 'Aumentar o MRR em 50% em 90 dias.');
  });

  it('retorna 400 quando goal_sentence tem menos de 10 chars', async () => {
    repo._seed(makeRecord({ id: 'onb_1' }));
    const res = await route(jsonRequest('https://api.test/v1/rei/kickoff', 'POST', {
      onboarding_id: 'onb_1',
      goal_sentence: 'curto',
    }));
    expect(res?.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/rei/quick-win
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /v1/rei/quick-win', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let route: ReturnType<typeof makeRoute>;

  beforeEach(() => {
    repo = createMockRepo();
    route = makeRoute(repo);
  });

  it('registra quick win com loom_url opcional', async () => {
    repo._seed(makeRecord({ id: 'onb_1' }));

    const res = await route(jsonRequest('https://api.test/v1/rei/quick-win', 'POST', {
      onboarding_id: 'onb_1',
      description: 'Configuramos o funil completo de captação.',
      url: 'https://example.com/dashboard',
      loom_url: 'https://loom.com/share/abc',
    }));

    expect(res?.status).toBe(200);
    expect(repo.deliverQuickWin).toHaveBeenCalledWith('onb_1', {
      description: 'Configuramos o funil completo de captação.',
      url: 'https://example.com/dashboard',
      loom_url: 'https://loom.com/share/abc',
    });
  });

  it('aceita quick win sem loom_url', async () => {
    repo._seed(makeRecord({ id: 'onb_1' }));
    const res = await route(jsonRequest('https://api.test/v1/rei/quick-win', 'POST', {
      onboarding_id: 'onb_1',
      description: 'Quick win básico.',
      url: 'https://example.com/dashboard',
    }));
    expect(res?.status).toBe(200);
    expect(repo.deliverQuickWin).toHaveBeenCalledWith('onb_1', {
      description: 'Quick win básico.',
      url: 'https://example.com/dashboard',
      loom_url: undefined,
    });
  });

  it('retorna 400 quando URL é inválida', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/quick-win', 'POST', {
      onboarding_id: 'onb_1',
      description: 'desc',
      url: 'not a url',
    }));
    expect(res?.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/rei/nps
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /v1/rei/nps', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let route: ReturnType<typeof makeRoute>;

  beforeEach(() => {
    repo = createMockRepo();
    route = makeRoute(repo);
  });

  it('marca NPS alto como churn_risk=low', async () => {
    repo._seed(makeRecord({ id: 'onb_1' }));
    const res = await route(jsonRequest('https://api.test/v1/rei/nps', 'POST', {
      onboarding_id: 'onb_1',
      score: 9,
    }));

    expect(res?.status).toBe(200);
    const body = await res!.json();
    expect(body.data.churn_risk).toBe('low');
    expect(body.data.nps_score).toBe(9);
  });

  it('marca NPS médio como churn_risk=medium', async () => {
    repo._seed(makeRecord({ id: 'onb_1' }));
    const res = await route(jsonRequest('https://api.test/v1/rei/nps', 'POST', {
      onboarding_id: 'onb_1',
      score: 7,
    }));
    const body = await res!.json();
    expect(body.data.churn_risk).toBe('medium');
  });

  it('marca NPS baixo como churn_risk=high', async () => {
    repo._seed(makeRecord({ id: 'onb_1' }));
    const res = await route(jsonRequest('https://api.test/v1/rei/nps', 'POST', {
      onboarding_id: 'onb_1',
      score: 3,
    }));
    const body = await res!.json();
    expect(body.data.churn_risk).toBe('high');
  });

  it('retorna 400 quando score está fora de 0-10', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/nps', 'POST', {
      onboarding_id: 'onb_1',
      score: 11,
    }));
    expect(res?.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/rei/onboarding/active
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /v1/rei/onboarding/active', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let route: ReturnType<typeof makeRoute>;

  beforeEach(() => {
    repo = createMockRepo();
    route = makeRoute(repo);
  });

  it('retorna lista de onboardings ativos com days_into_journey', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    repo._seed(makeRecord({ id: 'onb_1', kickoff_at: yesterday }));
    repo._seed(makeRecord({ id: 'onb_2', current_milestone: 'COMPLETED' }));

    const res = await route(jsonRequest('https://api.test/v1/rei/onboarding/active', 'GET'));

    expect(res?.status).toBe(200);
    const body = await res!.json();
    expect(body.count).toBe(1);
    expect(body.data[0].id).toBe('onb_1');
    expect(body.data[0].days_into_journey).toBeGreaterThanOrEqual(1);
  });

  it('retorna count=0 quando não há onboardings ativos', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/onboarding/active', 'GET'));
    expect(res?.status).toBe(200);
    const body = await res!.json();
    expect(body.count).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/rei/wrap-up
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /v1/rei/wrap-up', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let route: ReturnType<typeof makeRoute>;

  beforeEach(() => {
    repo = createMockRepo();
    route = makeRoute(repo);
  });

  it('gera wrap-up email', async () => {
    repo._seed(makeRecord({ id: 'onb_1' }));
    const res = await route(jsonRequest('https://api.test/v1/rei/wrap-up', 'POST', {
      onboarding_id: 'onb_1',
      milestone1Result: 'Kickoff concluído em D1.',
      quickWinResult: 'Dashboard entregue em D7.',
      metricResult: 'Pipeline +120% em D21.',
      nextPhaseAligned: 'Expansão focada em upsell.',
      npsLink: 'https://example.com/nps',
    }));

    expect(res?.status).toBe(200);
    const body = await res!.json();
    expect(body.data.wrap_up_email).toBeDefined();
    expect(body.data.expansion_opportunities_created).toBe(0);
  });

  it('retorna 404 quando onboarding não existe', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/wrap-up', 'POST', {
      onboarding_id: 'ghost',
      milestone1Result: 'x',
      quickWinResult: 'y',
      metricResult: 'z',
      nextPhaseAligned: 'w',
      npsLink: 'https://example.com/nps',
    }));

    expect(res?.status).toBe(404);
  });

  it('cria expansion opportunities de cada suggestion', async () => {
    repo._seed(makeRecord({ id: 'onb_1' }));
    const res = await route(jsonRequest('https://api.test/v1/rei/wrap-up', 'POST', {
      onboarding_id: 'onb_1',
      milestone1Result: 'm1',
      quickWinResult: 'm2',
      metricResult: 'm3',
      nextPhaseAligned: 'm4',
      npsLink: 'https://example.com/nps',
      expansion_suggestions: [
        { product_name: 'AI Sprint', opportunity_type: 'upsell', estimated_value_brl: 25000 },
        { product_name: 'Referral Bonus', opportunity_type: 'referral' },
      ],
    }));

    expect(res?.status).toBe(200);
    const body = await res!.json();
    expect(body.data.expansion_opportunities_created).toBe(2);
    expect(body.data.expansion_opportunities_failed).toBe(0);
    expect(repo._expansions().length).toBe(2);
  });

  it('continua processando sugestões quando uma falha', async () => {
    repo._seed(makeRecord({ id: 'onb_1' }));

    // Forçar createExpansionOpportunity a falhar na primeira chamada
    let count = 0;
    repo.createExpansionOpportunity.mockImplementation(async (params: any) => {
      count++;
      if (count === 1) throw new Error('boom');
      return {
        id: `exp_${count}`,
        ...params,
        status: 'identified',
        created_at: new Date().toISOString(),
      };
    });

    const res = await route(jsonRequest('https://api.test/v1/rei/wrap-up', 'POST', {
      onboarding_id: 'onb_1',
      milestone1Result: 'm1',
      quickWinResult: 'm2',
      metricResult: 'm3',
      nextPhaseAligned: 'm4',
      npsLink: 'https://example.com/nps',
      expansion_suggestions: [
        { product_name: 'A' },
        { product_name: 'B' },
      ],
    }));

    expect(res?.status).toBe(200);
    const body = await res!.json();
    expect(body.data.expansion_opportunities_created).toBe(1);
    expect(body.data.expansion_opportunities_failed).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/rei/expansion
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /v1/rei/expansion', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let route: ReturnType<typeof makeRoute>;

  beforeEach(() => {
    repo = createMockRepo();
    route = makeRoute(repo);
  });

  it('cria expansion opportunity sem onboarding', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/expansion', 'POST', {
      tenant_id: 'tenant_a',
      opportunity_type: 'upsell',
      product_name: 'Premium Tier',
      product_description: 'Tier premium',
      estimated_value_brl: 50000,
      ai_reasoning: 'Cliente engajado',
      created_by: 'cs@revhackers.com',
    }));

    expect(res?.status).toBe(201);
    const body = await res!.json();
    expect(body.data.tenant_id).toBe('tenant_a');
    expect(body.data.product_name).toBe('Premium Tier');
    expect(body.data.status).toBe('identified');
    expect(repo.createExpansionOpportunity).toHaveBeenCalledTimes(1);
  });

  it('retorna 400 quando opportunity_type é inválido', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/expansion', 'POST', {
      tenant_id: 'tenant_a',
      opportunity_type: 'invalid_type',
      product_name: 'x',
      created_by: 'cs@revhackers.com',
    }));
    expect(res?.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/rei/expansion
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /v1/rei/expansion', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let route: ReturnType<typeof makeRoute>;

  beforeEach(() => {
    repo = createMockRepo();
    route = makeRoute(repo);
  });

  it('lista oportunidades filtradas por tenant_id', async () => {
    const res = await route(jsonRequest(
      'https://api.test/v1/rei/expansion?tenant_id=tenant_a',
      'GET',
    ));
    expect(res?.status).toBe(200);
    expect(repo.listExpansionOpportunities).toHaveBeenCalledWith('tenant_a', {});
  });

  it('aceita filtros opcionais', async () => {
    const res = await route(jsonRequest(
      'https://api.test/v1/rei/expansion?tenant_id=tenant_a&onboarding_id=onb_1&status=identified',
      'GET',
    ));
    expect(res?.status).toBe(200);
    expect(repo.listExpansionOpportunities).toHaveBeenCalledWith('tenant_a', {
      onboarding_id: 'onb_1',
      status: 'identified',
    });
  });

  it('retorna 400 quando tenant_id falta', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/expansion', 'GET'));
    expect(res?.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('routing edge cases', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let route: ReturnType<typeof makeRoute>;

  beforeEach(() => {
    repo = createMockRepo();
    route = makeRoute(repo);
  });

  it('retorna null para path não relacionado a /v1/rei', async () => {
    const res = await route(jsonRequest('https://api.test/v1/other/thing', 'GET'));
    expect(res).toBeNull();
  });

  it('retorna 405 quando método não é suportado', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/onboarding', 'PATCH'));
    expect(res?.status).toBe(405);
    const body = await res!.json();
    expect(body.error.code).toBe('method_not_allowed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gate de autenticação (401) e isolamento de tenant (403)
// ─────────────────────────────────────────────────────────────────────────────

describe('auth gate /v1/rei', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let route: ReturnType<typeof makeRoute>;

  beforeEach(() => {
    repo = createMockRepo();
    route = makeRoute(repo);
  });

  it('retorna 401 sem Bearer em rota autenticada', async () => {
    const res = await route(
      jsonRequest('https://api.test/v1/rei/onboarding/active', 'GET', undefined, false),
    );
    expect(res?.status).toBe(401);
    const body = await res!.json();
    expect(body.error.code).toBe('unauthenticated');
  });

  it('retorna 401 sem Bearer em POST', async () => {
    const res = await route(
      jsonRequest('https://api.test/v1/rei/nps', 'POST', { onboarding_id: 'onb_1', score: 9 }, false),
    );
    expect(res?.status).toBe(401);
  });

  it('retorna 403 ao acessar onboarding de outro tenant (welcome)', async () => {
    repo._seed(makeRecord({ id: 'onb_outro', tenant_id: 'tenant_b' }));
    const res = await route(jsonRequest('https://api.test/v1/rei/welcome', 'POST', {
      onboarding_id: 'onb_outro',
      kickoff_link: 'https://example.com/kickoff',
    }));
    expect(res?.status).toBe(403);
    const body = await res!.json();
    expect(body.error.code).toBe('forbidden');
    expect(repo.markWelcomeSent).not.toHaveBeenCalled();
  });

  it('retorna 403 ao registrar NPS em onboarding de outro tenant', async () => {
    repo._seed(makeRecord({ id: 'onb_outro', tenant_id: 'tenant_b' }));
    const res = await route(jsonRequest('https://api.test/v1/rei/nps', 'POST', {
      onboarding_id: 'onb_outro',
      score: 9,
    }));
    expect(res?.status).toBe(403);
    expect(repo.recordNPS).not.toHaveBeenCalled();
  });

  it('retorna 403 no wrap-up de outro tenant', async () => {
    repo._seed(makeRecord({ id: 'onb_outro', tenant_id: 'tenant_b' }));
    const res = await route(jsonRequest('https://api.test/v1/rei/wrap-up', 'POST', {
      onboarding_id: 'onb_outro',
      milestone1Result: 'm1',
      quickWinResult: 'm2',
      metricResult: 'm3',
      nextPhaseAligned: 'm4',
      npsLink: 'https://example.com/nps',
    }));
    expect(res?.status).toBe(403);
  });

  it('retorna 403 em POST /v1/rei/expansion com tenant divergente', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/expansion', 'POST', {
      tenant_id: 'tenant_b',
      opportunity_type: 'upsell',
      product_name: 'Premium Tier',
      created_by: 'cs@revhackers.com',
    }));
    expect(res?.status).toBe(403);
    expect(repo.createExpansionOpportunity).not.toHaveBeenCalled();
  });

  it('retorna 403 em GET /v1/rei/expansion com tenant divergente', async () => {
    const res = await route(jsonRequest('https://api.test/v1/rei/expansion?tenant_id=tenant_b', 'GET'));
    expect(res?.status).toBe(403);
    expect(repo.listExpansionOpportunities).not.toHaveBeenCalled();
  });
});
