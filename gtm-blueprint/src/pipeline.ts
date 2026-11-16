import type { LlmProvider } from './ai/types.js';
import { runPrompt } from './ai/run.js';
import type { PromptSpec } from './prompts/types.js';
import { enforceEvidence, enforcePersonaHypothesis, renderEvidenceCompact } from './prompts/evidence.js';
import { enforceNumberProvenance, userInputEvidence, type NumericFinding } from './prompts/numberGuard.js';
import { fetchCnpjData } from './compute/cnpj.js';
import { collectSiteData, type CollectionResult } from './collect/site.js';
import { computeAndSortIce, type Plano90DiasData } from './compute/ice.js';
import { computeUnitEconomics, computeSomAnual, computedEvidence } from './compute/unitEconomics.js';
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
    // Fração mensal: 0,035 = 3,5% ao mês (LTV = ARPU ÷ churn mensal).
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
  collectionResult: CollectionResult;
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
  qualityChecks: { downgradedClaims: number; numericFindings: NumericFinding[] };
  metrics: {
    totalCostUsd: number;
    totalLatencyMs: number;
    callsCount: number;
    breakdown: CallMetric[];
  };
}

/** Código de erro do pipeline quando o site informado não entrega nenhuma página para análise. */
export const SITE_INACESSIVEL = 'site_inacessivel';

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
  const cnpjResult = await fetchCnpjData(input.cnpj, { origem: 'informado pelo lead' });
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
  // Sem nenhuma página do site não há o que analisar: aborta antes de qualquer chamada de modelo.
  if (!collection.evidences.some((ev) => ev.kind === 'site')) {
    throw new Error(SITE_INACESSIVEL);
  }
  allEvidences.push(...collection.evidences);

  // Unit economics e SOM anual são calculados por código: os módulos interpretam, não calculam.
  const unitCalc = computeUnitEconomics(input.crmOrFinancialInputs);
  const somAnual = computeSomAnual(input.tamBottomUpData);
  const calcEvidence = computedEvidence(unitCalc, somAnual);

  // Every Claim is checked in code against the evidence actually collected: invented ids are dropped
  // and VERIFICADO without valid evidence is downgraded to HIPOTESE (the model is not trusted for this).
  // Client-declared numbers are citable as U1 and computed values as C1; both stay out of allEvidences so the extraction loop skips them.
  const citableEvidences: Evidence[] = [
    ...allEvidences,
    userInputEvidence(input, collection.competitors),
    ...(calcEvidence ? [calcEvidence] : []),
  ];
  const validEvidenceIds = new Set(citableEvidences.map((e) => e.id));
  let downgradedClaims = 0;
  const numericFindings: NumericFinding[] = [];
  const run = async <I, O>(spec: PromptSpec<I, O>, promptInput: I) => {
    const res = await runPrompt(spec, promptInput, { providers: input.providers });
    const checked = enforceEvidence(res.data, validEvidenceIds);
    downgradedClaims += checked.downgraded;
    const personas = enforcePersonaHypothesis(checked.value, validEvidenceIds);
    downgradedClaims += personas.downgraded;
    const guarded = enforceNumberProvenance(personas.value, { evidences: citableEvidences }, { pathPrefix: spec.id });
    downgradedClaims += guarded.downgradedClaims;
    numericFindings.push(...guarded.findings);
    return { ...res, data: guarded.value };
  };

  // 3. Extract each page in parallel (limit 3 concurrency). Only site pages are extracted, never the CNPJ record.
  const pageEvidences = allEvidences.filter((ev) => ev.kind === 'site' || ev.kind === 'competitor_site');
  const extractions: ExtractOutput[] = [];
  const limit = 3;
  for (let i = 0; i < pageEvidences.length; i += limit) {
    const chunk = pageEvidences.slice(i, i + limit);
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
    competitors: collection.competitors,
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

  // Módulos recebem o dossiê inteiro e o texto das evidências dentro de um orçamento maior.
  const dossierSummary = {
    ...dossier,
    evidenciasDisponiveis: renderEvidenceCompact(citableEvidences, 40000),
  };

  // 5. Module 1: Raio-X
  const raioXInput: RaioXInput = { dossierSummary };
  const raioXRes = await run(raioXPromptSpec, raioXInput);
  recordCall(raioXPromptSpec.id, raioXRes.costUsd, raioXRes.raw);
  const raioX = raioXRes.data;

  // Module 2: ICP & Mercado
  // No invented defaults: without real market data the module receives null and must say what to collect.
  const icpInput: IcpMercadoInput = {
    dossierSummary,
    tamBottomUpData: input.tamBottomUpData ?? null,
    somAnualCalculado: somAnual,
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
    calculado: unitCalc,
  };
  const unitRes = await run(unitEconomicsPromptSpec, unitInput);
  recordCall(unitEconomicsPromptSpec.id, unitRes.costUsd, unitRes.raw);
  const unit_economics = unitRes.data;

  // Module 8: Plano de Ação 90 Dias
  const allPreviousModulesSummary = {
    raio_x: raioX.resumoExecutivo,
    icp_mercado: icp_mercado.icpPrioritario,
    proposta_posicionamento: proposta_posicionamento.declaracaoPosicionamento,
    motor_demanda: motor_demanda.mixCanaisPrioritarios,
    funil_revops: funil_revops.etapasFunilB2B,
    unit_economics: unit_economics.leituraFinanceira,
  };
  const planoInput: Plano90DiasInput = {
    dossierSummary,
    allPreviousModulesSummary,
  };
  const planoRes = await run(plano90DiasPromptSpec, planoInput);
  recordCall(plano90DiasPromptSpec.id, planoRes.costUsd, planoRes.raw);

  // Compute ICE and sort initiatives deterministically. ice.ts ainda tipa descricao/focoPrincipal como Claim;
  // a ordenação lê apenas as notas, então a conversão para o tipo de entrada não altera o conteúdo.
  const plano_90_dias = computeAndSortIce(planoRes.data as unknown as Plano90DiasData) as unknown as Plano90DiasOutput;

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

  // 6. Critic Audit. Sem `run`: o crítico lê a saída já guardada e não pode ter a própria saída alterada pelas travas.
  // Recebe o cálculo de unit economics junto da saída do módulo, para não reprovar número que o código calculou.
  const criticInput: CriticInput = {
    dossier: dossier as unknown as Record<string, unknown>,
    modules: { ...modules, unit_economics: { ...unit_economics, calculado: unitCalc } } as unknown as Record<string, unknown>,
    evidences: citableEvidences,
  };
  const criticRes = await runPrompt(criticPromptSpec, criticInput, { providers: input.providers });
  recordCall(criticPromptSpec.id, criticRes.costUsd, criticRes.raw);
  const critic = criticRes.data;

  return {
    companyName: input.companyName,
    websiteUrl: input.websiteUrl,
    declaredPhase: input.declaredPhase,
    competitors: input.competitors,
    cnpjData: cnpjResult,
    collectionResult: { ...collection, gaps: [...collection.gaps, ...(cnpjResult.gap ? [cnpjResult.gap] : [])] },
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
