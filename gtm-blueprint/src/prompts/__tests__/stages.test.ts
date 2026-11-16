// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { stageDossier, stageModule, runModulesDag, type CollectStage, type DiagnosticInput } from '../../stages.js';
import { computeUnitEconomics } from '../../compute/unitEconomics.js';
import { fakeLlm, hipotese, recomendacao } from './fixtures/fakeLlm.js';
import type { Evidence } from '../evidence.js';

const BASE_INPUT: DiagnosticInput = {
  companyName: 'Acme',
  websiteUrl: 'https://acme.test',
  declaredPhase: 'Primeira Tração Validada',
  competitors: [],
};

// Coleta vazia: dossiê e módulos rodam sobre um contrato sem evidências.
const COLLECT: CollectStage = {
  evidences: [],
  citable: [],
  gaps: [],
  competitors: [],
  signals: [],
  unitEconomics: computeUnitEconomics(undefined),
  somAnual: null,
  cnpj: { ageYears: null, porte: null, uf: null },
};

/** Plano válido com as notas de impacto, confiança e facilidade de cada iniciativa de uma onda. */
function plano(notas: Array<[number, number, number]>): unknown {
  return {
    ondasExecucao: ['onda_1', 'onda_2', 'onda_3'].map((onda) => ({
      onda,
      focoPrincipal: recomendacao(),
      iniciativasPraticas: notas.map(([impacto, confianca, facilidade], n) => ({
        titulo: `${onda} ${n}`,
        descricao: recomendacao(),
        impactoEstimado1a10: impacto,
        confianca1a10: confianca,
        facilidade1a10: facilidade,
        ownerRole: 'Head de Growth',
        prazoDias: 14,
      })),
    })),
    metricasSucesso90Dias: [recomendacao(), recomendacao(), recomendacao()],
    criteriosPerseverarOuPivotar: { criterioPerseverar: recomendacao(), criterioPivotar: recomendacao() },
    decisao: 'Decisão de plano de teste.',
    proximosPassos: [{ acao: 'Revisar a página de planos', responsavelRole: 'Head de Growth', prazoDias: 7 }],
  };
}

describe('runModulesDag', () => {
  it('espera as dependências de MODULE_DEPS e inicia os módulos sem dependência sem esperar a cadeia', async () => {
    const events: string[] = [];
    let releaseIcp!: () => void;
    const icpDone = new Promise<void>((resolve) => {
      releaseIcp = resolve;
    });

    const dag = runModulesDag(async (key) => {
      events.push(`start ${key}`);
      if (key === 'icp_mercado') await icpDone;
      events.push(`end ${key}`);
    });

    await vi.waitFor(() => {
      expect(events).toEqual(expect.arrayContaining(['start raio_x', 'start unit_economics', 'start icp_mercado']));
    });
    expect(events).not.toContain('start comite_compra');

    releaseIcp();
    await dag;

    expect(events.indexOf('start comite_compra')).toBeGreaterThan(events.indexOf('end icp_mercado'));
    expect(events.indexOf('start plano_90_dias')).toBeGreaterThan(events.indexOf('end funil_revops'));
    expect(events).toHaveLength(16);
  });
});

describe('stageModule', () => {
  it('entrega a dependência ausente como {} ao módulo que a consome', async () => {
    const { provider, prompts } = fakeLlm();
    const deps = { providers: { bedrock: provider } };
    const dossier = (await stageDossier(BASE_INPUT, COLLECT, [], deps)).data;

    await stageModule('comite_compra', { input: BASE_INPUT, collect: COLLECT, dossier, modules: {} }, deps);

    const comitePrompt = prompts.find((p) => p.kind === 'comite_compra')?.user ?? '';
    expect(comitePrompt).toContain('ICP DEFINIDO NO MÓDULO ANTERIOR:\n{}');
  });

  it('ordena as iniciativas do plano pelo score ICE calculado por código', async () => {
    const { provider } = fakeLlm({ plano_90_dias: () => plano([[5, 5, 5], [9, 9, 9]]) });
    const deps = { providers: { bedrock: provider } };
    const dossier = (await stageDossier(BASE_INPUT, COLLECT, [], deps)).data;

    const out = await stageModule('plano_90_dias', { input: BASE_INPUT, collect: COLLECT, dossier, modules: {} }, deps);

    expect(out.data.ondasExecucao[0]?.iniciativasPraticas.map((i) => i.scoreIceCalculado)).toEqual([729, 125]);
  });
});

describe('stageDossier (contagem de clientes por código)', () => {
  it('mantém a leitura com a contagem de clientesObservados via D1', async () => {
    const evidences: Evidence[] = ['E1', 'E2', 'E3'].map((id) => ({
      id,
      kind: 'site',
      source: 'https://acme.test',
      fetchedAt: '2026-11-13T00:00:00.000Z',
      content: `Case do cliente ${id} publicado no site.`,
    }));
    const collect: CollectStage = { ...COLLECT, evidences, citable: evidences };
    const clientesObservados = ['E1', 'E2', 'E3'].map((evidenceId, i) => ({
      nome: `Cliente ${i + 1}`,
      setorAparente: 'SaaS B2B',
      evidenceId,
    }));
    const { provider } = fakeLlm({
      dossier: () => ({
        teseCentral: 'Tese de teste para o dossiê.',
        estagioRealVsDeclarado: {
          declarado: 'Estruturação Inicial',
          realidadeAuditada: 'Site institucional com proposta de valor genérica.',
          contradicoesEncontradas: [hipotese()],
        },
        modeloNegocio: { tipo: 'Self-Service + Inside Sales', monetizacao: hipotese(), ticketMedioEstimado: hipotese() },
        icpAtualFirmografico: {
          segmentoSetor: hipotese(),
          tamanhoEmpresa: hipotese(),
          faturamentoAnualOuFaixa: hipotese(),
          tecnologiasOuSinaisChave: hipotese(),
        },
        icpDeclaradoVsClientes: {
          clientesObservados,
          alinhamento: 'DIVERGENTE',
          leitura: {
            text: 'Os 3 clientes nomeados estão fora do ICP declarado.',
            status: 'HIPOTESE',
            evidenceIds: [],
            howToValidate: 'Validar em entrevistas de discovery.',
          },
        },
        comiteCompraB2B: [
          { papel: 'Decisor (C-Level/Diretor)', cargoArquetipo: 'CRO de SaaS B2B', dorPrincipal: hipotese(), gatilhoDeCompra: hipotese(), objecaoPrincipal: hipotese() },
          { papel: 'Influenciador Técnico', cargoArquetipo: 'Head de RevOps', dorPrincipal: hipotese(), gatilhoDeCompra: hipotese(), objecaoPrincipal: hipotese() },
          { papel: 'Usuário Final', cargoArquetipo: 'Gerente de Growth', dorPrincipal: hipotese(), gatilhoDeCompra: hipotese(), objecaoPrincipal: hipotese() },
        ],
        concorrentesReais: [],
        sinaisMaturidadeGtm: [hipotese()],
        topRiscos: [hipotese(), hipotese(), hipotese()],
        lacunasDeDadosCriticas: [],
      }),
    });
    const out = await stageDossier(BASE_INPUT, collect, [], { providers: { bedrock: provider } });
    expect(out.data.icpDeclaradoVsClientes.leitura.text).toBe('Os 3 clientes nomeados estão fora do ICP declarado.');
  });
});
