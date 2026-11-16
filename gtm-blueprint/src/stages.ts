import type { LlmProvider, LlmResponse } from './ai/types.js';
import { runPrompt } from './ai/run.js';
import type { PromptSpec } from './prompts/types.js';
import { enforceEvidence, enforcePersonaHypothesis, renderEvidenceCompact, type Evidence } from './prompts/evidence.js';
import { enforceNumberProvenance, userInputEvidence, type NumericFinding } from './prompts/numberGuard.js';
import { fetchCnpjData } from './compute/cnpj.js';
import { computeAndSortIce } from './compute/ice.js';
import { computeUnitEconomics, computeSomAnual, computedEvidence, type UnitEconomicsComputed } from './compute/unitEconomics.js';
import { collectSiteData, type CollectionOptions, type CompetitorStatus } from './collect/site.js';
import { findCnpj, type SiteSignal } from './collect/signals.js';
import { extractPromptSpec, verifyExtract, type ExtractInput, type ExtractOutput } from './prompts/extract.js';
import { dossierPromptSpec, type DossierInput, type DossierOutput } from './prompts/dossier.js';
import { raioXPromptSpec, type RaioXInput, type RaioXOutput } from './prompts/modules/raio_x.js';
import { icpMercadoPromptSpec, type IcpMercadoInput, type IcpMercadoOutput } from './prompts/modules/icp_mercado.js';
import { comiteCompraPromptSpec, type ComiteCompraInput, type ComiteCompraOutput } from './prompts/modules/comite_compra.js';
import { propostaPosicionamentoPromptSpec, type PropostaPosicionamentoInput, type PropostaPosicionamentoOutput } from './prompts/modules/proposta_posicionamento.js';
import { motorDemandaPromptSpec, type MotorDemandaInput, type MotorDemandaOutput } from './prompts/modules/motor_demanda.js';
import { funilRevOpsPromptSpec, type FunilRevOpsInput, type FunilRevOpsOutput } from './prompts/modules/funil_revops.js';
import { unitEconomicsPromptSpec, type UnitEconomicsInput, type UnitEconomicsOutput } from './prompts/modules/unit_economics.js';
import { plano90DiasPromptSpec, type Plano90DiasInput, type Plano90DiasOutput } from './prompts/modules/plano_90_dias.js';
import { criticPromptSpec, type CriticInput, type CriticOutput } from './prompts/critic.js';
import type { PipelineInput } from './pipeline.js';

/** Código de erro quando o site informado não entrega nenhuma página para análise. */
export const SITE_INACESSIVEL = 'site_inacessivel';

export type DeclaredPhase = 'Estruturação Inicial' | 'Primeira Tração Validada' | 'Escala Estruturada' | 'Otimização e Eficiência';
export type DiagnosticInput = Omit<PipelineInput, 'providers'>;

export interface ModuleOutputs {
  raio_x: RaioXOutput;
  icp_mercado: IcpMercadoOutput;
  comite_compra: ComiteCompraOutput;
  proposta_posicionamento: PropostaPosicionamentoOutput;
  motor_demanda: MotorDemandaOutput;
  funil_revops: FunilRevOpsOutput;
  unit_economics: UnitEconomicsOutput;
  plano_90_dias: Plano90DiasOutput;
}

export type ModuleKey = keyof ModuleOutputs;

/** Dependências de dados entre módulos. Quem não depende de ninguém começa imediatamente. */
export const MODULE_DEPS: Record<ModuleKey, ModuleKey[]> = {
  raio_x: [],
  icp_mercado: [],
  unit_economics: [],
  comite_compra: ['icp_mercado'],
  proposta_posicionamento: ['comite_compra'],
  motor_demanda: ['proposta_posicionamento'],
  funil_revops: ['motor_demanda'],
  plano_90_dias: ['raio_x', 'icp_mercado', 'proposta_posicionamento', 'motor_demanda', 'funil_revops', 'unit_economics'],
};

export interface StageDeps {
  providers: Record<string, LlmProvider>;
}

export interface StageQuality {
  downgradedClaims: number;
  numericFindings: NumericFinding[];
  droppedQuotes: number;
}

