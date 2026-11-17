import type { LlmProvider } from './ai/types.js';
import type { CollectionOptions } from './collect/site.js';
import type { CriticOutput } from './prompts/critic.js';
import type { DossierOutput } from './prompts/dossier.js';
import type { ExtractOutput } from './prompts/extract.js';
import {
  runModulesDag,
  stageCollect,
  stageCritic,
  stageDossier,
  stageExtract,
  stageModule,
  type CallMetric,
  type CollectStage,
  type ModuleKey,
  type ModuleOutputs,
  type StageDeps,
  type StageQuality,
  type StageResult,
} from './stages.js';

export interface PipelineInput {
  companyName: string;
  websiteUrl: string;
  cnpj?: string;
  declaredPhase: string;
  declaredIcp?: string;
  competitors: string[];
  crmOrFinancialInputs?: {
    arpuMonthly?: number | null;
    cacEstimated?: number | null;
    // Fração mensal: 0,035 = 3,5% ao mês (LTV = ARPU ÷ churn mensal).
    churnMonthlyRate?: number | null;
    salesCycleDays?: number | null;
    // Leads ou oportunidades novas por mês (informado pela empresa).
    leadsPerMonth?: number | null;
    // Fração: 0,25 = 25% das propostas viram cliente.
    winRate?: number | null;
    // Pessoas em vendas.
    salesTeamSize?: number | null;
  };
  tamBottomUpData?: {
    totalTargetAccounts: number;
    estimatedSamAccounts: number;
    estimatedSomAccounts: number;
    arpuMedioMensal: number;
  };
  providers: Record<string, LlmProvider>;
}

export interface PipelineOptions {
  /** I/O de coleta injetável (fetch e render). Sem `render`, páginas sem texto no HTML bruto viram lacuna. */
  collect?: CollectionOptions;
  /** Recebe o nome de cada estágio ao começar. Módulos independentes podem começar na mesma hora. */
  onStage?: (stage: string) => void;
}

export interface PipelineOutput {
  companyName: string;
  websiteUrl: string;
  declaredPhase: string;
  competitors: string[];
  collect: CollectStage;
  extractions: ExtractOutput[];
  dossier: DossierOutput;
  modules: ModuleOutputs;
  critic: CriticOutput;
  qualityChecks: StageQuality;
  metrics: {
    totalCostUsd: number;
    totalLatencyMs: number;
    callsCount: number;
    breakdown: CallMetric[];
  };
}

/** Garante os oito módulos. `runModulesDag` só resolve quando todos terminaram, então a ausência é invariante violada. */
function completeModules(m: Partial<ModuleOutputs>): ModuleOutputs {
  const { raio_x, icp_mercado, comite_compra, proposta_posicionamento, motor_demanda, funil_revops, unit_economics, plano_90_dias } = m;
  if (!raio_x || !icp_mercado || !comite_compra || !proposta_posicionamento || !motor_demanda || !funil_revops || !unit_economics || !plano_90_dias) {
    throw new Error('modulo_ausente: a execução terminou sem todos os módulos');
  }
  return { raio_x, icp_mercado, comite_compra, proposta_posicionamento, motor_demanda, funil_revops, unit_economics, plano_90_dias };
}

export async function runGtmPipeline(input: PipelineInput, options: PipelineOptions = {}): Promise<PipelineOutput> {
  const { providers, ...diagnostic } = input;
  const deps: StageDeps = { providers };
  const onStage = options.onStage ?? (() => undefined);
  const calls: CallMetric[] = [];
  const quality: StageQuality = { downgradedClaims: 0, numericFindings: [], droppedQuotes: 0 };
  const take = <T>(stage: StageResult<T>): T => {
    calls.push(...stage.calls);
    quality.downgradedClaims += stage.quality.downgradedClaims;
    quality.numericFindings.push(...stage.quality.numericFindings);
    quality.droppedQuotes += stage.quality.droppedQuotes;
    return stage.data;
  };

  onStage('coleta');
  const collect = await stageCollect(diagnostic, options.collect);

  onStage('extração');
  const extracts = take(await stageExtract(collect, deps));

  onStage('dossiê');
  const dossier = take(await stageDossier(diagnostic, collect, extracts, deps));

  const modules: Partial<ModuleOutputs> = {};
  const runModule = async <K extends ModuleKey>(key: K): Promise<void> => {
    onStage(key);
    modules[key] = take(await stageModule(key, { input: diagnostic, collect, dossier, modules }, deps));
  };
  await runModulesDag(runModule);
  const completos = completeModules(modules);

  onStage('crítico');
  const critic = take(await stageCritic(collect, dossier, completos, deps));

  return {
    companyName: input.companyName,
    websiteUrl: input.websiteUrl,
    declaredPhase: input.declaredPhase,
    competitors: input.competitors,
    collect,
    extractions: extracts.map((fato) => fato.extract),
    dossier,
    modules: completos,
    critic,
    qualityChecks: quality,
    metrics: {
      totalCostUsd: calls.reduce((soma, c) => soma + c.costUsd, 0),
      totalLatencyMs: calls.reduce((soma, c) => soma + c.latencyMs, 0),
      callsCount: calls.length,
      breakdown: calls,
    },
  };
}
