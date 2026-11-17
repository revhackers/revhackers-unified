// Fases do diagnóstico, sem bindings do Cloudflare. O GtmDiagnosticWorkflow injeta os passos reais; os testes injetam
// um passo em memória e um D1 de verdade (SQLite), então a ordem e as falhas são as mesmas nos dois caminhos.

import type { CriticOutput } from '../src/prompts/critic.js';
import type { DossierOutput } from '../src/prompts/dossier.js';
import {
  applyLeadInputs,
  MODULE_DEPS,
  runModulesDag,
  SITE_INACESSIVEL,
  type CollectStage,
  type DiagnosticInput,
  type ExtractedFact,
  type ModuleKey,
  type ModuleOutputs,
  type ModuleStageContext,
  type StageResult,
} from '../src/stages.js';
import { getDiagnostic, isFailedStage, loadStage, markFailed, markReady, releaseAfterCollect, saveStage, type FailedStage } from './store.js';

export interface PhaseStages {
  collect(input: DiagnosticInput): Promise<CollectStage>;
  extract(collect: CollectStage): Promise<StageResult<ExtractedFact[]>>;
  dossier(input: DiagnosticInput, collect: CollectStage, extracts: ExtractedFact[]): Promise<StageResult<DossierOutput>>;
  module<K extends ModuleKey>(key: K, ctx: ModuleStageContext): Promise<StageResult<ModuleOutputs[K]>>;
  critic(collect: CollectStage, dossier: DossierOutput, modules: ModuleOutputs): Promise<StageResult<CriticOutput>>;
}

/** Passos duráveis. No Workflow, `do` é `step.do` com a config de retry; `permanent` é `NonRetryableError`. */
export interface StepRunner {
  do<T extends Rpc.Serializable<T>>(name: string, fn: () => Promise<T>): Promise<T>;
  sleep(name: string, duration: WorkflowSleepDuration): Promise<void>;
  permanent(message: string): Error;
}

export interface PhaseEnv {
  db: D1Database;
  stages: PhaseStages;
  now: () => string;
}

export interface RunPayload {
  id: string;
  phase: 'collect' | 'analyze';
}

const WAIT_ROUNDS = 60;
const WAIT_DURATION: WorkflowSleepDuration = '3 seconds';
const MODULE_KEYS = Object.keys(MODULE_DEPS) as ModuleKey[];

/**
 * aguarda: coleta ou liberação ainda em curso. pronta: liberada e extraída. encerrada: já falhou ou já está pronto.
 */
type CollectState = 'aguarda' | 'pronta' | 'encerrada';

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Código gravado em `error_code`. Só a coleta sem site vira código próprio; o resto é falha interna. */
function errorCodeOf(err: unknown): string {
  return messageOf(err).includes(SITE_INACESSIVEL) ? SITE_INACESSIVEL : 'falha_interna';
}

async function loadInput(db: D1Database, id: string): Promise<DiagnosticInput> {
  const row = await getDiagnostic(db, id);
  if (!row) throw new Error('diagnostico_ausente');
  // Gravado por createDiagnostic a partir de DiagnosticInput já validado.
  return JSON.parse(row.input_json) as DiagnosticInput;
}

/** Estágio obrigatório: ausente ou marcado como falha aborta a fase. */
async function requireStage<T>(db: D1Database, id: string, name: string): Promise<T> {
  const out = await loadStage<unknown>(db, id, name);
  if (out === null || isFailedStage(out)) throw new Error(`estagio_ausente:${name}`);
  // Gravado pelo próprio Worker com o tipo do estágio; o formato é o do pipeline.
  return out as T;
}

async function loadModuleContext(db: D1Database, id: string, key: ModuleKey): Promise<ModuleStageContext> {
  const input = await loadInput(db, id);
  const collect = await requireStage<CollectStage>(db, id, 'collect');
  const dossier = await requireStage<DossierOutput>(db, id, 'dossier');
  // Só as dependências declaradas em MODULE_DEPS entram: a entrada do módulo não depende de quem terminou antes.
  const modules: Partial<ModuleOutputs> = {};
  const slots = modules as Record<ModuleKey, unknown>;
  for (const dep of MODULE_DEPS[key]) {
    const out = await loadStage<unknown>(db, id, dep);
    if (out !== null && !isFailedStage(out)) slots[dep] = out;
  }
  return { input, collect, dossier, modules };
}

async function loadAllModules(db: D1Database, id: string): Promise<ModuleOutputs> {
  const modules: Partial<ModuleOutputs> = {};
  const slots = modules as Record<ModuleKey, unknown>;
  for (const key of MODULE_KEYS) {
    const out = await loadStage<unknown>(db, id, key);
    if (out === null || isFailedStage(out)) throw new Error('modulos_incompletos');
    slots[key] = out;
  }
  // Todas as chaves foram conferidas no laço acima.
  return modules as ModuleOutputs;
}

