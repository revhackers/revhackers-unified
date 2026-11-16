import type { LlmProvider } from './ai/types.js';
import { runPrompt } from './ai/run.js';
import type { PromptSpec } from './prompts/types.js';
import { enforceEvidence, renderEvidenceCompact } from './prompts/evidence.js';
import { enforceNumberProvenance, userInputEvidence, type NumericFinding } from './prompts/numberGuard.js';
import { fetchCnpjData } from './compute/cnpj.js';
import { collectSiteData } from './collect/site.js';
import { computeAndSortIce } from './compute/ice.js';
import { extractPromptSpec, type ExtractInput, type ExtractOutput } from './prompts/extract.js';
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
import type { Evidence } from './prompts/evidence.js';

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
    // Fração mensal: 0,035 = 3,5% ao mês (mesma convenção de unit_economics: LTV = ARPU / churn).
    churnMonthlyRate?: number | null;
    salesCycleDays?: number | null;
  };
  tamBottomUpData?: {
    totalTargetAccounts: number;
    estimatedSamAccounts: number;
    estimatedSomAccounts: number;
    arpuMedioMensal: number;
  };
  providers: Record<string, LlmProvider>;
}

export interface CallMetric {
  promptId: string;
  costUsd: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

export interface PipelineOutput {
  companyName: string;
  websiteUrl: string;
  declaredPhase: string;
  competitors: string[];
  cnpjData: unknown;
  collectionResult: { evidences: Evidence[]; gaps: string[] };
  extractions: ExtractOutput[];
  dossier: DossierOutput;
  modules: {
    raio_x: RaioXOutput;
    icp_mercado: IcpMercadoOutput;
    comite_compra: ComiteCompraOutput;
    proposta_posicionamento: PropostaPosicionamentoOutput;
    motor_demanda: MotorDemandaOutput;
    funil_revops: FunilRevOpsOutput;
    unit_economics: UnitEconomicsOutput;
    plano_90_dias: Plano90DiasOutput;
  };
  critic: CriticOutput;
  qualityChecks: {
    downgradedClaims: number;
    numericFindings: NumericFinding[];
  };
  metrics: {
    totalCostUsd: number;
    totalLatencyMs: number;
    callsCount: number;
    breakdown: CallMetric[];
  };
}

export async function runGtmPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const breakdown: CallMetric[] = [];
  let totalCostUsd = 0;
  let totalLatencyMs = 0;