export interface CallMetric {
  promptId: string;
  costUsd: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

export interface StageResult<T> {
  data: T;
  calls: CallMetric[];
  quality: StageQuality;
}

export interface ExtractedFact {
  evidenceId: string;
  extract: ExtractOutput;
}

export interface CollectStage {
  /** Evidências coletadas (CNPJ, páginas, sinais). Base da extração. */
  evidences: Evidence[];
  /** Tudo que um claim pode citar: as evidências coletadas, U1 (entrada do cliente) e C1 (cálculo por código). */
  citable: Evidence[];
  gaps: string[];
  competitors: CompetitorStatus[];
  signals: SiteSignal[];
  unitEconomics: UnitEconomicsComputed;
  somAnual: number | null;
  cnpj: { ageYears: number | null; porte: string | null; uf: string | null };
}

export interface ModuleStageContext {
  input: DiagnosticInput;
  collect: CollectStage;
  dossier: DossierOutput;
  modules: Partial<ModuleOutputs>;
}

interface ModuleInputs {
  raio_x: RaioXInput;
  icp_mercado: IcpMercadoInput;
  comite_compra: ComiteCompraInput;
  proposta_posicionamento: PropostaPosicionamentoInput;
  motor_demanda: MotorDemandaInput;
  funil_revops: FunilRevOpsInput;
  unit_economics: UnitEconomicsInput;
  plano_90_dias: Plano90DiasInput;
}

interface ModuleCtx {
  input: DiagnosticInput;
  collect: CollectStage;
  dossierSummary: Record<string, unknown>;
  modules: Partial<ModuleOutputs>;
}

interface ModuleEntry<I, O> {
  spec: PromptSpec<I, O>;
  input: (ctx: ModuleCtx) => I;
  /** Pós-processamento determinístico, aplicado depois das travas. */
  finish?: (output: O) => O;
}

// Dependência ausente entra no prompt como `{}`: o módulo recebe o contrato vazio, não uma saída inventada.
const MODULES: { [K in ModuleKey]: ModuleEntry<ModuleInputs[K], ModuleOutputs[K]> } = {
  raio_x: {
    spec: raioXPromptSpec,
    input: ({ dossierSummary }) => ({ dossierSummary }),
  },
  icp_mercado: {
    spec: icpMercadoPromptSpec,
    input: ({ input, collect, dossierSummary }) => ({
      dossierSummary,
      tamBottomUpData: input.tamBottomUpData ?? null,
      somAnualCalculado: collect.somAnual,
    }),
  },
  comite_compra: {
    spec: comiteCompraPromptSpec,
    input: ({ dossierSummary, modules }) => ({ dossierSummary, icpOutput: modules.icp_mercado ?? {} }),
  },
  proposta_posicionamento: {
    spec: propostaPosicionamentoPromptSpec,
    input: ({ dossierSummary, modules }) => ({ dossierSummary, comiteCompraOutput: modules.comite_compra ?? {} }),
  },
  motor_demanda: {
    spec: motorDemandaPromptSpec,
    input: ({ dossierSummary, modules }) => ({ dossierSummary, posicionamentoOutput: modules.proposta_posicionamento ?? {} }),
  },
  funil_revops: {
    spec: funilRevOpsPromptSpec,
    input: ({ dossierSummary, modules }) => ({ dossierSummary, motorDemandaOutput: modules.motor_demanda ?? {} }),
  },
  unit_economics: {
    spec: unitEconomicsPromptSpec,
    input: ({ dossierSummary, collect }) => ({ dossierSummary, calculado: collect.unitEconomics }),
  },
  plano_90_dias: {
    spec: plano90DiasPromptSpec,
    input: ({ dossierSummary, modules }) => ({
      dossierSummary,
      allPreviousModulesSummary: {
        raio_x: modules.raio_x?.resumoExecutivo ?? {},
        icp_mercado: modules.icp_mercado?.icpPrioritario ?? {},
        proposta_posicionamento: modules.proposta_posicionamento?.declaracaoPosicionamento ?? {},
        motor_demanda: modules.motor_demanda?.mixCanaisPrioritarios ?? {},
        funil_revops: modules.funil_revops?.etapasFunilB2B ?? {},
        unit_economics: modules.unit_economics?.leituraFinanceira ?? {},
      },
    }),
    finish: computeAndSortIce,
  },
};

const MAX_DOSSIER_SUMMARY_CHARS = 40000;
const EXTRACT_CONCURRENCY = 3;

function toCallMetric(promptId: string, res: { costUsd: number; raw: LlmResponse }): CallMetric {
  return {
    promptId,
    costUsd: res.costUsd,
    latencyMs: res.raw.latencyMs,
    inputTokens: res.raw.usage.inputTokens,
    outputTokens: res.raw.usage.outputTokens,
    cacheReadTokens: res.raw.usage.cacheReadTokens,
  };
}

/**
 * Chamada com as três travas, nesta ordem: evidência (IDs válidos), persona (dor e objeção nunca são fato) e número
 * (frase com métrica sem fonte sai). Toda saída de dossiê e de módulo passa por aqui.
 */
async function guardedRun<I, O>(spec: PromptSpec<I, O>, promptInput: I, collect: CollectStage, deps: StageDeps): Promise<StageResult<O>> {
  const res = await runPrompt(spec, promptInput, { providers: deps.providers });
  const validIds = new Set(collect.citable.map((ev) => ev.id));
  const checked = enforceEvidence(res.data, validIds);
  const personas = enforcePersonaHypothesis(checked.value, validIds);
  const guarded = enforceNumberProvenance(personas.value, { evidences: collect.citable }, { pathPrefix: spec.id });
  return {
    data: guarded.value,
    calls: [toCallMetric(spec.id, res)],
    quality: {
      downgradedClaims: checked.downgraded + personas.downgraded + guarded.downgradedClaims,
      numericFindings: guarded.findings,
      droppedQuotes: 0,
    },
  };
}

/**
 * Coleta o site, o CNPJ e os cálculos por código. Lança `site_inacessivel` antes de qualquer chamada de modelo
 * quando nenhuma página do site entrou nas evidências.
 */
export async function stageCollect(input: DiagnosticInput, opts: CollectionOptions & { now?: () => Date } = {}): Promise<CollectStage> {
  const collection = await collectSiteData(
    { companyName: input.companyName, websiteUrl: input.websiteUrl, competitors: input.competitors },
    { fetch: opts.fetch, render: opts.render },
  );
  if (!collection.evidences.some((ev) => ev.kind === 'site')) {
    throw new Error(SITE_INACESSIVEL);
  }

  // CNPJ: o informado pelo lead; sem ele, o único CNPJ citado nas páginas do site (rodapé, contato).
  const siteTexts = collection.evidences.filter((ev) => ev.kind === 'site').map((ev) => ev.content);
  const declaredCnpj = input.cnpj;
  const detectedCnpj = declaredCnpj ? null : findCnpj(siteTexts);
  const cnpj = await fetchCnpjData(declaredCnpj ?? detectedCnpj ?? undefined, {
    origem: declaredCnpj ? 'informado pelo lead' : 'detectado no site',
    fetch: opts.fetch,
    now: opts.now,
  });
  const evidences: Evidence[] = [...(cnpj.evidence ? [cnpj.evidence] : []), ...collection.evidences];

  // Unit economics e SOM anual são calculados por código: os módulos interpretam, não calculam.
  const unitEconomics = computeUnitEconomics(input.crmOrFinancialInputs);
  const somAnual = computeSomAnual(input.tamBottomUpData);
  const calc = computedEvidence(unitEconomics, somAnual);

  return {
    evidences,
    citable: [...evidences, userInputEvidence(input, collection.competitors), ...(calc ? [calc] : [])],
    gaps: [...collection.gaps, ...(cnpj.gap ? [cnpj.gap] : [])],
    competitors: collection.competitors,
    signals: collection.signals,
    unitEconomics,
    somAnual,
    cnpj: { ageYears: cnpj.cnpjAgeYears, porte: cnpj.companySizeEstimated, uf: cnpj.estimatedAddressState },
  };
}

/** Extrai cada página do site e dos concorrentes, com a checagem de citação. Três páginas por vez. */
export async function stageExtract(collect: CollectStage, deps: StageDeps): Promise<StageResult<ExtractedFact[]>> {
  const pages = collect.evidences.filter((ev) => ev.kind === 'site' || ev.kind === 'competitor_site');
  const facts: ExtractedFact[] = [];
  const calls: CallMetric[] = [];
  let droppedQuotes = 0;

  for (let i = 0; i < pages.length; i += EXTRACT_CONCURRENCY) {
    const chunk = await Promise.all(pages.slice(i, i + EXTRACT_CONCURRENCY).map(async (ev) => {
      const extInput: ExtractInput = { url: ev.source, kind: ev.kind, rawContent: ev.content };
      const res = await runPrompt(extractPromptSpec, extInput, { providers: deps.providers });
      const verified = verifyExtract(res.data, ev.content);
      return { fact: { evidenceId: ev.id, extract: verified.extract }, dropped: verified.dropped, call: toCallMetric(extractPromptSpec.id, res) };
    }));
    for (const item of chunk) {
      facts.push(item.fact);
      calls.push(item.call);
      droppedQuotes += item.dropped;
    }
  }

  return { data: facts, calls, quality: { downgradedClaims: 0, numericFindings: [], droppedQuotes } };
}

export async function stageDossier(
  input: DiagnosticInput,
  collect: CollectStage,
  extracts: ExtractedFact[],
  deps: StageDeps,
): Promise<StageResult<DossierOutput>> {
  const dossierInput: DossierInput = {
    companyName: input.companyName,
    websiteUrl: input.websiteUrl,
    declaredPhase: input.declaredPhase,
    declaredIcp: input.declaredIcp,
    competitors: collect.competitors,
    computedFacts: {
      cnpjAgeYears: collect.cnpj.ageYears,
      companySizeEstimated: collect.cnpj.porte,
      estimatedAddressState: collect.cnpj.uf,
    },
    evidences: collect.citable,
    fatosExtraidos: extracts,
  };
  return guardedRun(dossierPromptSpec, dossierInput, collect, deps);
}

/** Um módulo. O dossiê entra inteiro, junto com o texto das evidências dentro de um orçamento de caracteres. */
export async function stageModule<K extends ModuleKey>(
  key: K,
  ctx: ModuleStageContext,
  deps: StageDeps,
): Promise<StageResult<ModuleOutputs[K]>> {
  const entry = MODULES[key];
  const moduleCtx: ModuleCtx = {
    input: ctx.input,
    collect: ctx.collect,
    dossierSummary: { ...ctx.dossier, evidenciasDisponiveis: renderEvidenceCompact(ctx.collect.citable, MAX_DOSSIER_SUMMARY_CHARS) },
    modules: ctx.modules,
  };
  const res = await guardedRun(entry.spec, entry.input(moduleCtx), ctx.collect, deps);
  return { ...res, data: entry.finish ? entry.finish(res.data) : res.data };
}

/** Crítico lê a saída já guardada e não tem a própria saída alterada pelas travas. */
export async function stageCritic(
  collect: CollectStage,
  dossier: DossierOutput,
  modules: ModuleOutputs,
  deps: StageDeps,
): Promise<StageResult<CriticOutput>> {
  const criticInput: CriticInput = {
    dossier,
    modules: { ...modules, unit_economics: { ...modules.unit_economics, calculado: collect.unitEconomics } },
    evidences: collect.citable,
  };
  const res = await runPrompt(criticPromptSpec, criticInput, { providers: deps.providers });
  return { data: res.data, calls: [toCallMetric(criticPromptSpec.id, res)], quality: { downgradedClaims: 0, numericFindings: [], droppedQuotes: 0 } };
}

const MODULE_KEYS = Object.keys(MODULE_DEPS) as ModuleKey[];

/**
 * Executa `execute` por módulo, cada um assim que suas dependências em MODULE_DEPS terminaram.
 * Sem dependência, o módulo começa na hora. Resolve quando todos terminaram; uma falha propaga.
 */
export async function runModulesDag(execute: (key: ModuleKey) => Promise<void>): Promise<void> {
  const started = new Map<ModuleKey, Promise<void>>();
  const start = (key: ModuleKey): Promise<void> => {
    let run = started.get(key);
    if (!run) {
      run = Promise.all(MODULE_DEPS[key].map(start)).then(() => execute(key));
      started.set(key, run);
    }
    return run;
  };
  await Promise.all(MODULE_KEYS.map(start));
}
