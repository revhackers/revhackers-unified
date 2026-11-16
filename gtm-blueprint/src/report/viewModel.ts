import type { DossierOutput } from '../prompts/dossier.js';
import type { Claim, Recomendacao } from '../prompts/evidence.js';
import { scoreIce } from '../compute/ice.js';
import type { CollectStage, DiagnosticInput, ModuleKey, ModuleOutputs } from '../stages.js';
import type { LeadReport, ReportBlock, ReportItem, ReportOnda, ReportProximoPasso, ReportSection, ReportSectionId } from './types.js';

export interface ReportState {
  input: DiagnosticInput;
  collect?: CollectStage;
  dossier?: DossierOutput;
  modules: Partial<ModuleOutputs>;
  /** Módulos que falharam nesta execução: a seção fica indisponível e as demais seguem. */
  failed: ModuleKey[];
}

type Etapa = 'coleta' | 'dossie' | ModuleKey;

// Dez etapas: coleta, dossiê e os oito módulos. `progresso.total` é 10.
const ETAPAS: Array<{ etapa: Etapa; rotulo: string }> = [
  { etapa: 'coleta', rotulo: 'Leitura do site e fontes' },
  { etapa: 'dossie', rotulo: 'Dossiê estratégico' },
  { etapa: 'raio_x', rotulo: 'Raio-X executivo' },
  { etapa: 'icp_mercado', rotulo: 'ICP e mercado' },
  { etapa: 'comite_compra', rotulo: 'Comitê de compra' },
  { etapa: 'proposta_posicionamento', rotulo: 'Posicionamento' },
  { etapa: 'motor_demanda', rotulo: 'Motor de demanda' },
  { etapa: 'funil_revops', rotulo: 'Funil e RevOps' },
  { etapa: 'unit_economics', rotulo: 'Unit economics' },
  { etapa: 'plano_90_dias', rotulo: 'Plano de 90 dias' },
];

const SECAO_TITULOS: Record<ReportSectionId, string> = {
  dossie: 'Mercado e riscos',
  icp_mercado: 'ICP e mercado',
  comite_compra: 'Comitê de compra',
  proposta_posicionamento: 'Posicionamento',
  motor_demanda: 'Motor de demanda',
  funil_revops: 'Funil e RevOps',
  unit_economics: 'Unit economics',
  plano_90_dias: 'Critérios do plano',
};

const ONDA_ROTULOS: Record<ReportOnda, string> = {
  onda_1: 'Dias 1–30 · Fundação',
  onda_2: 'Dias 31–60 · Tração',
  onda_3: 'Dias 61–90 · Escala',
};

interface ConteudoSecao {
  decisao?: string;
  blocos: ReportBlock[];
  proximosPassos: ReportProximoPasso[];
}

// Claim VERIFICADO é fato com fonte; HIPOTESE leva o como validar. Recomendação nunca vira fato.
const claimItem = (c: Claim): ReportItem =>
  c.status === 'VERIFICADO'
    ? { tipo: 'OBSERVADO', texto: c.text, fontes: c.evidenceIds }
    : { tipo: 'HIPOTESE', texto: c.text, fontes: c.evidenceIds, comoValidar: c.howToValidate };

const recItem = (r: Recomendacao): ReportItem => ({ tipo: 'RECOMENDACAO', texto: r.text, fontes: r.baseadoEm });

const passos = (lista: Array<{ acao: string; responsavelRole: string; prazoDias: number }>): ReportProximoPasso[] =>
  lista.map((p) => ({ acao: p.acao, responsavel: p.responsavelRole, prazoDias: p.prazoDias }));

function secao(id: ReportSectionId, status: ReportSection['status'], conteudo: ConteudoSecao | undefined): ReportSection {
  return {
    id,
    titulo: SECAO_TITULOS[id],
    status,
    decisao: conteudo?.decisao,
    blocos: conteudo?.blocos ?? [],
    proximosPassos: conteudo?.proximosPassos ?? [],
  };
}