  const recordCall = (promptId: string, cost: number, raw: { latencyMs: number; usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number } }) => {
    totalCostUsd += cost;
    totalLatencyMs += raw.latencyMs;
    breakdown.push({
      promptId,
      costUsd: cost,
      latencyMs: raw.latencyMs,
      inputTokens: raw.usage.inputTokens,
      outputTokens: raw.usage.outputTokens,
      cacheReadTokens: raw.usage.cacheReadTokens,
    });
  };

  // 1. CNPJ Lookup
  const cnpjResult = await fetchCnpjData(input.cnpj);
  const allEvidences: Evidence[] = [];
  if (cnpjResult.evidence) {
    allEvidences.push(cnpjResult.evidence);
  }

  // 2. Collection
  const collection = await collectSiteData({
    companyName: input.companyName,
    websiteUrl: input.websiteUrl,
    competitors: input.competitors,
  });
  allEvidences.push(...collection.evidences);

  // Every Claim is checked in code against the evidence actually collected: invented ids are dropped
  // and VERIFICADO without valid evidence is downgraded to HIPOTESE (the model is not trusted for this).
  // Client-declared numbers are citable as U1; they stay out of allEvidences so the extraction loop skips them.
  const citableEvidences: Evidence[] = [...allEvidences, userInputEvidence(input)];
  const validEvidenceIds = new Set(citableEvidences.map((e) => e.id));
  let downgradedClaims = 0;
  const numericFindings: NumericFinding[] = [];
  const run = async <I, O>(spec: PromptSpec<I, O>, promptInput: I) => {
    const res = await runPrompt(spec, promptInput, { providers: input.providers });
    const checked = enforceEvidence(res.data, validEvidenceIds);
    downgradedClaims += checked.downgraded;
    const guarded = enforceNumberProvenance(checked.value, { evidences: citableEvidences }, { pathPrefix: spec.id });
    downgradedClaims += guarded.downgradedClaims;
    numericFindings.push(...guarded.findings);
    return { ...res, data: guarded.value };
  };

  // 3. Extract each page in parallel (limit 3 concurrency)
  const extractions: ExtractOutput[] = [];
  const limit = 3;
  for (let i = 0; i < allEvidences.length; i += limit) {
    const chunk = allEvidences.slice(i, i + limit);
    const chunkPromises = chunk.map(async (ev) => {
      const extInput: ExtractInput = {
        url: ev.source,
        kind: ev.kind,
        rawContent: ev.content,
      };
      const res = await runPrompt(extractPromptSpec, extInput, { providers: input.providers });
      recordCall(extractPromptSpec.id, res.costUsd, res.raw);
      return res.data;
    });
    const chunkResults = await Promise.all(chunkPromises);
    extractions.push(...chunkResults);
  }

  // 4. Build Dossier
  const dossierInput: DossierInput = {
    companyName: input.companyName,
    websiteUrl: input.websiteUrl,
    declaredPhase: input.declaredPhase,
    declaredIcp: input.declaredIcp,
    competitors: input.competitors,
    computedFacts: {
      cnpjAgeYears: cnpjResult.cnpjAgeYears,
      companySizeEstimated: cnpjResult.companySizeEstimated,
      estimatedAddressState: cnpjResult.estimatedAddressState,
    },
    evidences: citableEvidences,
  };
  const dossierRes = await run(dossierPromptSpec, dossierInput);
  recordCall(dossierPromptSpec.id, dossierRes.costUsd, dossierRes.raw);
  const dossier = dossierRes.data;

  const dossierSummary = {
    teseCentral: dossier.teseCentral,
    modeloNegocio: dossier.modeloNegocio,
    icpAtualFirmografico: dossier.icpAtualFirmografico,
    comiteCompraB2B: dossier.comiteCompraB2B,
    evidenciasDisponiveis: renderEvidenceCompact(citableEvidences, 6000),
  };

  // 5. Module 1: Raio-X
  const raioXInput: RaioXInput = {
    dossierSummary,
    computedMetrics: {},
  };
  const raioXRes = await run(raioXPromptSpec, raioXInput);
  recordCall(raioXPromptSpec.id, raioXRes.costUsd, raioXRes.raw);
  const raioX = raioXRes.data;

  // Module 2: ICP & Mercado
  // No invented defaults: without real market data the module receives null and must say what to collect.
  const tamData = input.tamBottomUpData ?? null;
  const icpInput: IcpMercadoInput = {
    dossierSummary,
    tamBottomUpData: tamData,
  };
  const icpRes = await run(icpMercadoPromptSpec, icpInput);
  recordCall(icpMercadoPromptSpec.id, icpRes.costUsd, icpRes.raw);
  const icp_mercado = icpRes.data;

  // Module 3: Comitê de Compra
  const comiteInput: ComiteCompraInput = {
    dossierSummary,
    icpOutput: icp_mercado,
  };
  const comiteRes = await run(comiteCompraPromptSpec, comiteInput);
  recordCall(comiteCompraPromptSpec.id, comiteRes.costUsd, comiteRes.raw);
  const comite_compra = comiteRes.data;

  // Module 4: Proposta de Posicionamento
  const propInput: PropostaPosicionamentoInput = {
    dossierSummary,
    comiteCompraOutput: comite_compra,
  };
  const propRes = await run(propostaPosicionamentoPromptSpec, propInput);
  recordCall(propostaPosicionamentoPromptSpec.id, propRes.costUsd, propRes.raw);
  const proposta_posicionamento = propRes.data;

  // Module 5: Motor de Demanda
  const motorInput: MotorDemandaInput = {
    dossierSummary,
    posicionamentoOutput: proposta_posicionamento,
  };
  const motorRes = await run(motorDemandaPromptSpec, motorInput);
  recordCall(motorDemandaPromptSpec.id, motorRes.costUsd, motorRes.raw);
  const motor_demanda = motorRes.data;

  // Module 6: Funil & RevOps
  const funilInput: FunilRevOpsInput = {
    dossierSummary,
    motorDemandaOutput: motor_demanda,
  };
  const funilRes = await run(funilRevOpsPromptSpec, funilInput);
  recordCall(funilRevOpsPromptSpec.id, funilRes.costUsd, funilRes.raw);
  const funil_revops = funilRes.data;

  // Module 7: Unit Economics
  const unitInput: UnitEconomicsInput = {
    dossierSummary,
    crmOrFinancialInputs: input.crmOrFinancialInputs || {
      arpuMonthly: null,
      cacEstimated: null,
      churnMonthlyRate: null,
      salesCycleDays: null,
    },
  };
  const unitRes = await run(unitEconomicsPromptSpec, unitInput);
  recordCall(unitEconomicsPromptSpec.id, unitRes.costUsd, unitRes.raw);
  const unit_economics = unitRes.data;
  const hasRealCrmData = Boolean(
    input.crmOrFinancialInputs &&
    (input.crmOrFinancialInputs.arpuMonthly != null ||
     input.crmOrFinancialInputs.cacEstimated != null ||
     input.crmOrFinancialInputs.churnMonthlyRate != null ||
     input.crmOrFinancialInputs.salesCycleDays != null)
  );
  unit_economics.statusDados = hasRealCrmData ? 'DADOS REAIS FORNECIDOS' : 'BASEADO EM BENCHMARK DE MERCADO';
  // Module 8: Plano de Ação 90 Dias
  const allPreviousModulesSummary = {
    raio_x: raioX.resumoExecutivo,
    icp_mercado: icp_mercado.icpPrioritario,
    proposta_posicionamento: proposta_posicionamento.declaracaoPosicionamento,
    motor_demanda: motor_demanda.mixCanaisPrioritarios,
    funil_revops: funil_revops.etapasFunilB2B,
    unit_economics: unit_economics.metricasCalculadasOuBenchmark,
  };
  const planoInput: Plano90DiasInput = {
    dossierSummary,
    allPreviousModulesSummary,
  };
  const planoRes = await run(plano90DiasPromptSpec, planoInput);
  recordCall(plano90DiasPromptSpec.id, planoRes.costUsd, planoRes.raw);
  
  // Compute ICE and sort initiatives deterministically
  const plano_90_dias = computeAndSortIce(planoRes.data as any) as Plano90DiasOutput;

  const modules = {
    raio_x: raioX,
    icp_mercado,
    comite_compra,
    proposta_posicionamento,
    motor_demanda,
    funil_revops,
    unit_economics,
    plano_90_dias,
  };

  // 6. Critic Audit
  const criticInput: CriticInput = {
    dossier: dossier as unknown as Record<string, unknown>,
    modules: modules as unknown as Record<string, unknown>,
    evidences: citableEvidences,
  };
  const criticRes = await run(criticPromptSpec, criticInput);
  recordCall(criticPromptSpec.id, criticRes.costUsd, criticRes.raw);
  const critic = criticRes.data;

  return {
    companyName: input.companyName,
    websiteUrl: input.websiteUrl,
    declaredPhase: input.declaredPhase,
    competitors: input.competitors,
    cnpjData: cnpjResult,
    collectionResult: collection,
    extractions,
    dossier,
    modules,
    critic,
    qualityChecks: { downgradedClaims, numericFindings },
    metrics: {
      totalCostUsd,
      totalLatencyMs,
      callsCount: breakdown.length,
      breakdown,
    },
  };
}
