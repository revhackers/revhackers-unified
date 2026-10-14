/**
 * Finance HTTP Routes — GCP Cloud Run API.
 *
 * Endpoints expostos:
 *
 *   GET    /v1/finance/entities                       -> lista entidades (holding/brand)
 *   GET    /v1/finance/entities/:slug                 -> detalhe por slug
 *   POST   /v1/finance/entities/:slug                 -> cria/atualiza (admin)
 *   GET    /v1/finance/dre                            -> DRE consolidada ou filtrada (?entity_id)
 *   GET    /v1/finance/dre/by-entity                  -> DRE segmentada por entity
 *   POST   /v1/finance/ledger                         -> cria lançamento manual
 *   POST   /v1/finance/statements/import              -> importa extrato (array | { statements: [...] })
 *   POST   /v1/finance/statements/import/ofx          -> importa OFX (raw text)
 *   POST   /v1/finance/statements/import/csv          -> importa CSV (raw text + options)
 *   GET    /v1/finance/statements/unreconciled        -> lista pendentes (?entity_id)
 *   POST   /v1/finance/reconcile                      -> conciliação manual
 *   POST   /v1/finance/connectors/:provider/sync      -> dispara fetch de um conector
 *   POST   /v1/finance/webhooks/:provider             -> receiver de webhook assinado
 */

import { z } from 'zod';
import { ApiError } from '../contracts/errors';
import type { IdentityRepository } from '../identity/postgres-identity-repository';
import type { TokenVerifier } from '../identity/verifier';
import { AuthMiddleware } from './auth-middleware';
import { InfinitePayConnector } from '../domains/finance/connectors/infinitepay-connector';
import { PagBankConnector } from '../domains/finance/connectors/pagbank-connector';
import { PluggyConnector } from '../domains/finance/connectors/pluggy-connector';
import { StripeConnector } from '../domains/finance/connectors/stripe-connector';
import type { ConnectorNormalizedTxn, FinanceConnector } from '../domains/finance/connectors/types';
import { CsvParser } from '../domains/finance/parsers/csv-parser';
import { OfxParser } from '../domains/finance/parsers/ofx-parser';
import { PostgresFinanceRepository } from '../domains/finance/postgres-repository';
import { ReconciliationEngine } from '../domains/finance/reconciliation-engine';
import type {
  EntityKind,
  FinancialEntityRecord,
} from '../domains/finance/types';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const LedgerCategorySchema = z.enum([
  'mrr_revenue', 'services_revenue', 'taxes',
  'operational_costs', 'net_margin', 'other',
]);
const IdSchema = z.string().trim().min(1, 'ID é obrigatório').max(128).nullable().optional().or(z.literal('').transform(() => undefined));
const RequiredIdSchema = z.string().trim().min(1, 'ID é obrigatório').max(128);
// Aceita ISO 8601 datetime ou date-only (YYYY-MM-DD)
const DateLike = z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Data inválida');

