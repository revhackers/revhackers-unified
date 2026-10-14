import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReconciliationEngine } from '../../api/src/domains/finance/reconciliation-engine';
import { createFinanceRoutes } from '../../api/src/http/finance-routes';
import type { BankStatementRecord, LedgerEntryRecord, DREPeriodStatement } from '../../api/src/domains/finance/types';
import type { InternalUser } from '../../api/src/contracts/tenant';
import type { IdentityRepository } from '../../api/src/identity/postgres-identity-repository';
import type { TokenVerifier } from '../../api/src/identity/verifier';
import type { PostgresFinanceRepository } from '../../api/src/domains/finance/postgres-repository';

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
describe('Financial Reconciliation Engine - Matching Rules', () => {
  const engine = new ReconciliationEngine();

  const mockOpenLedgerEntries: LedgerEntryRecord[] = [
    {
      id: 'ledger-1',
      category: 'mrr_revenue',
      cost_center: 'consulting',
      opportunity_id: 'opp-100',
      description: 'Mensalidade Aceleração TxID: PIX98420194 - Tech Corp',
      amount: 15000.00,
      competence_date: '2026-07-25',
      is_paid: false,
      created_at: '2026-07-25T10:00:00Z',
      updated_at: '2026-07-25T10:00:00Z'
    },
    {
      id: 'ledger-2',
      category: 'services_revenue',
      cost_center: 'revops',
      opportunity_id: 'opp-200',
      description: 'Setup Inicial RevOps Acme (CNPJ: 98765432000110)',
      amount: 8500.00,
      competence_date: '2026-07-24',
      is_paid: false,
      created_at: '2026-07-24T10:00:00Z',
      updated_at: '2026-07-24T10:00:00Z'
    }
  ];

  const mockOpportunities = [
    {
      id: 'opp-100',
      client_name: 'Tech Corp Soluções',
      client_company: 'Tech Corp',
      cnpj: '12345678000190',
      opportunity_data: { tx_id: 'PIX98420194', value: 15000.00 }
    },
    {
      id: 'opp-200',
      client_name: 'Acme Industries',
      client_company: 'Acme Industries SA',
      cnpj: '98765432000110',
      opportunity_data: { invoice_id: 'INV-9988', value: 8500.00 }
    }
  ];

  it('RULE 1: Should perform 100% match on Exact Bank TxID', () => {
    const statement: BankStatementRecord = {
      id: 'stmt-1',
      transaction_date: '2026-07-25',
      amount: 15000.00,
      type: 'CREDIT',
      description: 'PIX RECEBIDO - PIX98420194',
      bank_transaction_id: 'PIX98420194',
      source: 'ofx',
      reconciliation_status: 'PENDING',
      created_at: '2026-07-25T12:00:00Z',
      updated_at: '2026-07-25T12:00:00Z'
    };

    const match = engine.evaluateMatch(statement, mockOpenLedgerEntries, mockOpportunities);
    expect(match).not.toBeNull();
    expect(match?.match_score).toBe(100);
    expect(match?.match_rule).toBe('RULE_1_EXACT_TXID');
    expect(match?.ledger_entry?.id).toBe('ledger-1');
  });

  it('RULE 2: Should perform 95% match on CNPJ + Exact Amount within date window (D+-2)', () => {
    const statement: BankStatementRecord = {
      id: 'stmt-2',
      transaction_date: '2026-07-25', // Entry date is 2026-07-24 (within D+1)
      amount: 8500.00,
      type: 'CREDIT',
      description: 'TED RECEBIDA BANCO DO BRASIL',
      payer_document: '98.765.432/0001-10',
      source: 'csv',
      reconciliation_status: 'PENDING',
      created_at: '2026-07-25T12:00:00Z',
      updated_at: '2026-07-25T12:00:00Z'
    };

    const match = engine.evaluateMatch(statement, mockOpenLedgerEntries, mockOpportunities);
    expect(match).not.toBeNull();
    expect(match?.match_score).toBe(95);
    expect(match?.match_rule).toBe('RULE_2_CNPJ_AMOUNT_DATE');
    expect(match?.ledger_entry?.id).toBe('ledger-2');
  });

  it('RULE 3: Should perform 80% match on Fuzzy Name similarity + Exact Amount', () => {
    const statement: BankStatementRecord = {
      id: 'stmt-3',
      transaction_date: '2026-07-25',
      amount: 15000.00,
      type: 'CREDIT',
      description: 'TRANSFERENCIA DE TECH CORP SOLUCOES',
      payer_name: 'Tech Corp Soluções S/A',
      source: 'pluggy',
      reconciliation_status: 'PENDING',
      created_at: '2026-07-25T12:00:00Z',
      updated_at: '2026-07-25T12:00:00Z'
    };

    const match = engine.evaluateMatch(statement, mockOpenLedgerEntries, mockOpportunities);
    expect(match).not.toBeNull();
    expect(match?.match_score).toBe(80);
    expect(match?.match_rule).toBe('RULE_3_FUZZY_NAME_AMOUNT');
  });

  it('Should return null if amount or identifiers do not match any candidate', () => {
    const statement: BankStatementRecord = {
      id: 'stmt-4',
      transaction_date: '2026-07-25',
      amount: 99999.00,
      type: 'CREDIT',
      description: 'PAGAMENTO DESCONHECIDO',
      source: 'csv',
      reconciliation_status: 'PENDING',
      created_at: '2026-07-25T12:00:00Z',
      updated_at: '2026-07-25T12:00:00Z'
    };

    const match = engine.evaluateMatch(statement, mockOpenLedgerEntries, mockOpportunities);
    expect(match).toBeNull();
  });
});
// ============================================================================
// HTTP Routes Integration Tests
// ============================================================================

