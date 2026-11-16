import { describe, it, expect } from 'vitest';
import { RecomendacaoSchema, enforceEvidence, enforcePersonaHypothesis } from '../evidence.js';

const PERSONA_VALIDATION = 'Validar em entrevistas de discovery ou win/loss com clientes e prospects.';
const VALID_IDS = new Set(['E1']);

describe('RecomendacaoSchema', () => {
  it('converte string solta e lista de strings em recomendação sem referências', () => {
    expect(RecomendacaoSchema.parse('Abrir a lista de contas.')).toEqual({ text: 'Abrir a lista de contas.', baseadoEm: [] });
    expect(RecomendacaoSchema.parse(['Passo um.', 'Passo dois.'])).toEqual({ text: 'Passo um. Passo dois.', baseadoEm: [] });
  });

  it('aceita objeto com baseadoEm e usa lista vazia quando o campo falta', () => {
    expect(RecomendacaoSchema.parse({ text: 'x' })).toEqual({ text: 'x', baseadoEm: [] });
    expect(RecomendacaoSchema.parse({ text: 'x', baseadoEm: ['E1'] })).toEqual({ text: 'x', baseadoEm: ['E1'] });
  });
});

describe('enforceEvidence', () => {
  it('remove de baseadoEm os ids inexistentes sem rebaixar a recomendação', () => {
    const { value, downgraded } = enforceEvidence({ play: { text: 'Abrir contas.', baseadoEm: ['E1', 'E9'] } }, VALID_IDS);

    expect(value.play).toEqual({ text: 'Abrir contas.', baseadoEm: ['E1'] });
    expect(downgraded).toBe(0);
  });

  it('rebaixa VERIFICADO sem id válido e mantém o status de quem tem evidência', () => {
    const { value, downgraded } = enforceEvidence(
      {
        semFonte: { text: 'Fato.', status: 'VERIFICADO', evidenceIds: ['E9'] },
        comFonte: { text: 'Fato.', status: 'VERIFICADO', evidenceIds: ['E1'] },
      },
      VALID_IDS,
    );

    expect(value.semFonte.status).toBe('HIPOTESE');
    expect(value.semFonte.evidenceIds).toEqual([]);
    expect(value.comFonte.status).toBe('VERIFICADO');
    expect(downgraded).toBe(1);
  });
});

describe('enforcePersonaHypothesis', () => {
  it('rebaixa dor, gatilho, objeção e critério de persona VERIFICADO para HIPOTESE', () => {
    const dossier = {
      comiteCompraB2B: [{
        papel: 'Decisor (C-Level/Diretor)',
        cargoArquetipo: 'CRO de SaaS B2B',
        dorPrincipal: { text: 'Previsibilidade de forecast.', status: 'VERIFICADO', evidenceIds: ['E1'] },
        gatilhoDeCompra: { text: 'Troca de CRO.', status: 'VERIFICADO', evidenceIds: [], howToValidate: 'Validar com o CRO.' },
        objecaoPrincipal: { text: 'Custo de implantação.', status: 'HIPOTESE', evidenceIds: [], howToValidate: 'Entrevistar.' },
      }],
    };
    const { value, downgraded } = enforcePersonaHypothesis(dossier, VALID_IDS);
    const persona = value.comiteCompraB2B[0];

    expect(persona?.dorPrincipal).toEqual({
      text: 'Previsibilidade de forecast.',
      status: 'HIPOTESE',
      evidenceIds: ['E1'],
      howToValidate: PERSONA_VALIDATION,
    });
    expect(persona?.gatilhoDeCompra.status).toBe('HIPOTESE');
    expect(persona?.gatilhoDeCompra.howToValidate).toBe('Validar com o CRO.');
    expect(persona?.objecaoPrincipal.status).toBe('HIPOTESE');
    expect(downgraded).toBe(2);
  });

  it('também rebaixa personas do módulo de comitê (membrosComite)', () => {
    const modulo = {
      membrosComite: [{ papel: 'Usuário Final', cargo: 'Gerente de Growth', criterioAvaliacao: { text: 'Leads qualificados.', status: 'VERIFICADO', evidenceIds: ['E1'] } }],
    };
    const { value, downgraded } = enforcePersonaHypothesis(modulo, VALID_IDS);

    expect(value.membrosComite[0]?.criterioAvaliacao.status).toBe('HIPOTESE');
    expect(downgraded).toBe(1);
  });

  it('não altera claims fora das chaves de persona', () => {
    const dossier = { modeloNegocio: { monetizacao: { text: 'Assinatura mensal.', status: 'VERIFICADO', evidenceIds: ['E1'] } } };
    const { value, downgraded } = enforcePersonaHypothesis(dossier, VALID_IDS);

    expect(value).toEqual(dossier);
    expect(downgraded).toBe(0);
  });

  it('remove clientes observados cujo evidenceId não existe', () => {
    const dossier = {
      icpDeclaradoVsClientes: {
        clientesObservados: [
          { nome: 'Cliente A', setorAparente: 'Software', evidenceId: 'E1' },
          { nome: 'Cliente B', setorAparente: 'Saúde', evidenceId: 'E9' },
        ],
        alinhamento: 'PARCIAL',
        leitura: { text: 'Leitura.', status: 'HIPOTESE', evidenceIds: [], howToValidate: 'Validar.' },
      },
    };
    const { value } = enforcePersonaHypothesis(dossier, VALID_IDS);

    expect(value.icpDeclaradoVsClientes.clientesObservados).toEqual([
      { nome: 'Cliente A', setorAparente: 'Software', evidenceId: 'E1' },
    ]);
  });
});