const CreateEntitySchema = z.object({
  name: z.string().trim().min(1, 'Nome da entidade é obrigatório').max(256),
  legal_name: z.string().trim().max(256).optional(),
  cnpj: z.string().trim().max(20).optional(),
  kind: z.enum(['holding', 'brand', 'project']).optional(),
  parent_id: IdSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const CreateLedgerEntrySchema = z.object({
  category: LedgerCategorySchema,
  cost_center: z.string().trim().max(128).optional(),
  opportunity_id: IdSchema.optional(),
  rei_project_id: IdSchema.optional(),
  client_id: IdSchema.optional(),
  description: z.string().trim().min(1, 'Descrição é obrigatória').max(512),
  amount: z.number(),
  competence_date: DateLike,
  due_date: DateLike.optional(),
  is_paid: z.boolean().optional(),
  paid_at: DateLike.optional(),
  entity_id: IdSchema.optional(),
});

const CreateStatementSchema = z.object({
  bank_account_id: IdSchema.optional(),
  transaction_date: DateLike,
  amount: z.number(),
  type: z.enum(['CREDIT', 'DEBIT', 'fee', 'chargeback', 'refund']),
  description: z.string().trim().min(1).max(512),
  bank_transaction_id: z.string().trim().max(256).optional(),
  payer_document: z.string().trim().max(20).optional(),
  payer_name: z.string().trim().max(256).optional(),
  source: z.string().trim().max(64).optional(),
  entity_id: IdSchema.optional(),
  raw_payload: z.record(z.string(), z.unknown()).optional(),
});

const ImportStatementsSchema = z.union([
  z.array(CreateStatementSchema),
  z.object({ statements: z.array(CreateStatementSchema) }),
]);

const OfxImportSchema = z.object({
  raw: z.string().min(1, 'raw OFX é obrigatório'),
  bank_account_id: IdSchema.optional(),
  entity_id: IdSchema.optional(),
});

const CsvImportSchema = z.object({
  raw: z.string().min(1, 'raw CSV é obrigatório'),
  options: z.record(z.string(), z.unknown()).optional(),
  bank_account_id: IdSchema.optional(),
  entity_id: IdSchema.optional(),
});

const ReconcileSchema = z.object({
  statement_id: RequiredIdSchema,
  ledger_entry_id: IdSchema.optional(),
  opportunity_id: IdSchema.optional(),
  notes: z.string().trim().max(1024).optional(),
});

const ConnectorSyncSchema = z.object({
  start_date: DateLike.optional(),
  end_date: DateLike.optional(),
  entity_id: IdSchema.optional(),
});

export interface FinanceRouteDeps {
  repository: PostgresFinanceRepository;
  verifier: TokenVerifier;
  identities: IdentityRepository;
  /** Dependências opcionais — se ausentes, o connector roda com credenciais do env. */
  connectors?: {
    stripe?: StripeConnector;
    infinitepay?: InfinitePayConnector;
    pagbank?: PagBankConnector;
    pluggy?: PluggyConnector;
  };
}

interface WebhookProvider {
  name: string;
  verify(rawBody: string, signatureHeader: string | null): { valid: boolean; reason?: string };
  parse(rawBody: string): ConnectorNormalizedTxn | null;
}

function createWebhookHandlers(): Record<string, WebhookProvider> {
  return {
    stripe: {
      name: 'stripe',
      verify: (rawBody, header) => StripeConnector.verifyWebhookSignature(rawBody, header),
      parse: (rawBody) => {
        try {
          const event = JSON.parse(rawBody) as { type: string; data: { object: Record<string, unknown> } };
          return StripeConnector.normalizeWebhookEvent(event);
        } catch {
          return null;
        }
      },
    },
    infinitepay: {
      name: 'infinitepay',
      verify: (rawBody, header) => InfinitePayConnector.verifyWebhookSignature(rawBody, header),
      parse: (rawBody) => {
        try {
          const event = JSON.parse(rawBody);
          const invoice = (event as { data?: { object?: Record<string, unknown> } }).data?.object
            ?? (event as unknown as Record<string, unknown>);
          return InfinitePayConnector.normalizeInvoice(invoice as never);
        } catch {
          return null;
        }
      },
    },
    pagbank: {
      name: 'pagbank',
      verify: (rawBody, header) => PagBankConnector.verifyWebhookSignature(rawBody, header),
      parse: (rawBody) => {
        try {
          const event = JSON.parse(rawBody);
          const charge = (event as { data?: { object?: Record<string, unknown> } }).data?.object
            ?? (event as unknown as Record<string, unknown>);
          return PagBankConnector.normalizeCharge(charge as never);
        } catch {
          return null;
        }
      },
    },
    pluggy: {
      name: 'pluggy',
      verify: (rawBody, header) => PluggyConnector.verifyWebhookSignature(rawBody, header),
      parse: (rawBody) => {
        try {
          const event = JSON.parse(rawBody) as { type?: string; data?: { transaction?: Record<string, unknown> } };
          const tx = event.data?.transaction;
          if (!tx) return null;
          const amount = Number(tx.amount ?? 0);
          return {
            transaction_date: String(tx.date ?? new Date().toISOString().substring(0, 10)),
            amount: Math.abs(amount),
            type: amount >= 0 ? 'CREDIT' : 'DEBIT',
            description: String(tx.description ?? 'Pluggy transaction'),
            bank_transaction_id: String(tx.id ?? ''),
            payer_document: null,
            payer_name: null,
            source: 'pluggy',
            reconciliation_status: 'PENDING',
            raw_payload: { pluggy_event_type: event.type ?? null },
          };
        } catch {
          return null;
        }
      },
    },
  };
}

export function createFinanceRoutes(deps: FinanceRouteDeps) {
  const auth = new AuthMiddleware(deps);
  const engine = new ReconciliationEngine();
  const webhookHandlers = createWebhookHandlers();
  const connectors = deps.connectors ?? {
    stripe: new StripeConnector(),
    infinitepay: new InfinitePayConnector(),
    pagbank: new PagBankConnector(),
    pluggy: new PluggyConnector(),
  };

  const json = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  function parseBody<T>(raw: unknown, schema: z.ZodType<T>): T {
    const result = schema.safeParse(raw);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const flat = {} as Record<string, string[]>;
      for (const k of Object.keys(fieldErrors)) {
        const v = (fieldErrors as Record<string, unknown>)[k];
        if (Array.isArray(v)) flat[k] = v as string[];
      }
      throw ApiError.validation(`Payload inválido: ${JSON.stringify(flat)}`);
    }
    return result.data;
  }

  function safeJsonParse(req: Request): Promise<unknown> {
    return req.json().catch(() => null);
  }

  return async (req: Request): Promise<Response | null> => {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Webhooks de provedores usam assinatura própria (handler.verify) — sem Bearer.
    const isWebhookPost =
      method === 'POST' && /^\/v1\/finance\/webhooks\/(stripe|infinitepay|pagbank|pluggy)$/.test(path);
    if (!isWebhookPost && path.startsWith('/v1/finance')) {
      const authResult = await auth.authenticate(req);
      if (authResult instanceof Response) return authResult;
    }

    // -------- ENTITIES --------

    if (path === '/v1/finance/entities' && method === 'GET') {
      const kind = url.searchParams.get('kind') as EntityKind | null;
      const entities = await deps.repository.listEntities(kind ?? undefined);
      return json(200, { success: true, entities });
    }

    const entitySlugMatch = path.match(/^\/v1\/finance\/entities\/([a-z0-9_-]+)$/);
    if (entitySlugMatch && method === 'GET') {
      const slug = entitySlugMatch[1]!;
      const entity = await deps.repository.findEntityBySlug(slug);
      if (!entity) throw ApiError.notFound('Entidade não encontrada.');
      return json(200, { success: true, entity });
    }
    if (entitySlugMatch && method === 'POST') {
      const slug = entitySlugMatch[1]!;
      const raw = await safeJsonParse(req);
      const entityParams = parseBody(raw, CreateEntitySchema);
      const entity = await deps.repository.createEntity({
        slug,
        name: entityParams.name,
        legal_name: entityParams.legal_name ?? null,
        cnpj: entityParams.cnpj ?? null,
        kind: (entityParams.kind ?? 'brand') as EntityKind,
        parent_id: entityParams.parent_id ?? null,
        metadata: entityParams.metadata ?? {},
      });
      return json(201, { success: true, entity });
    }

    // -------- DRE --------

    if (path === '/v1/finance/dre' && method === 'GET') {
      const startDate = url.searchParams.get('start_date') ?? '2026-01-01';
      const endDate = url.searchParams.get('end_date') ?? new Date().toISOString().substring(0, 10);
      const entityId = url.searchParams.get('entity_id');
      const dre = await deps.repository.getDREStatement(startDate, endDate, entityId || undefined);
      return json(200, { success: true, dre });
    }

    if (path === '/v1/finance/dre/by-entity' && method === 'GET') {
      const startDate = url.searchParams.get('start_date') ?? '2026-01-01';
      const endDate = url.searchParams.get('end_date') ?? new Date().toISOString().substring(0, 10);
      const entities = await deps.repository.getDREByEntity(startDate, endDate);
      return json(200, { success: true, period: { start: startDate, end: endDate }, entities });
    }

    // -------- LEDGER --------

    if (path === '/v1/finance/ledger' && method === 'POST') {
      const raw = await safeJsonParse(req);
      const body = parseBody(raw, CreateLedgerEntrySchema) as any;
      const entry = await deps.repository.createLedgerEntry(body);
      return json(201, { success: true, entry });
    }

    // -------- STATEMENTS --------

    if (path === '/v1/finance/statements/import' && method === 'POST') {
      const raw = await safeJsonParse(req);
      const parsed = parseBody(raw, ImportStatementsSchema);
      const statementsToImport: any[] = Array.isArray(parsed) ? parsed : parsed.statements;

      const imported: unknown[] = [];
      for (const stmt of statementsToImport) {
        const created = await deps.repository.createStatement(stmt);
        imported.push(created);
      }

      // Auto-reconciliação em background. setImmediate sobrevive o request,
      // mas tarefas de longa duração devem migrar para Cloud Tasks.
      setImmediate(() => { void runAutoReconciliation(deps.repository, engine); });

      return json(201, { success: true, imported_count: imported.length, records: imported });
    }

    if (path === '/v1/finance/statements/import/ofx' && method === 'POST') {
      const raw = await safeJsonParse(req);
      const body = parseBody(raw, OfxImportSchema);
      const parser = new OfxParser();
      const result = parser.parse(body.raw);
      const ingest = await ingestNormalized(
        deps.repository,
        result.txns,
        { bank_account_id: body.bank_account_id || null, entity_id: body.entity_id || null },
      );
      setImmediate(() => { void runAutoReconciliation(deps.repository, engine); });
      return json(201, {
        success: true,
        imported_count: ingest.records.length,
        records: ingest.records,
        ofx: {
          bank_org: result.bank_org,
          account_id: result.account_id,
          currency: result.currency,
        },
      });
    }

    if (path === '/v1/finance/statements/import/csv' && method === 'POST') {
      const raw = await safeJsonParse(req);
      const body = parseBody(raw, CsvImportSchema);
      const parser = new CsvParser();
      const result = parser.parse(body.raw, body.options);
      const ingest = await ingestNormalized(
        deps.repository,
        result.txns,
        { bank_account_id: body.bank_account_id || null, entity_id: body.entity_id || null },
      );
      setImmediate(() => { void runAutoReconciliation(deps.repository, engine); });
      return json(201, {
        success: true,
        imported_count: ingest.records.length,
        records: ingest.records,
        parse_summary: {
          total_rows: result.totalRows,
          skipped_rows: result.skippedRows,
          headers: result.resolvedHeaders,
          mapping: result.effectiveMapping,
        },
      });
    }

    if (path === '/v1/finance/statements/unreconciled' && method === 'GET') {
      const entityId = url.searchParams.get('entity_id');
      const records = await deps.repository.findUnreconciledStatements(entityId || undefined);
      return json(200, { success: true, count: records.length, statements: records });
    }

    if (path === '/v1/finance/reconcile' && method === 'POST') {
      const raw = await safeJsonParse(req);
      const { statement_id, ledger_entry_id, opportunity_id, notes } = parseBody(raw, ReconcileSchema) as any;
      const reconciled = await deps.repository.reconcileMatch(
        statement_id,
        ledger_entry_id ?? null,
        opportunity_id ?? null,
        100,
        'MANUAL',
        'admin_user',
        notes ?? 'Manual reconciliation via Admin Cockpit',
      );
      return json(200, { success: true, reconciliation: reconciled });
    }

    // -------- CONNECTORS (sync) --------

    const connectorSyncMatch = path.match(/^\/v1\/finance\/connectors\/(stripe|infinitepay|pagbank|pluggy)\/sync$/);
    if (connectorSyncMatch && method === 'POST') {
      const provider = connectorSyncMatch[1]!;
      const connector = getConnector(connectors, provider);
      if (!connector?.isConfigured()) {
        throw ApiError.validation(`Connector ${provider} não está configurado.`);
      }
      const raw = await safeJsonParse(req);
      const body = parseBody(raw, ConnectorSyncSchema);
      const endDate = body.end_date ?? new Date().toISOString().substring(0, 10);
      const startDate = body.start_date ?? new Date(Date.now() - 30 * 86_400_000).toISOString().substring(0, 10);

      const result = await connector.fetchTransactions({ startDate, endDate });
      const ingest = await ingestNormalized(
        deps.repository,
        result.txns,
        { entity_id: body.entity_id || null },
      );
      setImmediate(() => { void runAutoReconciliation(deps.repository, engine); });
      return json(201, {
        success: true,
        provider,
        period: { start: startDate, end: endDate },
        fetched: result.txns.length,
        imported_count: ingest.records.length,
        records: ingest.records,
      });
    }

    // -------- WEBHOOKS --------

    const webhookMatch = path.match(/^\/v1\/finance\/webhooks\/(stripe|infinitepay|pagbank|pluggy)$/);
    if (webhookMatch && method === 'POST') {
      const provider = webhookMatch[1] as 'stripe' | 'infinitepay' | 'pagbank' | 'pluggy';
      const handler = webhookHandlers[provider];
      if (!handler) return json(404, { success: false, error: 'unknown_provider' });
      const rawBody = await req.text();
      const signatureHeader = req.headers.get('stripe-signature')
        ?? req.headers.get('x-signature')
        ?? req.headers.get('x-pluggy-signature')
        ?? null;

      const verification = handler.verify(rawBody, signatureHeader);
      if (!verification.valid) {
        return json(401, { success: false, error: 'invalid_signature' });
      }

      const txn = handler.parse(rawBody);
      if (!txn) return json(200, { success: true, ignored: true });

      const created = await deps.repository.createStatement({
        transaction_date: txn.transaction_date,
        amount: txn.amount,
        type: txn.type,
        description: txn.description,
        bank_transaction_id: txn.bank_transaction_id || null,
        payer_document: txn.payer_document || null,
        payer_name: txn.payer_name || null,
        source: txn.source,
        raw_payload: txn.raw_payload || {},
      });

      setImmediate(() => { void runAutoReconciliation(deps.repository, engine); });
      return json(201, { success: true, statement: created });
    }

    return null;
  };
}

// ---------------------- Helpers ----------------------

function getConnector(
  connectors: NonNullable<FinanceRouteDeps['connectors']>,
  provider: string,
): FinanceConnector | undefined {
  switch (provider) {
    case 'stripe': return connectors.stripe;
    case 'infinitepay': return connectors.infinitepay;
    case 'pagbank': return connectors.pagbank;
    case 'pluggy': return connectors.pluggy;
    default: return undefined;
  }
}

async function ingestNormalized(
  repository: PostgresFinanceRepository,
  txns: ConnectorNormalizedTxn[],
  context: { bank_account_id?: string | null; entity_id?: string | null },
): Promise<{ records: unknown[] }> {
  const records: unknown[] = [];
  for (const txn of txns) {
    const created = await repository.createStatement({
      bank_account_id: context.bank_account_id || null,
      transaction_date: txn.transaction_date,
      amount: txn.amount,
      type: txn.type,
      description: txn.description,
      bank_transaction_id: txn.bank_transaction_id || null,
      payer_document: txn.payer_document || null,
      payer_name: txn.payer_name || null,
      source: txn.source,
      entity_id: context.entity_id || null,
      raw_payload: txn.raw_payload || {},
    });
    records.push(created);
  }
  return { records };
}

async function runAutoReconciliation(
  repository: PostgresFinanceRepository,
  engine: ReconciliationEngine,
): Promise<void> {
  try {
    const unreconciled = (await repository.findUnreconciledStatements()) ?? [];
    const openEntries = (await repository.findOpenLedgerEntries()) ?? [];
    if (!Array.isArray(unreconciled) || !Array.isArray(openEntries)) return;
    for (const statement of unreconciled) {
      const match = engine.evaluateMatch(statement, openEntries);
      if (match && match.match_score >= 80) {
        await repository.reconcileMatch(
          match.statement.id,
          match.ledger_entry?.id ?? null,
          match.opportunity_id ?? null,
          match.match_score,
          match.match_rule,
          'auto_reconciliation_engine',
          match.reason,
        );
      }
    }
  } catch (err) {
    console.error('[FinanceRoutes] Background auto-reconciliation error:', err);
  }
}

// Re-export para permitir testes diretos.
export { createWebhookHandlers };
export type { FinancialEntityRecord };