function conteudoDossie(d: DossierOutput): ConteudoSecao {
  const blocos: ReportBlock[] = [
    { rotulo: 'Modelo de negócio', itens: [claimItem(d.modeloNegocio.monetizacao), claimItem(d.modeloNegocio.ticketMedioEstimado)] },
    {
      rotulo: 'ICP atual',
      itens: [
        claimItem(d.icpAtualFirmografico.segmentoSetor),
        claimItem(d.icpAtualFirmografico.tamanhoEmpresa),
        claimItem(d.icpAtualFirmografico.faturamentoAnualOuFaixa),
        claimItem(d.icpAtualFirmografico.tecnologiasOuSinaisChave),
      ],
    },
    ...d.concorrentesReais.map((c): ReportBlock => ({
      rotulo: `Concorrente: ${c.nome}`,
      itens: [claimItem(c.posicionamentoVsNos), claimItem(c.diferencialObservado)],
    })),
    { rotulo: 'Sinais de maturidade', itens: d.sinaisMaturidadeGtm.map(claimItem) },
    { rotulo: 'Riscos', itens: d.topRiscos.map(claimItem) },
  ];
  return { blocos, proximosPassos: [] };
}

function conteudoIcp(m: ModuleOutputs['icp_mercado']): ConteudoSecao {
  return {
    decisao: m.decisao,
    blocos: [
      { rotulo: 'ICP prioritário', itens: [recItem(m.icpPrioritario.descricaoFirmografica)] },
      { rotulo: 'Critérios de qualificação', itens: m.icpPrioritario.criteriosQualificacao.map(recItem) },
      { rotulo: 'Sinais de momento', itens: m.icpPrioritario.sinaisDeMomentoTrigger.map(recItem) },
      { rotulo: 'Anti-ICP', itens: [recItem(m.antiIcp.descricaoEvitar), recItem(m.antiIcp.motivoDescarte)] },
      { rotulo: 'Mercado', itens: [claimItem(m.tamSamSomInterpretacao.analiseMercado)] },
      { rotulo: 'Priorização de contas', itens: m.criteriosPriorizacaoContas.map((texto): ReportItem => ({ tipo: 'RECOMENDACAO', texto, fontes: [] })) },
    ],
    proximosPassos: passos(m.proximosPassos),
  };
}

function conteudoComite(m: ModuleOutputs['comite_compra']): ConteudoSecao {
  const blocos: ReportBlock[] = [
    ...m.membrosComite.map((membro): ReportBlock => ({
      rotulo: `${membro.papel} — ${membro.cargo}`,
      itens: [
        claimItem(membro.dorPrimaria),
        claimItem(membro.gatilhoConversao),
        claimItem(membro.objecaoChave),
        claimItem(membro.criterioAvaliacao),
        recItem(membro.mensagemChaveProposta),
      ],
    })),
    { rotulo: 'Dinâmica de aprovação', itens: [claimItem(m.dinamicaAprovacao)] },
  ];
  return { decisao: m.decisao, blocos, proximosPassos: passos(m.proximosPassos) };
}

function conteudoPosicionamento(m: ModuleOutputs['proposta_posicionamento']): ConteudoSecao {
  const blocos: ReportBlock[] = [
    { rotulo: 'Declaração', itens: [recItem(m.declaracaoPosicionamento)] },
    ...m.pilaresDiferenciacao.map((pilar): ReportBlock => ({
      rotulo: pilar.pilar,
      itens: [claimItem(pilar.descricao), claimItem(pilar.defensibilidade)],
    })),
    { rotulo: 'Provas que faltam', itens: m.provasNecessariasAusentes.map(claimItem) },
  ];
  return { decisao: m.decisao, blocos, proximosPassos: passos(m.proximosPassos) };
}

