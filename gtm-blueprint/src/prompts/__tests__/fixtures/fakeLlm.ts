import type { LlmProvider } from '../../../ai/types.js';

export type PromptKind =
  | 'extract'
  | 'dossier'
  | 'raio_x'
  | 'icp_mercado'
  | 'comite_compra'
  | 'proposta_posicionamento'
  | 'motor_demanda'
  | 'funil_revops'
  | 'unit_economics'
  | 'plano_90_dias'
  | 'critic'
  | 'unknown';

export type Responder = (userPrompt: string) => unknown;
export type Overrides = Partial<Record<PromptKind, Responder>>;

// Marcadores fixos das mensagens de usuário de cada prompt (ver buildUser em cada spec).
const MODULE_MARKERS: Array<[string, PromptKind]> = [
  ['gere o Módulo 1 ', 'raio_x'],
  ['gere o Módulo 2 ', 'icp_mercado'],
  ['gere o Módulo 3 ', 'comite_compra'],
  ['gere o Módulo 4 ', 'proposta_posicionamento'],
  ['gere o Módulo 5 ', 'motor_demanda'],
  ['gere o Módulo 6 ', 'funil_revops'],
  ['gere o Módulo 7 ', 'unit_economics'],
  ['gere o Módulo 8 ', 'plano_90_dias'],
];

export function routeKind(userPrompt: string): PromptKind {
  if (userPrompt.includes('Construa o Dossiê Estratégico')) return 'dossier';
  if (userPrompt.includes('PAYLOAD JSON')) return 'critic';
  if (userPrompt.includes('CONTEÚDO BRUTO')) return 'extract';
  const module = MODULE_MARKERS.find(([marker]) => userPrompt.includes(marker));
  return module ? module[1] : 'unknown';
}

const hipotese = (text = 'Hipótese de teste sobre a empresa.') => ({
  text,
  status: 'HIPOTESE' as const,
  evidenceIds: [],
  howToValidate: 'Validar em entrevistas de discovery.',
});

const NEXT_STEPS = [{ acao: 'Revisar a página de planos', responsavelRole: 'Head de Growth', prazoDias: 7 }];

