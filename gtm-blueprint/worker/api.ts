import type { DossierOutput } from '../src/prompts/dossier.js';
import type { LeadReport } from '../src/report/types.js';
import { buildLeadReport } from '../src/report/viewModel.js';
import { MODULE_DEPS, type CollectStage, type DiagnosticInput, type ModuleKey, type ModuleOutputs } from '../src/stages.js';
import { hashIp, parseLimit, UNKNOWN_IP, verifyTurnstile, withinDailyLimits } from './guards.js';
import { parseDiagnosticRequest } from './input.js';
import {
  countRecentDiagnostics,
  getDiagnostic,
  insertDiagnostic,
  isFailedStage,
  listStages,
  markFailed,
  unlockDiagnostic,
  type DiagnosticRow,
  type DiagnosticStatus,
} from './store.js';

export interface ApiDeps {
  /** Chamada ao siteverify do Turnstile. Padrão: fetch global. */
  fetch?: typeof fetch;
  now?: () => Date;
  newId?: () => string;
}

type WorkflowBinding = Env['GTM_WORKFLOW'];

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 16 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNLOCK_PATH = /^\/api\/gtm\/diagnostics\/([^/]+)\/unlock$/;
const GET_PATH = /^\/api\/gtm\/diagnostics\/([^/]+)$/;
const CREATE_PATH = '/api/gtm/diagnostics';
/** Status em que a análise ainda faz sentido. Pronto e falhou não recebem nova instância. */
const ANALYSIS_STATUSES: Record<DiagnosticStatus, boolean> = {
  coletando: true,
  aguardando_contato: true,
  gerando: true,
  pronto: false,
  falhou: false,
};
const MODULE_KEYS = Object.keys(MODULE_DEPS) as ModuleKey[];

/** Toda resposta é JSON; CORS só para origens listadas em ALLOWED_ORIGINS. */
function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({ Vary: 'Origin' });
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGINS.split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '600');
  }
  return headers;
}

function json(status: number, body: unknown, cors: Headers): Response {
  const headers = new Headers(cors);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
}

/** Corpo acima do teto ou que não é JSON vira `undefined`, tratado como entrada inválida. */
async function readJsonBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return undefined;
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function instanceExists(workflow: WorkflowBinding, instanceId: string): Promise<boolean> {
  try {
    await workflow.get(instanceId);
    return true;
  } catch {
    return false;
  }
}

/** Cria a análise do desbloqueio. Se a instância já existe (desbloqueio repetido), segue sem erro. */
async function startAnalysis(id: string, env: Env): Promise<void> {
  const instanceId = `${id}-analyze`;
  try {
    await env.GTM_WORKFLOW.create({ id: instanceId, params: { id, phase: 'analyze' } });
  } catch (err) {
    if (!(await instanceExists(env.GTM_WORKFLOW, instanceId))) throw err;
  }
}

/**
 * Lê um estágio gravado pelo próprio Worker, no tipo que o pipeline devolveu. Estágio com `failed` vira ausente.
 */
function stageOutput<T>(byStage: Map<string, unknown>, name: string): T | undefined {
  const out = byStage.get(name);
  return out === undefined || isFailedStage(out) ? undefined : (out as T);
}

/** Monta o relatório do lead a partir das linhas de estágio. Estágio ainda não gravado fica pendente. */
export function assembleReport(row: DiagnosticRow, stages: Array<{ stage: string; output: unknown }>): LeadReport {
  const byStage = new Map(stages.map((item) => [item.stage, item.output]));
  // Gravado em `createDiagnostic` a partir de DiagnosticInput já validado.
  const input = JSON.parse(row.input_json) as DiagnosticInput;

  const modules: Partial<ModuleOutputs> = {};
  const slots = modules as Record<ModuleKey, unknown>;
  const failed: ModuleKey[] = [];
  for (const key of MODULE_KEYS) {
    const out = byStage.get(key);
    if (out === undefined) continue;
    if (isFailedStage(out)) failed.push(key);
    else slots[key] = out;
  }

  return buildLeadReport({
    input,
    collect: stageOutput<CollectStage>(byStage, 'collect'),
    dossier: stageOutput<DossierOutput>(byStage, 'dossier'),
    modules,
    failed,
  });
}