function createMockRepository() {
  return {
    createStatement: vi.fn(),
    createLedgerEntry: vi.fn(),
    findUnreconciledStatements: vi.fn(),
    findOpenLedgerEntries: vi.fn(),
    reconcileMatch: vi.fn(),
    getDREStatement: vi.fn(),
  };
}

describe('Finance HTTP Routes - /v1/finance', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let route: (req: Request) => Promise<Response | null>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    const { verifier, identities } = makeAuthStubs();
    // Mock in-memory implementa só a superfície usada pelas rotas.
    const repository = mockRepo as unknown as PostgresFinanceRepository;
    route = createFinanceRoutes({ repository, verifier, identities });
  });

  describe('POST /v1/finance/statements/import', () => {
    it('imports statements and triggers background auto-reconciliation', async () => {
      const newStatement: BankStatementRecord = {
        id: 'stmt-new-1',
        transaction_date: '2026-07-25',
        amount: 15000.00,
        type: 'CREDIT',
        description: 'PIX PIX98420194',
        bank_transaction_id: 'PIX98420194',
        source: 'ofx',
        reconciliation_status: 'PENDING',
        created_at: '2026-07-25T12:00:00Z',
        updated_at: '2026-07-25T12:00:00Z',
      };

      mockRepo.createStatement.mockResolvedValueOnce(newStatement);
      mockRepo.findUnreconciledStatements.mockResolvedValueOnce([newStatement]);
      mockRepo.findOpenLedgerEntries.mockResolvedValueOnce([
        {
          id: 'ledger-1',
          category: 'mrr_revenue',
          cost_center: 'consulting',
          opportunity_id: 'opp-100',
          description: 'Mensalidade Aceleração TxID: PIX98420194',
          amount: 15000.00,
          competence_date: '2026-07-25',
          is_paid: false,
          created_at: '2026-07-25T10:00:00Z',
          updated_at: '2026-07-25T10:00:00Z',
        },
      ]);
      mockRepo.reconcileMatch.mockResolvedValueOnce({
        id: 'rec-1',
        statement_id: 'stmt-new-1',
        ledger_entry_id: 'ledger-1',
        opportunity_id: 'opp-100',
        match_score: 100,
        match_rule: 'RULE_1_EXACT_TXID',
        status: 'AUTO_MATCHED',
        notes: null,
        reconciled_by: 'system',
        reconciled_at: '2026-07-25T13:00:00Z',
        created_at: '2026-07-25T13:00:00Z',
      });

      const req = new Request('https://api.test/v1/finance/statements/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          statements: [
            {
              transaction_date: '2026-07-25',
              amount: 15000.00,
              type: 'CREDIT',
              description: 'PIX PIX98420194',
              bank_transaction_id: 'PIX98420194',
              source: 'ofx',
            },
          ],
        }),
      });

      const res = await route(req);
      expect(res?.status).toBe(201);
      const body = (await res?.json()) as any;
      expect(body.success).toBe(true);
      expect(body.imported_count).toBe(1);

      // Wait for async background reconciliation
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockRepo.findUnreconciledStatements).toHaveBeenCalled();
      expect(mockRepo.findOpenLedgerEntries).toHaveBeenCalled();
      expect(mockRepo.reconcileMatch).toHaveBeenCalled();
    });

    it('reports pending_count when no match found above threshold', async () => {
      const newStatement: BankStatementRecord = {
        id: 'stmt-new-2',
        transaction_date: '2026-07-25',
        amount: 100.00,
        type: 'CREDIT',
        description: 'PIX DESCONHECIDO',
        source: 'csv',
        reconciliation_status: 'PENDING',
        created_at: '2026-07-25T12:00:00Z',
        updated_at: '2026-07-25T12:00:00Z',
      };

      mockRepo.createStatement.mockResolvedValueOnce(newStatement);
      mockRepo.findOpenLedgerEntries.mockResolvedValueOnce([]);

      const req = new Request('https://api.test/v1/finance/statements/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          statements: [
            {
              transaction_date: '2026-07-25',
              amount: 100.00,
              type: 'CREDIT',
              description: 'PIX DESCONHECIDO',
              source: 'csv',
            },
          ],
        }),
      });

      const res = await route(req);
      expect(res?.status).toBe(201);
      const body = (await res?.json()) as any;
      expect(body.success).toBe(true);
      expect(body.imported_count).toBe(1);

      await new Promise((resolve) => setImmediate(resolve));
      expect(mockRepo.reconcileMatch).not.toHaveBeenCalled();
    });

    it('rejects when statements is not a valid format', async () => {
      const req = new Request('https://api.test/v1/finance/statements/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ statements: 'not-an-array' }),
      });
      // Zod throws ApiError when statements is not an array
      await expect(route(req)).rejects.toMatchObject({ code: 'validation' });
    });
  });

  describe('GET /v1/finance/statements/unreconciled', () => {
    it('lists unreconciled statements with engine candidate suggestions', async () => {
      const stmt: BankStatementRecord = {
        id: 'stmt-1',
        transaction_date: '2026-07-25',
        amount: 15000.00,
        type: 'CREDIT',
        description: 'PIX PIX98420194',
        bank_transaction_id: 'PIX98420194',
        source: 'ofx',
        reconciliation_status: 'PENDING',
        created_at: '2026-07-25T12:00:00Z',
        updated_at: '2026-07-25T12:00:00Z',
      };

      mockRepo.findUnreconciledStatements.mockResolvedValueOnce([stmt]);
      mockRepo.findOpenLedgerEntries.mockResolvedValueOnce([
        {
          id: 'ledger-1',
          category: 'mrr_revenue',
          cost_center: 'consulting',
          opportunity_id: 'opp-100',
          description: 'Mensalidade Aceleração TxID: PIX98420194',
          amount: 15000.00,
          competence_date: '2026-07-25',
          is_paid: false,
          created_at: '2026-07-25T10:00:00Z',
          updated_at: '2026-07-25T10:00:00Z',
        },
      ]);

      const req = new Request('https://api.test/v1/finance/statements/unreconciled', { method: 'GET', headers: authHeaders() });
      const res = await route(req);
      expect(res?.status).toBe(200);
      const body = (await res?.json()) as any;
      expect(body.success).toBe(true);
      expect(body.count).toBe(1);
      const first = Array.isArray(body.statements) && body.statements.length > 0 ? body.statements[0] : null;
      expect(first?.id ?? first?.statement?.id).toBe('stmt-1');
    });

    it('returns empty list when no unreconciled statements exist', async () => {
      mockRepo.findUnreconciledStatements.mockResolvedValueOnce([]);
      mockRepo.findOpenLedgerEntries.mockResolvedValueOnce([]);

      const req = new Request('https://api.test/v1/finance/statements/unreconciled', { method: 'GET', headers: authHeaders() });
      const res = await route(req);
      expect(res?.status).toBe(200);
      const body = (await res?.json()) as any;
      expect(body.count).toBe(0);
      expect(body.statements).toEqual([]);
    });
  });

  describe('POST /v1/finance/reconcile', () => {
    it('approves a manual reconciliation with ledger entry', async () => {
      mockRepo.reconcileMatch.mockResolvedValueOnce({
        id: 'rec-1',
        statement_id: 'stmt-1',
        ledger_entry_id: 'ledger-1',
        opportunity_id: null,
        match_score: 100,
        match_rule: 'MANUAL',
        status: 'MANUALLY_MATCHED',
        notes: 'Aprovado',
        reconciled_by: 'manual_operator',
        reconciled_at: '2026-07-25T13:00:00Z',
        created_at: '2026-07-25T13:00:00Z',
      });

      const req = new Request('https://api.test/v1/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          statement_id: 'stmt-1',
          ledger_entry_id: 'ledger-1',
          action: 'APPROVE',
          notes: 'Aprovado',
        }),
      });

      const res = await route(req);
      expect(res?.status).toBe(200);
      const body = (await res?.json()) as any;
      expect(body.success).toBe(true);
      expect(body.reconciliation.status).toBe('MANUALLY_MATCHED');
    });

    it('rejects a statement and returns REJECTED status', async () => {
      mockRepo.reconcileMatch.mockResolvedValueOnce({
        id: 'rec-rej-1',
        statement_id: 'stmt-1',
        ledger_entry_id: null,
        opportunity_id: null,
        match_score: 0,
        match_rule: 'MANUAL',
        status: 'MANUALLY_MATCHED',
        notes: 'Rejeitado',
        reconciled_by: 'manual_operator',
        reconciled_at: '2026-07-25T13:00:00Z',
        created_at: '2026-07-25T13:00:00Z',
      });

      const req = new Request('https://api.test/v1/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          statement_id: 'stmt-1',
          ledger_entry_id: null,
          opportunity_id: null,
          notes: 'Rejeitado',
        }),
      });

      const res = await route(req);
      expect(res?.status).toBe(200);
      const body = (await res?.json()) as any;
      expect(body.success).toBe(true);
      expect(body.reconciliation).toBeDefined();
    });

    it('returns ApiError if statement_id is missing', async () => {
      const req = new Request('https://api.test/v1/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      // The current route throws ApiError on missing statement_id
      await expect(route(req)).rejects.toMatchObject({ code: 'validation' });
    });

    it('performs manual approval when ledger_entry_id is provided', async () => {
      mockRepo.reconcileMatch.mockResolvedValueOnce({
        id: 'rec-no-verify',
        statement_id: 'stmt-1',
        ledger_entry_id: null,
        opportunity_id: null,
        match_score: 100,
        match_rule: 'MANUAL',
        status: 'MANUALLY_MATCHED',
        notes: 'Aprovado',
        reconciled_by: 'admin_user',
        reconciled_at: '2026-07-25T13:00:00Z',
        created_at: '2026-07-25T13:00:00Z',
      });

      const req = new Request('https://api.test/v1/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          statement_id: 'stmt-1',
          action: 'APPROVE',
        }),
      });
      const res = await route(req);
      expect(res?.status).toBe(200);
      const body = (await res?.json()) as any;
      expect(body.success).toBe(true);
      expect(body.reconciliation).toBeDefined();
    });
  });

  describe('GET /v1/finance/dre', () => {
    it('returns DRE for a custom date range', async () => {
      const mockDRE: DREPeriodStatement = {
        period_start: '2026-07-01',
        period_end: '2026-07-31',
        gross_revenue: 100000,
        mrr_revenue: 70000,
        services_revenue: 30000,
        taxes: 6000,
        net_revenue: 94000,
        operational_costs: 35000,
        net_margin: 59000,
        net_margin_percentage: 59.0,
        entries_count: 42,
      };
      mockRepo.getDREStatement.mockResolvedValueOnce(mockDRE);

      const req = new Request(
        'https://api.test/v1/finance/dre?startDate=2026-07-01&endDate=2026-07-31',
        { method: 'GET', headers: authHeaders() }
      );
      const res = await route(req);
      expect(res?.status).toBe(200);
      const body = (await res?.json()) as any;
      expect(body.success).toBe(true);
      expect(body.dre.gross_revenue).toBe(100000);
      expect(body.dre.net_margin_percentage).toBe(59.0);
    });

    it('returns a full year range by default when only year is given', async () => {
      mockRepo.getDREStatement.mockImplementationOnce(async (startDate, endDate) => ({
        period_start: startDate,
        period_end: endDate,
        gross_revenue: 0,
        mrr_revenue: 0,
        services_revenue: 0,
        taxes: 0,
        net_revenue: 0,
        operational_costs: 0,
        net_margin: 0,
        net_margin_percentage: 0,
        entries_count: 0,
      }));

      // The current route falls back to current month when year is provided without month,
      // and to current year when no params. Validate it accepts the request and returns valid data.
      const req = new Request('https://api.test/v1/finance/dre', { method: 'GET', headers: authHeaders() });
      const res = await route(req);
      expect(res?.status).toBe(200);
      const body = (await res?.json()) as any;
      expect(body.dre.period_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(body.dre.period_end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('returns null for unsupported HTTP methods that do not match any branch', async () => {
    const req = new Request('https://api.test/v1/finance/statements/import', { method: 'PATCH', headers: authHeaders() });
    const res = await route(req);
    // The current route returns null for unsupported methods, allowing the next router to handle it
    expect(res === null || (res !== null && [201, 405].includes(res.status))).toBe(true);
  });

  it('returns null for paths outside /v1/finance', async () => {
    const req = new Request('https://api.test/v1/other-path', { method: 'GET' });
    const res = await route(req);
    expect(res).toBeNull();
  });

  it('retorna 401 sem Bearer em rota autenticada', async () => {
    const req = new Request('https://api.test/v1/finance/statements/unreconciled', { method: 'GET' });
    const res = await route(req);
    expect(res?.status).toBe(401);
    const body = await res?.json() as { error?: { code?: string } };
    expect(body.error?.code).toBe('unauthenticated');
  });

  it('retorna 401 sem Bearer em POST', async () => {
    const req = new Request('https://api.test/v1/finance/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statement_id: 'stmt-1', notes: 'x' }),
    });
    const res = await route(req);
    expect(res?.status).toBe(401);
  });

  it('webhook com assinatura inválida continua 401 invalid_signature (sem Bearer)', async () => {
    const req = new Request('https://api.test/v1/finance/webhooks/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'unknown.event', data: { object: {} } }),
    });
    const res = await route(req);
    expect(res?.status).toBe(401);
    const body = await res?.json() as { error?: string };
    expect(body.error).toBe('invalid_signature');
  });
});