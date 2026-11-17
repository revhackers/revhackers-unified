import { beforeEach, describe, expect, it } from 'vitest';
import type { CriticOutput } from '../../src/prompts/critic.js';
import type { DossierOutput } from '../../src/prompts/dossier.js';
import { MODULE_DEPS, type CollectStage, type ModuleKey, type StageResult } from '../../src/stages.js';
import { runGtmDiagnostic, type PhaseEnv, type PhaseStages, type StepRunner } from '../phases.js';
import { insertDiagnostic, loadStage, saveStage } from '../store.js';
import { collectFixture, createFakeD1, diagnosticInput, type FakeD1 } from './fixtures.js';

const NOW = '2026-11-16T12:00:00.000Z';
const ID = '00000000-0000-4000-8000-000000000001';
const MODULE_KEYS = Object.keys(MODULE_DEPS) as ModuleKey[];
const QUALITY = { downgradedClaims: 0, numericFindings: [], droppedQuotes: 0 };

let fake: FakeD1;

function ok<T>(data: T): StageResult<T> {
  return { data, calls: [], quality: QUALITY };
}

interface Harness {
  env: PhaseEnv;
  step: StepRunner;
  /** Nomes de passo, na ordem em que foram pedidos (inclui pausas). */
  steps: string[];
  /** Estágios de modelo chamados, na ordem. */
  calls: string[];
  /** Chaves de `ctx.modules` que cada módulo recebeu. */
  contexts: Record<string, string[]>;
  /** Marcas de início e fim de módulo, para provar a ordem do DAG. */
  events: string[];
}

function harness(over: Partial<PhaseStages> = {}, sleepHook?: (name: string) => Promise<void>): Harness {
  const steps: string[] = [];
  const calls: string[] = [];
  const contexts: Record<string, string[]> = {};
  const events: string[] = [];

  const defaults: PhaseStages = {
    collect: async () => {
      calls.push('collect');
      return collectFixture();
    },
    extract: async () => {
      calls.push('extract');
      return ok([]);
    },
    dossier: async () => {
      calls.push('dossier');
      return ok({} as DossierOutput);
    },
    module: async (key, ctx) => {
      calls.push(key);
      contexts[key] = Object.keys(ctx.modules).sort();
      events.push(`start ${key}`);
      events.push(`end ${key}`);
      return { data: {}, calls: [], quality: QUALITY } as never;
    },
    critic: async () => {
      calls.push('critic');
      return ok({} as CriticOutput);
    },
  };
  const stages: PhaseStages = { ...defaults, ...over };

  const step: StepRunner = {
    do: async (name, fn) => {
      steps.push(name);
      return fn();
    },
    sleep: async (name) => {
      steps.push(name);
      await sleepHook?.(name);
    },
    permanent: (message) => {
      const error = new Error(message);
      error.name = 'NonRetryableError';
      return error;
    },
  };

  return { env: { db: fake.db, stages, now: () => NOW }, step, steps, calls, contexts, events };
}

async function seed(status: string, extra: string = ''): Promise<void> {
  await insertDiagnostic(fake.db, { id: ID, now: NOW, inputJson: JSON.stringify(diagnosticInput()), ipHash: 'hash' });
  fake.sql.prepare(`UPDATE diagnostics SET status = ?${extra} WHERE id = ?`).run(status, ID);
}

function diag(): { status: string; error_code: string | null; unlocked_at: string | null } {
  return fake.sql.prepare('SELECT status, error_code, unlocked_at FROM diagnostics WHERE id = ?').get(ID) as {
    status: string;
    error_code: string | null;
    unlocked_at: string | null;
  };
}

/** Coleta já gravada, como a fase collect deixa. */
async function seedCollect(): Promise<void> {
  await saveStage(fake.db, ID, 'collect', collectFixture(), NOW);
}

beforeEach(() => {
  fake = createFakeD1();
});