async function createDiagnostic(request: Request, env: Env, deps: ApiDeps, cors: Headers): Promise<Response> {
  const body = await readJsonBody(request);
  if (body === undefined) return json(400, { error: 'entrada_invalida' }, cors);
  const parsed = parseDiagnosticRequest(body);
  if (!parsed.ok) return json(400, { error: parsed.error }, cors);

  const current = deps.now ? deps.now() : new Date();
  const now = current.toISOString();
  const ip = request.headers.get('CF-Connecting-IP');
  const ipHash = await hashIp(ip ?? UNKNOWN_IP, env.IP_HASH_SALT);

  const verified = await verifyTurnstile({
    token: parsed.turnstileToken,
    secret: env.TURNSTILE_SECRET,
    remoteIp: ip,
    fetch: deps.fetch,
  });
  if (!verified) return json(403, { error: 'verificacao_falhou' }, cors);

  const counts = await countRecentDiagnostics(env.DB, ipHash, new Date(current.getTime() - DAY_MS).toISOString());
  const limits = { total: parseLimit(env.DAILY_LIMIT), porIp: parseLimit(env.PER_IP_DAILY_LIMIT) };
  if (!withinDailyLimits(counts, limits)) return json(429, { error: 'limite_diario' }, cors);

  const id = deps.newId ? deps.newId() : crypto.randomUUID();
  await insertDiagnostic(env.DB, { id, now, inputJson: JSON.stringify(parsed.input), ipHash });
  try {
    await env.GTM_WORKFLOW.create({ id, params: { id, phase: 'collect' } });
  } catch {
    await markFailed(env.DB, id, 'falha_interna', now);
    return json(500, { error: 'falha_interna' }, cors);
  }
  return json(201, { id }, cors);
}

async function unlockRoute(id: string, env: Env, deps: ApiDeps, cors: Headers): Promise<Response> {
  const row = await getDiagnostic(env.DB, id);
  if (!row) return json(404, { error: 'nao_encontrado' }, cors);

  const now = (deps.now ? deps.now() : new Date()).toISOString();
  await unlockDiagnostic(env.DB, id, now);
  if (ANALYSIS_STATUSES[row.status]) await startAnalysis(id, env);
  return json(200, { ok: true }, cors);
}

async function getRoute(id: string, env: Env, cors: Headers): Promise<Response> {
  const row = await getDiagnostic(env.DB, id);
  if (!row) return json(404, { error: 'nao_encontrado' }, cors);

  const stages = await listStages(env.DB, id);
  return json(200, { id: row.id, status: row.status, errorCode: row.error_code, report: assembleReport(row, stages) }, cors);
}

async function route(request: Request, env: Env, deps: ApiDeps, cors: Headers): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === CREATE_PATH && request.method === 'POST') return createDiagnostic(request, env, deps, cors);

  const unlock = UNLOCK_PATH.exec(pathname);
  if (unlock && request.method === 'POST' && UUID.test(unlock[1])) return unlockRoute(unlock[1], env, deps, cors);

  const get = GET_PATH.exec(pathname);
  if (get && request.method === 'GET' && UUID.test(get[1])) return getRoute(get[1], env, cors);

  return json(404, { error: 'nao_encontrado' }, cors);
}

export async function handleGtmApi(request: Request, env: Env, deps: ApiDeps = {}): Promise<Response> {
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    return await route(request, env, deps, cors);
  } catch (err) {
    // Só o tipo do erro: a mensagem pode carregar dado do lead.
    console.error('gtm_api_erro', err instanceof Error ? err.name : 'desconhecido');
    return json(500, { error: 'falha_interna' }, cors);
  }
}
