import { readFileSync } from 'node:fs';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { CollectStage, DiagnosticInput } from '../../src/stages.js';
import { computeUnitEconomics } from '../../src/compute/unitEconomics.js';

type Value = string | number | null;

/** Statement com a mesma superfície usada pelo Worker: bind, first, all, run. Roda SQL real em SQLite. */
class FakeStatement {
  private values: Value[] = [];

  constructor(private readonly stmt: StatementSync) {}

  bind(...values: Value[]): FakeStatement {
    this.values = values;
    return this;
  }

  async first<T>(): Promise<T | null> {
    const row = this.stmt.get(...this.values);
    return row === undefined ? null : (row as unknown as T);
  }

  async all<T>(): Promise<{ results: T[]; success: true; meta: object }> {
    return { results: this.stmt.all(...this.values) as unknown as T[], success: true, meta: {} };
  }

  async run(): Promise<{ success: true; meta: { changes: number } }> {
    const info = this.stmt.run(...this.values);
    return { success: true, meta: { changes: Number(info.changes) } };
  }
}

export interface FakeD1 {
  db: D1Database;
  sql: DatabaseSync;
}

/** D1 em memória com a migração real aplicada. */
export function createFakeD1(): FakeD1 {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../../migrations/0001_init.sql', import.meta.url), 'utf8'));
  const db = { prepare: (query: string) => new FakeStatement(sql.prepare(query)) };
  return { db: db as unknown as D1Database, sql };
}

export interface FakeWorkflow {
  binding: Env['GTM_WORKFLOW'];
  created: Array<{ id: string; params: unknown }>;
}

/** Binding de Workflow em memória. Com `failCreate`, `create` sempre falha. */
export function createFakeWorkflow(options: { failCreate?: boolean } = {}): FakeWorkflow {
  const ids = new Set<string>();
  const created: Array<{ id: string; params: unknown }> = [];
  const binding = {
    async create(instance: { id: string; params: unknown }) {
      if (options.failCreate) throw new Error('workflow_indisponivel');
      if (ids.has(instance.id)) throw new Error('instance.already_exists');
      ids.add(instance.id);
      created.push(instance);
      return { id: instance.id };
    },
    async get(id: string) {
      if (!ids.has(id)) throw new Error('instance.not_found');
      return { id };
    },
  };
  return { binding: binding as unknown as Env['GTM_WORKFLOW'], created };
}

export function createTestEnv(db: D1Database, workflow: Env['GTM_WORKFLOW'], overrides: Record<string, string> = {}): Env {
  const vars: Record<string, string> = {
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'chave-teste',
    AWS_SECRET_ACCESS_KEY: 'segredo-teste',
    DAILY_LIMIT: '40',
    PER_IP_DAILY_LIMIT: '3',
    TURNSTILE_SECRET: 'segredo-turnstile',
    IP_HASH_SALT: 'sal-teste',
    ALLOWED_ORIGINS: 'https://revhackers.com.br,https://www.revhackers.com.br',
    ...overrides,
  };
  return { ...vars, DB: db, GTM_WORKFLOW: workflow } as unknown as Env;
}

/** Turnstile simulado: responde `success` e registra as chamadas. */
export function turnstileFetch(success: boolean, calls: Array<{ url: string; body: unknown }> = []): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), body: init?.body });
    return new Response(JSON.stringify({ success }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

export const VALID_BODY = {
  companyName: 'Acme Ltda',
  websiteUrl: 'https://acme.com.br',
  declaredPhase: 'Primeira Tração Validada',
  competitors: [],
  turnstileToken: 'token-de-teste',
};

export function postDiagnostic(body: unknown, ip = '203.0.113.10'): Request {
  return new Request('https://revhackers.com.br/api/gtm/diagnostics', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://revhackers.com.br', 'CF-Connecting-IP': ip },
    body: JSON.stringify(body),
  });
}

export function diagnosticInput(overrides: Partial<DiagnosticInput> = {}): DiagnosticInput {
  return {
    companyName: 'Acme Ltda',
    websiteUrl: 'https://acme.com.br/',
    declaredPhase: 'Primeira Tração Validada',
    competitors: [],
    ...overrides,
  };
}

/** Coleta mínima sem evidências: basta para o relatório montar só a etapa de coleta. */
export function collectFixture(gaps: string[] = []): CollectStage {
  return {
    evidences: [],
    citable: [],
    gaps,
    competitors: [],
    signals: [],
    unitEconomics: computeUnitEconomics(undefined),
    somAnual: null,
    cnpj: { ageYears: null, porte: null, uf: null },
  };
}