const DEFAULTS: Record<PromptKind, Responder> = {
  extract: () => ({
    url: 'https://acme.test',
    propostaValorDeclarada: null,
    icpDeclarado: null,
    produtosPlanosPrecos: [],
    provasSociais: [],
    ctasConversao: [],
    sinaisMaturidade: [],
    lacunasOuInconsistencias: [],
  }),
  dossier: () => ({
    teseCentral: 'Tese de teste para o dossiê.',
    estagioRealVsDeclarado: {
      declarado: 'Estruturação Inicial',
      realidadeAuditada: 'Site institucional com proposta de valor genérica.',
      contradiçõesEncontradas: [hipotese()],
    },
    modeloNegocio: { tipo: 'Self-Service + Inside Sales', monetizacao: hipotese(), ticketMedioEstimado: hipotese() },
    icpAtualFirmografico: {
      segmentoSetor: hipotese(),
      tamanhoEmpresa: hipotese(),
      faturamentoAnualOuFaixa: hipotese(),
      tecnologiasOuSinaisChave: hipotese(),
    },
    comiteCompraB2B: [
      { papel: 'Decisor (C-Level/Diretor)', nomeFantasiaPersona: 'Persona A', dorPrincipal: hipotese(), gatilhoDeCompra: hipotese(), objecaoPrincipal: hipotese() },
      { papel: 'Influenciador Técnico', nomeFantasiaPersona: 'Persona B', dorPrincipal: hipotese(), gatilhoDeCompra: hipotese(), objecaoPrincipal: hipotese() },
      { papel: 'Usuário Final', nomeFantasiaPersona: 'Persona C', dorPrincipal: hipotese(), gatilhoDeCompra: hipotese(), objecaoPrincipal: hipotese() },
    ],
    concorrentesReais: [],
    sinaisMaturidadeGtm: [hipotese()],
    topRiscos: [hipotese(), hipotese(), hipotese()],
    lacunasDeDadosCriticas: [],
  }),
  raio_x: () => ({
    resumoExecutivo: 'Resumo executivo de teste.',
    achadosCriticosReceita: [0, 1, 2].map((i) => ({
      titulo: `Achado ${i}`,
      impactoFinanceiroEstimado: 'Impacto qualitativo de teste.',
      evidenciaOuHipotese: hipotese(),
      custoDeInacao: 'Custo de inação de teste.',
    })),
    decisao: 'Decisão de teste.',
    proximosPassos: NEXT_STEPS,
  }),
  icp_mercado: () => ({
    icpPrioritario: { descricaoFirmografica: hipotese(), criteriosQualificacao: [hipotese()], sinaisDeMomentoTrigger: [hipotese()] },
    antiIcp: { descricaoEvitar: hipotese(), motivoDescarte: hipotese() },
    tamSamSomInterpretacao: { analiseMercado: hipotese(), potencialReceitaAnualSom: 'Não calculado.' },
    criteriosPriorizacaoContas: ['Critério A', 'Critério B', 'Critério C'],
    decisao: 'Decisão de ICP de teste.',
    proximosPassos: NEXT_STEPS,
  }),
  comite_compra: () => ({
    membrosComite: [0, 1, 2].map((i) => ({
      papel: ['Decisor (C-Level/Diretor)', 'Influenciador Técnico', 'Usuário Final'][i],
      nomeCargo: `Cargo ${i}`,
      dorPrimaria: hipotese(),
      gatilhoConversao: hipotese(),
      objecaoChave: hipotese(),
      criterioAvaliacao: hipotese(),
      mensagemChaveProposta: hipotese(),
    })),
    dinamicaAprovacao: hipotese(),
    decisao: 'Decisão de comitê de teste.',
    proximosPassos: NEXT_STEPS,
  }),
  proposta_posicionamento: () => ({
    declaracaoPosicionamento: hipotese('Para times comerciais B2B, a Acme é a plataforma de prospecção.'),
    pilaresDiferenciacao: [0, 1, 2].map((i) => ({ pilar: `Pilar ${i}`, descricao: hipotese(), defensibilidade: hipotese() })),
    provasNecessariasAusentes: [hipotese()],
    decisao: 'Decisão de posicionamento de teste.',
    proximosPassos: NEXT_STEPS,
  }),
  motor_demanda: () => ({
    mixCanaisPrioritarios: [
      { canal: 'Outbound Rigoroso', alocacaoEsforcoPercentual: 50, justificativaEstagioIcp: hipotese(), playConcretoExecucao: hipotese() },
      { canal: 'Founder-Led LinkedIn / Social Selling', alocacaoEsforcoPercentual: 30, justificativaEstagioIcp: hipotese(), playConcretoExecucao: hipotese() },
      { canal: 'Inbound / SEO Técnico', alocacaoEsforcoPercentual: 20, justificativaEstagioIcp: hipotese(), playConcretoExecucao: hipotese() },
    ],
    ritualOperacionalGtm: hipotese(),
    decisao: 'Decisão de canais de teste.',
    proximosPassos: NEXT_STEPS,
  }),
  funil_revops: () => ({
    etapasFunilB2B: [0, 1, 2, 3].map((i) => ({ estagio: `Etapa ${i}`, criterioAvancoSla: hipotese(), conversaoEsperadaBenchmark: hipotese() })),
    slasSdrAeCs: [0, 1].map((i) => ({ transicao: `Transição ${i}`, slaTempoMaximo: hipotese(), regraPassagem: hipotese() })),
    gapsProcessoCRM: [hipotese()],
    decisao: 'Decisão de funil de teste.',
    proximosPassos: NEXT_STEPS,
  }),
  unit_economics: () => ({
    statusDados: 'DADOS AUSENTES - NECESSITA COLETA',
    metricasCalculadasOuBenchmark: {
      arpu: hipotese(),
      cac: hipotese(),
      ltv: hipotese(),
      paybackMeses: hipotese(),
      ltvCacRatio: hipotese(),
    },
    travaFinanceiraRisco: hipotese(),
    dadosParaColetarSeAusentes: ['Extrato de vendas do ERP'],
    decisao: 'Decisão financeira de teste.',
    proximosPassos: NEXT_STEPS,
  }),
  plano_90_dias: () => ({
    ondasExecucao: (['onda_1', 'onda_2', 'onda_3'] as const).map((onda) => ({
      onda,
      focoPrincipal: hipotese(),
      iniciativasPraticas: [0, 1].map((i) => ({
        titulo: `Iniciativa ${onda} ${i}`,
        descricao: hipotese(),
        impactoEstimado1a10: 8,
        confianca1a10: 7,
        facilidade1a10: 6,
        ownerRole: 'Head de Growth',
        prazoDias: 14,
      })),
    })),
    metricasSucesso90Dias: [hipotese(), hipotese(), hipotese()],
    criteriosPerseverarOuPivotar: { criterioPerseverar: hipotese(), criterioPivotar: hipotese() },
    decisao: 'Decisão de plano de teste.',
    proximosPassos: NEXT_STEPS,
  }),
  critic: () => criticWith(),
  unknown: () => {
    throw new Error('Prompt inesperado no teste.');
  },
};

export function criticWith(descricao?: string): unknown {
  return {
    issuesFound: descricao
      ? [{
          locationPath: 'modules.funil_revops.etapasFunilB2B',
          tipoProblema: 'Número inventado / sem fonte',
          descricao,
          severidade: 'ALTA',
          sugestaoCorrecao: 'Remover o número.',
        }]
      : [],
    rubricaQualidade0a10: {
      especificidadeB2B: 7,
      rigorEvidenciaEpistemica: 7,
      coerenciaNarrativa: 7,
      acionabilidadePragmatica: 7,
      scoreGeralMedio: 7,
    },
    parecerFinalAprovacao: 'REQUER AJUSTES',
  };
}

/** Provedor falso para o caminho `bedrock`. Registra o tipo e o texto de cada chamada. */
export function fakeLlm(overrides: Overrides = {}): {
  provider: LlmProvider;
  calls: PromptKind[];
  prompts: Array<{ kind: PromptKind; user: string }>;
} {
  const calls: PromptKind[] = [];
  const prompts: Array<{ kind: PromptKind; user: string }> = [];
  const provider: LlmProvider = {
    name: 'bedrock',
    async complete(model, req) {
      const user = req.messages[0]?.content ?? '';
      const kind = routeKind(user);
      calls.push(kind);
      prompts.push({ kind, user });
      const respond = overrides[kind] ?? DEFAULTS[kind];
      return {
        text: JSON.stringify(respond(user)),
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        model,
        provider: 'bedrock',
        latencyMs: 1,
      };
    },
  };
  return { provider, calls, prompts };
}