/** A análise só começa com o status já liberado (`gerando`) e a extração gravada; pronto ou falhou encerram. */
async function readCollectState(db: D1Database, id: string): Promise<CollectState> {
  const row = await getDiagnostic(db, id);
  if (!row) throw new Error('diagnostico_ausente');
  if (row.status === 'falhou' || row.status === 'pronto') return 'encerrada';
  if (row.status !== 'gerando') return 'aguarda';
  return (await loadStage<unknown>(db, id, 'extract')) !== null ? 'pronta' : 'aguarda';
}

async function runCollect(id: string, env: PhaseEnv, step: StepRunner): Promise<void> {
  await step.do('collect', async () => {
    const input = await loadInput(env.db, id);
    let collect: CollectStage;
    try {
      collect = await env.stages.collect(input);
    } catch (err) {
      if (messageOf(err).includes(SITE_INACESSIVEL)) throw step.permanent(SITE_INACESSIVEL);
      throw err;
    }
    await saveStage(env.db, id, 'collect', collect, env.now());
  });

  await step.do('extract', async () => {
    const collect = await requireStage<CollectStage>(env.db, id, 'collect');
    const res = await env.stages.extract(collect);
    await saveStage(env.db, id, 'extract', res.data, env.now());
  });

  await step.do('libera', () => releaseAfterCollect(env.db, id, env.now()));
}

async function runAnalyze(id: string, env: PhaseEnv, step: StepRunner): Promise<void> {
  let state: CollectState = 'aguarda';
  for (let round = 1; round <= WAIT_ROUNDS; round++) {
    state = await step.do(`aguarda coleta ${round}`, () => readCollectState(env.db, id));
    if (state !== 'aguarda') break;
    if (round < WAIT_ROUNDS) await step.sleep(`pausa ${round}`, WAIT_DURATION);
  }
  // Encerrada: a coleta já falhou ou a análise já foi feita; nada a fazer.
  if (state === 'encerrada') return;
  if (state !== 'pronta') throw new Error('coleta_nao_concluida');

  // A coleta termina antes do envio do form: reaplica a entrada atual (com os números do webhook,
  // se chegaram) sobre a coleta gravada, antes do dossiê.
  await step.do('entradas do lead', async () => {
    const input = await loadInput(env.db, id);
    const collect = await requireStage<CollectStage>(env.db, id, 'collect');
    await saveStage(env.db, id, 'collect', applyLeadInputs(collect, input), env.now());
  });
  await step.do('dossier', async () => {
    const input = await loadInput(env.db, id);
    const collect = await requireStage<CollectStage>(env.db, id, 'collect');
    const extracts = await requireStage<ExtractedFact[]>(env.db, id, 'extract');
    const res = await env.stages.dossier(input, collect, extracts);
    await saveStage(env.db, id, 'dossier', res.data, env.now());
  });

  // Falha de um módulo grava a linha `failed` e segue: os demais módulos e o plano continuam.
  await runModulesDag(async (key) => {
    try {
      await step.do(key, async () => {
        const ctx = await loadModuleContext(env.db, id, key);
        const res = await env.stages.module(key, ctx);
        await saveStage(env.db, id, key, res.data, env.now());
      });
    } catch (err) {
      const marker: FailedStage = { failed: true, error: messageOf(err) };
      await step.do(`registra falha ${key}`, () => saveStage(env.db, id, key, marker, env.now()));
    }
  });

  await step.do('marca pronto', () => markReady(env.db, id, env.now()));

  // Crítico é registro interno: falha não muda o status do relatório.
  try {
    await step.do('critic', async () => {
      const collect = await requireStage<CollectStage>(env.db, id, 'collect');
      const dossier = await requireStage<DossierOutput>(env.db, id, 'dossier');
      const modules = await loadAllModules(env.db, id);
      const res = await env.stages.critic(collect, dossier, modules);
      await saveStage(env.db, id, 'critic', res.data, env.now());
    });
  } catch (err) {
    const marker: FailedStage = { failed: true, error: messageOf(err) };
    await step.do('registra falha critic', () => saveStage(env.db, id, 'critic', marker, env.now()));
  }
}

/**
 * Corpo do Workflow. Qualquer erro que chegue até aqui grava `falhou` com o código da causa; a falha de um módulo
 * nunca chega aqui porque é contida dentro de `runAnalyze`.
 */
export async function runGtmDiagnostic(payload: RunPayload, env: PhaseEnv, step: StepRunner): Promise<void> {
  try {
    if (payload.phase === 'collect') await runCollect(payload.id, env, step);
    else await runAnalyze(payload.id, env, step);
  } catch (err) {
    const code = errorCodeOf(err);
    await step.do('marca falha', () => markFailed(env.db, payload.id, code, env.now()));
  }
}