function conteudoMotor(m: ModuleOutputs['motor_demanda']): ConteudoSecao {
  const blocos: ReportBlock[] = [
    ...m.mixCanaisPrioritarios.map((canal): ReportBlock => ({
      rotulo: `${canal.canal} — ${canal.alocacaoEsforcoPercentual}% do esforço`,
      itens: [claimItem(canal.justificativaEstagioIcp), recItem(canal.playConcretoExecucao)],
    })),
    { rotulo: 'Ritual operacional', itens: [recItem(m.ritualOperacionalGtm)] },
  ];
  return { decisao: m.decisao, blocos, proximosPassos: passos(m.proximosPassos) };
}

function conteudoFunil(m: ModuleOutputs['funil_revops']): ConteudoSecao {
  const blocos: ReportBlock[] = [
    ...m.etapasFunilB2B.map((etapa): ReportBlock => ({
      rotulo: etapa.estagio,
      itens: [recItem(etapa.criterioAvancoSla), recItem(etapa.comoMedirConversao)],
    })),
    ...m.slasSdrAeCs.map((sla): ReportBlock => ({
      rotulo: sla.transicao,
      itens: [recItem(sla.slaTempoMaximo), recItem(sla.regraPassagem)],
    })),
    { rotulo: 'Gaps de processo no CRM', itens: m.gapsProcessoCRM.map(claimItem) },
  ];
  return { decisao: m.decisao, blocos, proximosPassos: passos(m.proximosPassos) };
}

function conteudoUnit(m: ModuleOutputs['unit_economics']): ConteudoSecao {
  return {
    decisao: m.decisao,
    blocos: [
      { rotulo: 'Leitura', itens: [claimItem(m.leituraFinanceira)] },
      { rotulo: 'Risco financeiro', itens: [claimItem(m.travaFinanceiraRisco)] },
    ],
    proximosPassos: passos(m.proximosPassos),
  };
}

function conteudoPlano(m: ModuleOutputs['plano_90_dias']): ConteudoSecao {
  return {
    decisao: m.decisao,
    blocos: [
      { rotulo: 'Indicadores de sucesso', itens: m.metricasSucesso90Dias.map(recItem) },
      {
        rotulo: 'Perseverar ou pivotar',
        itens: [recItem(m.criteriosPerseverarOuPivotar.criterioPerseverar), recItem(m.criteriosPerseverarOuPivotar.criterioPivotar)],
      },
    ],
    proximosPassos: passos(m.proximosPassos),
  };
}

/**
 * Converte o estado do pipeline no relatório do lead. Campos sem dado ficam nulos ou vazios; módulo que falhou
 * vira seção `indisponivel`. Nenhum número entra aqui que o pipeline não tenha guardado ou calculado.
 */
