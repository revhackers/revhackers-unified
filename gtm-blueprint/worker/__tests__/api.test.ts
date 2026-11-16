import { beforeEach, describe, expect, it } from 'vitest';
import { handleGtmApi, type ApiDeps } from '../api.js';
import { saveStage } from '../store.js';
import {
  collectFixture,
  createFakeD1,
  createFakeWorkflow,
  createTestEnv,
  diagnosticInput,
  postDiagnostic,
  turnstileFetch,
  VALID_BODY,
  type FakeD1,
  type FakeWorkflow,
} from './fixtures.js';

const ORIGIN = 'https://revhackers.com.br';
const BASE = 'https://revhackers.com.br/api/gtm/diagnostics';

let fake: FakeD1;
let workflow: FakeWorkflow;
let env: Env;
let counter = 0;
let turnstileCalls: Array<{ url: string; body: unknown }>;

function deps(overrides: ApiDeps = {}): ApiDeps {
  return {
    fetch: turnstileFetch(true, turnstileCalls),
    now: () => new Date('2026-11-16T12:00:00.000Z'),
    newId: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`,
    ...overrides,
  };
}

async function create(body: unknown = VALID_BODY, ip = '203.0.113.10', overrides: ApiDeps = {}): Promise<Response> {
  return handleGtmApi(postDiagnostic(body, ip), env, deps(overrides));
}

async function createdId(): Promise<string> {
  const res = await create();
  const data = (await res.json()) as { id: string };
  return data.id;
}

function setStatus(id: string, status: string): void {
  fake.sql.prepare('UPDATE diagnostics SET status = ? WHERE id = ?').run(status, id);
}

beforeEach(() => {
  fake = createFakeD1();
  workflow = createFakeWorkflow();
  env = createTestEnv(fake.db, workflow.binding);
  turnstileCalls = [];
});

describe('CORS', () => {
  it('OPTIONS de origem permitida responde 204 com Allow-Origin', async () => {
    const res = await handleGtmApi(new Request(BASE, { method: 'OPTIONS', headers: { origin: ORIGIN } }), env, deps());
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  });

  it('OPTIONS de origem não listada responde 204 sem Allow-Origin', async () => {
    const res = await handleGtmApi(new Request(BASE, { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), env, deps());
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('respostas JSON carregam Content-Type e não são cacheadas', async () => {
    const res = await handleGtmApi(new Request(`${BASE}/00000000-0000-4000-8000-000000000001`), env, deps());
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('POST /api/gtm/diagnostics', () => {
  it('cria o diagnóstico em coletando, enfileira a coleta e responde 201 com o id', async () => {
    const res = await create();
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: string };

    const row = fake.sql.prepare('SELECT status, ip_hash, input_json FROM diagnostics WHERE id = ?').get(id) as Record<string, string>;
    expect(row.status).toBe('coletando');
    expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.input_json).not.toContain('token-de-teste');
    expect(row.input_json).not.toContain('203.0.113.10');
    expect(workflow.created).toEqual([{ id, params: { id, phase: 'collect' } }]);
  });

  it('chama o siteverify do Turnstile uma vez por POST', async () => {
    await create();
    expect(turnstileCalls).toHaveLength(1);
    expect(turnstileCalls[0].url).toContain('siteverify');
  });

  it('URL privada no site responde 400 url_invalida sem gravar, sem chamar Turnstile', async () => {
    const res = await create({ ...VALID_BODY, websiteUrl: 'http://127.0.0.1' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'url_invalida' });
    expect(turnstileCalls).toHaveLength(0);
    expect(workflow.created).toHaveLength(0);
  });

  it('URL privada em concorrente responde 400 url_invalida', async () => {
    const res = await create({ ...VALID_BODY, competitors: ['http://localhost:3000'] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'url_invalida' });
  });

  it('forma inválida responde 400 entrada_invalida', async () => {
    const res = await create({ ...VALID_BODY, declaredPhase: 'Outra' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'entrada_invalida' });
  });

  it('corpo que não é JSON responde 400 entrada_invalida', async () => {
    const req = new Request(BASE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nao-json' });
    const res = await handleGtmApi(req, env, deps());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'entrada_invalida' });
  });

  it('corpo acima do teto responde 400 sem ler o conteúdo', async () => {
    const req = new Request(BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '999999' },
      body: '{}',
    });
    const res = await handleGtmApi(req, env, deps());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'entrada_invalida' });
  });

  it('Turnstile reprovado responde 403 verificacao_falhou sem gravar', async () => {
    const res = await create(VALID_BODY, '203.0.113.10', { fetch: turnstileFetch(false) });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'verificacao_falhou' });
    expect(workflow.created).toHaveLength(0);
  });

  it('o quarto diagnóstico do mesmo IP responde 429 limite_diario', async () => {
    for (let i = 0; i < 3; i++) expect((await create()).status).toBe(201);
    const res = await create();
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'limite_diario' });
  });

  it('o limite por IP não bloqueia outro IP', async () => {
    for (let i = 0; i < 3; i++) await create();
    expect((await create(VALID_BODY, '198.51.100.7')).status).toBe(201);
  });

  it('o limite total do dia bloqueia qualquer IP', async () => {
    env = createTestEnv(fake.db, workflow.binding, { DAILY_LIMIT: '2' });
    expect((await create(VALID_BODY, '198.51.100.1')).status).toBe(201);
    expect((await create(VALID_BODY, '198.51.100.2')).status).toBe(201);
    expect((await create(VALID_BODY, '198.51.100.3')).status).toBe(429);
  });

  it('falha ao enfileirar marca o diagnóstico como falhou e responde 500', async () => {
    workflow = createFakeWorkflow({ failCreate: true });
    env = createTestEnv(fake.db, workflow.binding);
    const res = await create();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'falha_interna' });
    const row = fake.sql.prepare('SELECT status, error_code FROM diagnostics').get() as Record<string, string>;
    expect(row).toEqual({ status: 'falhou', error_code: 'falha_interna' });
  });
});

describe('GET /api/gtm/diagnostics/:id', () => {
  it('id inexistente responde 404', async () => {
    const res = await handleGtmApi(new Request(`${BASE}/00000000-0000-4000-8000-000000000099`), env, deps());
    expect(res.status).toBe(404);
  });

  it('id mal formado responde 404 sem consultar o banco', async () => {
    const res = await handleGtmApi(new Request(`${BASE}/abc`), env, deps());
    expect(res.status).toBe(404);
  });

  it('logo depois do POST: status coletando, progresso zero e empresa preenchida', async () => {
    const id = await createdId();
    const res = await handleGtmApi(new Request(`${BASE}/${id}`), env, deps());
    const body = (await res.json()) as { id: string; status: string; errorCode: unknown; report: { progresso: { concluidas: number }; empresa: { nome: string; site: string }; tese: unknown } };
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ id, status: 'coletando', errorCode: null });
    expect(body.report.progresso.concluidas).toBe(0);
    expect(body.report.empresa).toEqual({ nome: 'Acme Ltda', site: 'https://acme.com.br/', faseDeclarada: 'Primeira Tração Validada' });
    expect(body.report.tese).toBeNull();
  });

  it('com a coleta gravada, conta a etapa de coleta e lista as lacunas', async () => {
    const id = await createdId();
    await saveStage(fake.db, id, 'collect', collectFixture(['CNPJ não consultado: HTTP 503']), '2026-11-16T12:01:00.000Z');
    const res = await handleGtmApi(new Request(`${BASE}/${id}`), env, deps());
    const body = (await res.json()) as { report: { progresso: { concluidas: number }; lacunasDeColeta: string[] } };
    expect(body.report.progresso.concluidas).toBe(1);
    expect(body.report.lacunasDeColeta).toContain('CNPJ não consultado: HTTP 503');
  });

  it('módulo gravado como failed aparece como seção indisponível', async () => {
    const id = await createdId();
    await saveStage(fake.db, id, 'icp_mercado', { failed: true, error: 'boom' }, '2026-11-16T12:02:00.000Z');
    const res = await handleGtmApi(new Request(`${BASE}/${id}`), env, deps());
    const body = (await res.json()) as { report: { secoes: Array<{ id: string; status: string }> } };
    expect(body.report.secoes.find((s) => s.id === 'icp_mercado')?.status).toBe('indisponivel');
  });
});

describe('POST /api/gtm/diagnostics/:id/unlock', () => {
  it('em aguardando_contato: vira gerando, grava unlocked_at e inicia a análise', async () => {
    const id = await createdId();
    setStatus(id, 'aguardando_contato');

    const res = await handleGtmApi(new Request(`${BASE}/${id}/unlock`, { method: 'POST' }), env, deps());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const row = fake.sql.prepare('SELECT status, unlocked_at FROM diagnostics WHERE id = ?').get(id) as Record<string, string>;
    expect(row).toEqual({ status: 'gerando', unlocked_at: '2026-11-16T12:00:00.000Z' });
    expect(workflow.created.at(-1)).toEqual({ id: `${id}-analyze`, params: { id, phase: 'analyze' } });
  });

  it('desbloquear de novo não reinicia a análise nem falha', async () => {
    const id = await createdId();
    setStatus(id, 'aguardando_contato');
    const req = () => new Request(`${BASE}/${id}/unlock`, { method: 'POST' });

    expect((await handleGtmApi(req(), env, deps())).status).toBe(200);
    expect((await handleGtmApi(req(), env, deps())).status).toBe(200);
    expect(workflow.created.filter((c) => c.id === `${id}-analyze`)).toHaveLength(1);
  });

  it('durante a coleta: grava unlocked_at, mantém coletando e inicia a análise', async () => {
    const id = await createdId();
    await handleGtmApi(new Request(`${BASE}/${id}/unlock`, { method: 'POST' }), env, deps());
    const row = fake.sql.prepare('SELECT status, unlocked_at FROM diagnostics WHERE id = ?').get(id) as Record<string, string>;
    expect(row.status).toBe('coletando');
    expect(row.unlocked_at).toBe('2026-11-16T12:00:00.000Z');
    expect(workflow.created.some((c) => c.id === `${id}-analyze`)).toBe(true);
  });

  it('em pronto não inicia nova análise', async () => {
    const id = await createdId();
    setStatus(id, 'pronto');
    const res = await handleGtmApi(new Request(`${BASE}/${id}/unlock`, { method: 'POST' }), env, deps());
    expect(res.status).toBe(200);
    expect(workflow.created.some((c) => c.id === `${id}-analyze`)).toBe(false);
  });

  it('id inexistente responde 404', async () => {
    const res = await handleGtmApi(new Request(`${BASE}/00000000-0000-4000-8000-000000000099/unlock`, { method: 'POST' }), env, deps());
    expect(res.status).toBe(404);
  });
});

describe('entrada persistida', () => {
  it('guarda só a entrada normalizada, sem token nem IP', async () => {
    const id = await createdId();
    const row = fake.sql.prepare('SELECT input_json FROM diagnostics WHERE id = ?').get(id) as Record<string, string>;
    expect(JSON.parse(row.input_json)).toEqual(diagnosticInput({ websiteUrl: 'https://acme.com.br/' }));
  });
});