describe('fase collect', () => {
  it('grava coleta e extração e libera para aguardando_contato', async () => {
    await seed('coletando');
    const h = harness();

    await runGtmDiagnostic({ id: ID, phase: 'collect' }, h.env, h.step);

    expect(diag().status).toBe('aguardando_contato');
    expect(await loadStage(fake.db, ID, 'collect')).not.toBeNull();
    expect(await loadStage(fake.db, ID, 'extract')).toEqual([]);
    expect(h.steps).toEqual(['collect', 'extract', 'libera']);
  });

  it('desbloqueio durante a coleta leva direto a gerando', async () => {
    await seed('coletando', ", unlocked_at = '2026-11-16T11:59:00.000Z'");
    const h = harness();
    await runGtmDiagnostic({ id: ID, phase: 'collect' }, h.env, h.step);
    expect(diag().status).toBe('gerando');
  });

  it('site sem página: falhou com site_inacessivel e nenhuma extração', async () => {
    await seed('coletando');
    const h = harness({
      collect: async () => {
        throw new Error('site_inacessivel');
      },
    });

    await runGtmDiagnostic({ id: ID, phase: 'collect' }, h.env, h.step);

    expect(diag()).toMatchObject({ status: 'falhou', error_code: 'site_inacessivel' });
    expect(h.calls).not.toContain('extract');
    expect(h.steps).toContain('marca falha');
  });

  it('erro qualquer na coleta: falhou com falha_interna', async () => {
    await seed('coletando');
    const h = harness({
      collect: async () => {
        throw new Error('timeout inesperado');
      },
    });

    await runGtmDiagnostic({ id: ID, phase: 'collect' }, h.env, h.step);

    expect(diag()).toMatchObject({ status: 'falhou', error_code: 'falha_interna' });
  });
});