export function buildLeadReport(state: ReportState): LeadReport {
  const { input, collect, dossier, modules, failed } = state;

  const feito = (etapa: Etapa): boolean => {
    if (etapa === 'coleta') return collect !== undefined;
    if (etapa === 'dossie') return dossier !== undefined;
    return modules[etapa] !== undefined;
  };
  const statusModulo = (k: ModuleKey): ReportSection['status'] => {
    if (modules[k] !== undefined) return 'pronto';
    return failed.includes(k) ? 'indisponivel' : 'pendente';
  };

  const pendente = ETAPAS.find(({ etapa }) => !feito(etapa) && !(etapa !== 'coleta' && etapa !== 'dossie' && failed.includes(etapa)));

  const contradicoes: ReportItem[] = dossier
    ? [
        ...(dossier.icpDeclaradoVsClientes.alinhamento === 'PARCIAL' || dossier.icpDeclaradoVsClientes.alinhamento === 'DIVERGENTE'
          ? [claimItem(dossier.icpDeclaradoVsClientes.leitura)]
          : []),
        ...dossier.estagioRealVsDeclarado.contradicoesEncontradas.map(claimItem),
      ]
    : [];

  const dadosAColetar = [
    ...new Set([
      ...(dossier?.lacunasDeDadosCriticas ?? []),
      ...(modules.unit_economics?.dadosParaColetarSeAusentes ?? []),
      ...(collect?.unitEconomics.faltantes ?? []).map((faltante) => `Dado para unit economics: ${faltante}`),
    ]),
  ];

  const unit = collect?.unitEconomics;

  return {
    versao: 1,
    empresa: { nome: input.companyName, site: input.websiteUrl, faseDeclarada: input.declaredPhase },
    progresso: {
      concluidas: ETAPAS.filter(({ etapa }) => feito(etapa)).length,
      total: 10,
      etapaAtual: pendente?.rotulo ?? null,
    },
    fontes: (collect?.evidences ?? [])
      .filter((ev) => ev.id !== 'U1' && ev.id !== 'C1')
      .map((ev) => ({ id: ev.id, tipo: ev.kind, url: ev.source, coletadaEm: ev.fetchedAt })),
    lacunasDeColeta: collect?.gaps ?? [],
    stackDetectada: collect?.signals ?? [],
    tese: dossier?.teseCentral ?? null,
    contradicoes,
    achados: (modules.raio_x?.achadosCriticosReceita ?? []).map((a) => ({
      titulo: a.titulo,
      impacto: a.impactoNaReceita,
      custoDeInacao: a.custoDeInacao,
      base: claimItem(a.evidenciaOuHipotese),
    })),
    decisaoDaSemana: modules.raio_x?.decisao ?? null,
    plano90Dias: (modules.plano_90_dias?.ondasExecucao ?? []).map((onda) => ({
      onda: onda.onda,
      rotulo: ONDA_ROTULOS[onda.onda],
      foco: recItem(onda.focoPrincipal),
      iniciativas: onda.iniciativasPraticas.map((i) => ({
        titulo: i.titulo,
        descricao: recItem(i.descricao),
        ice: i.scoreIceCalculado ?? scoreIce(i.impactoEstimado1a10, i.confianca1a10, i.facilidade1a10),
        impacto: i.impactoEstimado1a10,
        confianca: i.confianca1a10,
        facilidade: i.facilidade1a10,
        responsavel: i.ownerRole,
        prazoDias: i.prazoDias,
      })),
    })),
    unitEconomics: unit
      ? {
          status: unit.status,
          arpuMensal: unit.arpuMensal,
          cac: unit.cac,
          churnMensal: unit.churnMensal,
          cicloVendasDias: unit.cicloVendasDias,
          ltv: unit.ltv,
          paybackMeses: unit.paybackMeses,
          ltvCac: unit.ltvCac,
        }
      : null,
    dadosAColetar,
    secoes: [
      secao('dossie', dossier ? 'pronto' : 'pendente', dossier && conteudoDossie(dossier)),
      secao('icp_mercado', statusModulo('icp_mercado'), modules.icp_mercado && conteudoIcp(modules.icp_mercado)),
      secao('comite_compra', statusModulo('comite_compra'), modules.comite_compra && conteudoComite(modules.comite_compra)),
      secao('proposta_posicionamento', statusModulo('proposta_posicionamento'), modules.proposta_posicionamento && conteudoPosicionamento(modules.proposta_posicionamento)),
      secao('motor_demanda', statusModulo('motor_demanda'), modules.motor_demanda && conteudoMotor(modules.motor_demanda)),
      secao('funil_revops', statusModulo('funil_revops'), modules.funil_revops && conteudoFunil(modules.funil_revops)),
      secao('unit_economics', statusModulo('unit_economics'), modules.unit_economics && conteudoUnit(modules.unit_economics)),
      secao('plano_90_dias', statusModulo('plano_90_dias'), modules.plano_90_dias && conteudoPlano(modules.plano_90_dias)),
    ],
  };
}