describe('fase analyze', () => {
  it('análise completa: pronto, oito módulos gravados e crítico', async () => {
    await seed('gerando');
    await seedCollect();
    await saveStage(fake.db, ID, 'extract', [], NOW);
    const h = harness();

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    expect(diag().status).toBe('pronto');
    for (const key of MODULE_KEYS) expect(await loadStage(fake.db, ID, key)).toEqual({});
    expect(await loadStage(fake.db, ID, 'critic')).toEqual({});
    expect(h.calls.filter((c) => (MODULE_KEYS as string[]).includes(c))).toHaveLength(8);
    expect(h.steps).toContain('marca pronto');
  });

  it('dependência só começa depois de terminar; módulo sem dependência não espera', async () => {
    await seed('gerando');
    await seedCollect();
    await saveStage(fake.db, ID, 'extract', [], NOW);
    const h = harness({
      module: async (key, ctx) => {
        h.events.push(`start ${key}`);
        if (key === 'icp_mercado') {
          await Promise.resolve();
          await Promise.resolve();
        }
        h.events.push(`end ${key}`);
        h.contexts[key] = Object.keys(ctx.modules).sort();
        return { data: {}, calls: [], quality: QUALITY } as never;
      },
    });

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    const at = (label: string) => h.events.indexOf(label);
    expect(at('start comite_compra')).toBeGreaterThan(at('end icp_mercado'));
    expect(at('start raio_x')).toBeLessThan(at('end icp_mercado'));
    expect(at('start unit_economics')).toBeLessThan(at('end icp_mercado'));
    expect(at('start plano_90_dias')).toBeGreaterThan(at('end comite_compra'));
  });

  it('cada módulo recebe só as dependências declaradas em MODULE_DEPS', async () => {
    await seed('gerando');
    await seedCollect();
    await saveStage(fake.db, ID, 'extract', [], NOW);
    const h = harness();

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    expect(h.contexts.comite_compra).toEqual(['icp_mercado']);
    expect(h.contexts.raio_x).toEqual([]);
    expect(h.contexts.plano_90_dias).toEqual(['funil_revops', 'icp_mercado', 'motor_demanda', 'proposta_posicionamento', 'raio_x', 'unit_economics']);
  });

  it('falha de módulo grava failed, os demais seguem e o status fica pronto', async () => {
    await seed('gerando');
    await seedCollect();
    await saveStage(fake.db, ID, 'extract', [], NOW);
    const h = harness({
      module: async (key, ctx) => {
        h.calls.push(key);
        h.contexts[key] = Object.keys(ctx.modules).sort();
        if (key === 'icp_mercado') throw new Error('modelo indisponível');
        return { data: {}, calls: [], quality: QUALITY } as never;
      },
    });

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    expect(await loadStage(fake.db, ID, 'icp_mercado')).toEqual({ failed: true, error: 'modelo indisponível' });
    expect(h.contexts.comite_compra).toEqual([]);
    expect(h.calls).toContain('plano_90_dias');
    expect(diag().status).toBe('pronto');
    expect(await loadStage(fake.db, ID, 'critic')).toEqual({ failed: true, error: 'modulos_incompletos' });
  });

  it('dossiê falha: falhou com falha_interna e nenhum módulo roda', async () => {
    await seed('gerando');
    await seedCollect();
    await saveStage(fake.db, ID, 'extract', [], NOW);
    const h = harness({
      dossier: async () => {
        throw new Error('dossie quebrou');
      },
    });

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    expect(diag()).toMatchObject({ status: 'falhou', error_code: 'falha_interna' });
    expect(h.calls.some((c) => (MODULE_KEYS as string[]).includes(c))).toBe(false);
  });

  it('extração ainda não gravada: pausa e segue quando ela aparece', async () => {
    await seed('gerando');
    await seedCollect();
    const h = harness({}, async (name) => {
      if (name === 'pausa 1') await saveStage(fake.db, ID, 'extract', [], NOW);
    });

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    expect(h.steps.filter((s) => s.startsWith('pausa'))).toEqual(['pausa 1']);
    expect(h.calls).toContain('dossier');
    expect(diag().status).toBe('pronto');
  });

  it('coleta que nunca chega: 60 rodadas de espera e falhou com falha_interna', async () => {
    await seed('gerando');
    await seedCollect();
    const h = harness();

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    expect(h.steps.filter((s) => s.startsWith('aguarda coleta'))).toHaveLength(60);
    expect(h.steps.filter((s) => s.startsWith('pausa'))).toHaveLength(59);
    expect(h.calls).not.toContain('dossier');
    expect(diag()).toMatchObject({ status: 'falhou', error_code: 'falha_interna' });
  });

  it('coleta já falhou: a análise encerra e não troca o código da causa', async () => {
    await seed('falhou', ", error_code = 'site_inacessivel'");
    const h = harness();

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    expect(h.steps).toEqual(['aguarda coleta 1']);
    expect(diag()).toMatchObject({ status: 'falhou', error_code: 'site_inacessivel' });
  });

  it('diagnóstico já pronto não é reanalisado', async () => {
    await seed('pronto');
    await seedCollect();
    await saveStage(fake.db, ID, 'extract', [], NOW);
    const h = harness();

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    expect(h.steps).toEqual(['aguarda coleta 1']);
    expect(h.calls).toEqual([]);
    expect(diag().status).toBe('pronto');
  });

  it('extração gravada com coleta ainda não liberada: a análise espera a liberação', async () => {
    await seed('coletando');
    await seedCollect();
    await saveStage(fake.db, ID, 'extract', [], NOW);
    const h = harness({}, async (name) => {
      if (name === 'pausa 1') fake.sql.prepare("UPDATE diagnostics SET status = 'gerando' WHERE id = ?").run(ID);
    });

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    expect(h.steps.slice(0, 2)).toEqual(['aguarda coleta 1', 'pausa 1']);
    expect(h.calls).toContain('dossier');
    expect(diag().status).toBe('pronto');
  });

  it('falha do crítico não muda o status pronto', async () => {
    await seed('gerando');
    await seedCollect();
    await saveStage(fake.db, ID, 'extract', [], NOW);
    const h = harness({
      critic: async () => {
        throw new Error('modelo do crítico caiu');
      },
    });

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    expect(diag().status).toBe('pronto');
    expect(await loadStage(fake.db, ID, 'critic')).toEqual({ failed: true, error: 'modelo do crítico caiu' });
  });

  it('reaplica as entradas do lead sobre a coleta antes do dossiê', async () => {
    await insertDiagnostic(
      fake.db,
      { id: ID, now: NOW, inputJson: JSON.stringify(diagnosticInput({ crmOrFinancialInputs: { arpuMonthly: 500 } })), ipHash: 'hash' },
    );
    fake.sql.prepare('UPDATE diagnostics SET status = ? WHERE id = ?').run('gerando', ID);
    await seedCollect();
    await saveStage(fake.db, ID, 'extract', [], NOW);
    const h = harness();

    await runGtmDiagnostic({ id: ID, phase: 'analyze' }, h.env, h.step);

    expect(h.steps.indexOf('entradas do lead')).toBeGreaterThanOrEqual(0);
    expect(h.steps.indexOf('entradas do lead')).toBeLessThan(h.steps.indexOf('dossier'));
    const collect = await loadStage<CollectStage>(fake.db, ID, 'collect');
    expect(collect?.unitEconomics.arpuMensal).toBe(500);
    const u1 = collect?.citable.find((e) => e.id === 'U1');
    expect(u1?.content).toContain('ARPU mensal: R$ 500');
    expect(diag().status).toBe('pronto');
  });
});
