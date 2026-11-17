import { describe, it, expect } from 'vitest';
import {
  enforceNumberProvenance,
  userInputEvidence,
  BLOCKED_NARRATIVE_TEXT,
  BLOCKED_HOWTO_TEXT,
  BLOCKED_RECOMMENDATION_TEXT,
} from '../numberGuard.js';
import type { Evidence } from '../evidence.js';

const FETCHED_AT = '2026-11-13T00:00:00.000Z';

const E1: Evidence = {
  id: 'E1',
  kind: 'site',
  source: 'https://example.com',
  fetchedAt: FETCHED_AT,
  content: 'Base de 12.000 contas no Brasil. Preço de R$ 2.500 por mês.',
};

// Checagem mecânica: os testes provam correspondência de valor e unidade, não suporte semântico.
describe('enforceNumberProvenance (checagem mecânica)', () => {
  it('mantém claim cujas métricas constam na evidência citada', () => {
    const text = 'A empresa atende 12.000 contas com ARPU de R$ 2.500.';
    const result = enforceNumberProvenance(
      { claim: { text, status: 'VERIFICADO', evidenceIds: ['E1'], howToValidate: 'Conferir no CRM.' } },
      { evidences: [E1] },
    );
    expect(result.value.claim.text).toBe(text);
    expect(result.value.claim.status).toBe('VERIFICADO');
    expect(result.downgradedClaims).toBe(0);
    expect(result.findings).toEqual([]);
  });

  it('bloqueia texto com métrica sem nenhuma citação', () => {
    const result = enforceNumberProvenance(
      { descricao: 'O LTV estimado é de R$ 125.000.' },
      { evidences: [E1] },
      { pathPrefix: 'raio_x' },
    );
    expect(result.value.descricao).toBe(BLOCKED_NARRATIVE_TEXT);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toBe('raio_x.descricao');
  });

  it('rebaixa claim VERIFICADO cuja única frase tem métrica não sustentada e mantém howToValidate válido', () => {
    const result = enforceNumberProvenance(
      {
        claim: {
          text: 'O CAC é de R$ 1.200.',
          status: 'VERIFICADO',
          evidenceIds: [],
          howToValidate: 'Validar no CRM.',
        },
      },
      { evidences: [E1] },
      { pathPrefix: 'raio_x' },
    );
    expect(result.value.claim.text).toBe(BLOCKED_NARRATIVE_TEXT);
    expect(result.value.claim.status).toBe('HIPOTESE');
    expect(result.value.claim.howToValidate).toBe('Validar no CRM.');
    expect(result.downgradedClaims).toBe(1);
    expect(result.findings.map((f) => f.path)).toEqual(['raio_x.claim.text']);
  });

  it('remove só a frase com métrica sem suporte e preserva as frases vizinhas', () => {
    const claim = {
      text: 'A base tem 12.000 contas [E1]. O LTV é de R$ 125.000. A empresa vende software para equipes comerciais.',
      status: 'VERIFICADO',
      evidenceIds: ['E1'],
      howToValidate: 'Conferir.',
    };
    const result = enforceNumberProvenance({ claim }, { evidences: [E1] });

    expect(result.value.claim.text).toBe('A base tem 12.000 contas [E1]. A empresa vende software para equipes comerciais.');
    expect(result.value.claim.status).toBe('HIPOTESE');
    expect(result.downgradedClaims).toBe(1);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.reason).toContain('125.000');
    expect(result.findings[0]?.path).toBe('claim.text');
  });

  it('remove a faixa "30-40%" sem suporte mesmo quando a frase não tem palavra-chave de métrica', () => {
    const result = enforceNumberProvenance(
      {
        claim: {
          text: 'Cerca de 30-40% dos prospects que chegam à proposta fecham. A página inicial apresenta a oferta.',
          status: 'VERIFICADO',
          evidenceIds: [],
          howToValidate: 'Validar no CRM.',
        },
      },
      { evidences: [E1] },
    );
    expect(result.value.claim.text).toBe('A página inicial apresenta a oferta.');
    expect(result.value.claim.status).toBe('HIPOTESE');
  });

  it('não usa fonte competitor_site para sustentar métrica própria', () => {
    const c1: Evidence = {
      id: 'C1',
      kind: 'competitor_site',
      source: 'https://concorrente.com',
      fetchedAt: FETCHED_AT,
      content: 'Ticket médio de R$ 2.500 por mês.',
    };
    const result = enforceNumberProvenance(
      { claim: { text: 'O ticket médio é de R$ 2.500.', status: 'VERIFICADO', evidenceIds: ['C1'], howToValidate: 'Conferir.' } },
      { evidences: [c1] },
    );
    expect(result.value.claim.status).toBe('HIPOTESE');
    expect(result.downgradedClaims).toBe(1);
  });

  it('compara percentual com unidade: 2,5% sustenta, 25% não', () => {
    const e2: Evidence = {
      id: 'E2',
      kind: 'site',
      source: 'https://example.com/conversao',
      fetchedAt: FETCHED_AT,
      content: 'Taxa de conversão de 2,5%.',
    };
    const bad = enforceNumberProvenance(
      { claim: { text: 'A conversão é de 25%.', status: 'VERIFICADO', evidenceIds: ['E2'], howToValidate: 'Conferir.' } },
      { evidences: [e2] },
    );
    expect(bad.value.claim.text).toBe(BLOCKED_NARRATIVE_TEXT);

    const good = enforceNumberProvenance(
      { claim: { text: 'A conversão é de 2,5%.', status: 'VERIFICADO', evidenceIds: ['E2'], howToValidate: 'Conferir.' } },
      { evidences: [e2] },
    );
    expect(good.value.claim.text).toBe('A conversão é de 2,5%.');
    expect(good.findings).toEqual([]);
  });

  it('texto sem métrica passa inalterado', () => {
    const text = 'A empresa vende software para equipes comerciais.';
    const result = enforceNumberProvenance({ descricao: text }, { evidences: [E1] });
    expect(result.value.descricao).toBe(text);
    expect(result.findings).toEqual([]);
  });

  it('bloqueia só o item do array com métrica sem suporte, com caminho indexado', () => {
    const result = enforceNumberProvenance(
      { itens: ['LTV de R$ 125.000', 'Ok sem número'] },
      { evidences: [E1] },
      { pathPrefix: 'raio_x' },
    );
    expect(result.value.itens[0]).toBe(BLOCKED_NARRATIVE_TEXT);
    expect(result.value.itens[1]).toBe('Ok sem número');
    expect(result.findings.map((f) => f.path)).toEqual(['raio_x.itens[0]']);
  });

  it('não percorre campos de metadados como source', () => {
    const result = enforceNumberProvenance(
      { source: 'Base de 12.000 contas', descricao: 'Texto sem números.' },
      { evidences: [] },
    );
    expect(result.value.source).toBe('Base de 12.000 contas');
    expect(result.findings).toEqual([]);
  });

  it('não checa recomendação: "20 contas" em { text, baseadoEm } passa intacto', () => {
    const play = { text: 'Abrir 20 contas por semana com a lista do Dossiê.', baseadoEm: [] };
    const result = enforceNumberProvenance({ play, plays: [play] }, { evidences: [] });
    expect(result.value.play).toEqual(play);
    expect(result.value.plays).toEqual([play]);
    expect(result.findings).toEqual([]);
  });

  it('checa campos de desenho (decisao, acao) em modo fato', () => {
    const result = enforceNumberProvenance(
      {
        decisao: 'Reduzir o CAC em 50% até o trimestre. Revisar o funil toda segunda-feira.',
        proximosPassos: [{ acao: 'Atingir 40% de aceite.', responsavelRole: 'Head de Growth', prazoDias: 7 }],
      },
      { evidences: [] },
    );
    expect(result.value.decisao).toBe('Revisar o funil toda segunda-feira.');
    expect(result.value.proximosPassos[0]?.acao).toBe(BLOCKED_NARRATIVE_TEXT);
    expect(result.findings.map((f) => f.path)).toEqual(['decisao', 'proximosPassos[0].acao']);
  });

  it('troca por BLOCKED_HOWTO_TEXT sem rebaixar quando só o howToValidate perde frase', () => {
    const result = enforceNumberProvenance(
      {
        claim: {
          text: 'A base tem 12.000 contas [E1].',
          status: 'VERIFICADO',
          evidenceIds: ['E1'],
          howToValidate: 'Medir o LTV de R$ 125.000 no CRM.',
        },
      },
      { evidences: [E1] },
    );
    expect(result.value.claim.text).toBe('A base tem 12.000 contas [E1].');
    expect(result.value.claim.status).toBe('VERIFICADO');
    expect(result.value.claim.howToValidate).toBe(BLOCKED_HOWTO_TEXT);
    expect(result.downgradedClaims).toBe(0);
    expect(result.findings.map((f) => f.path)).toEqual(['claim.howToValidate']);
  });

  it('preenche howToValidate com BLOCKED_HOWTO_TEXT quando a claim perde frase e não tinha o campo', () => {
    const result = enforceNumberProvenance(
      { claim: { text: 'O CAC é de R$ 1.200 [E1]. A base tem 12.000 contas [E1].', status: 'VERIFICADO', evidenceIds: ['E1'] } },
      { evidences: [E1] },
    );
    expect(result.value.claim.text).toBe('A base tem 12.000 contas [E1].');
    expect(result.value.claim).toMatchObject({ status: 'HIPOTESE', howToValidate: BLOCKED_HOWTO_TEXT });
  });

  it('mantém duração de texto corrido presente no site', () => {
    const site: Evidence = {
      id: 'E1',
      kind: 'site',
      source: 'https://example.com',
      fetchedAt: FETCHED_AT,
      content: 'Instalamos sua máquina de receita B2B em 90 dias. Redução de 40% no CAC.',
    };
    const result = enforceNumberProvenance(
      { teseCentral: 'Instala a máquina de receita em 90 dias.' },
      { evidences: [site] },
    );
    expect(result.value.teseCentral).toBe('Instala a máquina de receita em 90 dias.');
    expect(result.findings).toEqual([]);
  });

  it('não trata amostra e período em howToValidate como fato', () => {
    const result = enforceNumberProvenance(
      {
        claim: {
          text: 'A base tem 12.000 contas [E1].',
          status: 'VERIFICADO',
          evidenceIds: ['E1'],
          howToValidate: 'Entrevistar 5 clientes e auditar 10 contratos dos últimos 12 meses de receita.',
        },
      },
      { evidences: [E1] },
    );
    expect(result.value.claim.text).toBe('A base tem 12.000 contas [E1].');
    expect(result.value.claim.status).toBe('VERIFICADO');
    expect(result.value.claim.howToValidate).toBe('Entrevistar 5 clientes e auditar 10 contratos dos últimos 12 meses de receita.');
    expect(result.findings).toEqual([]);
  });

  it('ignora marcador de lista de um dígito como "(1)" e "(2)"', () => {
    const text = 'Três frentes de receita: (1) outbound; (2) inbound; (3) parcerias.';
    const result = enforceNumberProvenance({ resumo: text }, { evidences: [] });
    expect(result.value.resumo).toBe(text);
    expect(result.findings).toEqual([]);
  });

  it('checa recomendação: remove meta sem fonte e mantém desenho', () => {
    const result = enforceNumberProvenance(
      {
        plano: {
          text: 'Abrir 20 contas por semana. Meta de conversão de 15% em reunião. Publicar 3x por semana no LinkedIn.',
          baseadoEm: [],
        },
      },
      { evidences: [E1] },
    );
    expect(result.value.plano.text).toBe('Abrir 20 contas por semana. Publicar 3x por semana no LinkedIn.');
    expect(result.value.plano.baseadoEm).toEqual([]);
    expect(result.findings.map((f) => f.path)).toEqual(['plano.text']);
  });

  it('bloqueia recomendação cuja única frase é meta sem fonte', () => {
    const result = enforceNumberProvenance(
      { plano: { text: 'Faturamento anual entre R$ 2M e R$ 50M.', baseadoEm: ['E1'] } },
      { evidences: [E1] },
    );
    expect(result.value.plano.text).toBe(BLOCKED_RECOMMENDATION_TEXT);
    expect(result.value.plano.baseadoEm).toEqual([]);
  });

  it('mantém recomendação que cita a fonte do número', () => {
    const site: Evidence = {
      id: 'E1',
      kind: 'site',
      source: 'https://example.com',
      fetchedAt: FETCHED_AT,
      content: 'Instalamos sua máquina de receita B2B em 90 dias. Redução de 40% no CAC.',
    };
    const text = 'Citar a redução de 40% no CAC publicada no site [E1].';
    const result = enforceNumberProvenance({ plano: { text, baseadoEm: [] } }, { evidences: [site] });
    expect(result.value.plano.text).toBe(text);
    expect(result.findings).toEqual([]);
  });

  it('remove prazo de payback sem fonte e mantém SLA de resposta', () => {
    const semFonte = enforceNumberProvenance(
      { a: { text: 'Garantir payback em 6 meses.', baseadoEm: [] } },
      { evidences: [] },
    );
    expect(semFonte.value.a.text).toBe(BLOCKED_RECOMMENDATION_TEXT);
    expect(semFonte.value.a.baseadoEm).toEqual([]);

    const sla = enforceNumberProvenance(
      { a: { text: 'Responder o lead em 2 dias.', baseadoEm: [] } },
      { evidences: [] },
    );
    expect(sla.value.a.text).toBe('Responder o lead em 2 dias.');
    expect(sla.findings).toEqual([]);
  });

  it('marca benchmark de mercado como sem suporte mesmo com o número na evidência', () => {
    const site: Evidence = {
      id: 'E1',
      kind: 'site',
      source: 'https://example.com',
      fetchedAt: FETCHED_AT,
      content: 'Instalamos sua máquina de receita B2B em 90 dias. Redução de 40% no CAC.',
    };
    const result = enforceNumberProvenance(
      {
        claim: {
          text: 'O CAC está 40% acima do benchmark de mercado.',
          status: 'VERIFICADO',
          evidenceIds: ['E1'],
          howToValidate: 'Conferir.',
        },
      },
      { evidences: [site] },
    );
    expect(result.value.claim.text).toBe(BLOCKED_NARRATIVE_TEXT);
    expect(result.value.claim.status).toBe('HIPOTESE');
    expect(result.value.claim.evidenceIds).toEqual([]);
  });

  it('sustenta número de concorrente citado em concorrentesReais, mas não fora dali', () => {
    const c7: Evidence = {
      id: 'C7',
      kind: 'competitor_site',
      source: 'https://concorrente.com',
      fetchedAt: FETCHED_AT,
      content: '+ 4.000 Empresas Atendidas',
    };
    const claim = {
      text: 'Atende 4.000 empresas.',
      status: 'VERIFICADO',
      evidenceIds: ['C7'],
      howToValidate: 'Conferir.',
    };
    const dentro = enforceNumberProvenance(
      { concorrentesReais: [{ nome: 'X', diferencialObservado: claim }] },
      { evidences: [c7] },
    );
    expect(dentro.value.concorrentesReais[0]?.diferencialObservado.text).toBe('Atende 4.000 empresas.');
    expect(dentro.value.concorrentesReais[0]?.diferencialObservado.status).toBe('VERIFICADO');
    expect(dentro.findings).toEqual([]);

    const fora = enforceNumberProvenance({ claim }, { evidences: [c7] });
    expect(fora.value.claim.status).toBe('HIPOTESE');
  });

  it('ignora citação inline de concorrente fora de concorrentesReais', () => {
    const c7: Evidence = {
      id: 'C7',
      kind: 'competitor_site',
      source: 'https://concorrente.com',
      fetchedAt: FETCHED_AT,
      content: '+ 4.000 Empresas Atendidas',
    };
    const fora = enforceNumberProvenance(
      {
        claim: {
          text: 'O concorrente atende 4.000 empresas [C7].',
          status: 'VERIFICADO',
          evidenceIds: [],
          howToValidate: 'Conferir.',
        },
      },
      { evidences: [c7] },
    );
    expect(fora.value.claim.status).toBe('HIPOTESE');

    const dentro = enforceNumberProvenance(
      {
        concorrentesReais: [
          {
            nome: 'X',
            diferencialObservado: {
              text: 'Atende 4.000 empresas [C7].',
              status: 'VERIFICADO',
              evidenceIds: [],
              howToValidate: 'Conferir.',
            },
          },
        ],
      },
      { evidences: [c7] },
    );
    expect(dentro.value.concorrentesReais[0]?.diferencialObservado.status).toBe('VERIFICADO');
    expect(dentro.findings).toEqual([]);
  });

  it('sustenta contagem de clientes via evidência derivada D1', () => {
    const d1: Evidence = {
      id: 'D1',
      kind: 'computed',
      source: 'cálculo do GTM Blueprint',
      fetchedAt: FETCHED_AT,
      content: 'Clientes nomeados nas evidências (contagem por código): 17 clientes',
    };
    const claim = {
      text: 'A carteira tem 17 clientes fora do ICP.',
      status: 'VERIFICADO',
      evidenceIds: ['E1'],
      howToValidate: 'Conferir.',
    };
    const com = enforceNumberProvenance({ claim }, { evidences: [E1, d1], alwaysCited: ['D1'] });
    expect(com.value.claim.text).toBe('A carteira tem 17 clientes fora do ICP.');
    expect(com.value.claim.status).toBe('VERIFICADO');
    expect(com.findings).toEqual([]);

    const sem = enforceNumberProvenance({ claim }, { evidences: [E1] });
    expect(sem.value.claim.text).toBe(BLOCKED_NARRATIVE_TEXT);
  });

  it('conta limiar de comparação como métrica e mantém marcador de lista', () => {
    const claim = {
      text: 'Definir alvo de LTV/CAC ≥3 para onda_3.',
      status: 'VERIFICADO',
      evidenceIds: [],
      howToValidate: 'Conferir.',
    };
    const bloqueado = enforceNumberProvenance({ claim }, { evidences: [E1] });
    expect(bloqueado.value.claim.text).toBe(BLOCKED_NARRATIVE_TEXT);
    expect(bloqueado.value.claim.status).toBe('HIPOTESE');

    const mais = enforceNumberProvenance(
      {
        claim: {
          text: 'Atingir LTV/CAC 3+ no trimestre.',
          status: 'VERIFICADO',
          evidenceIds: [],
          howToValidate: 'Conferir.',
        },
      },
      { evidences: [E1] },
    );
    expect(mais.value.claim.text).toBe(BLOCKED_NARRATIVE_TEXT);

    const menos = enforceNumberProvenance(
      {
        claim: {
          text: 'Manter LTV/CAC <2 fora do alvo.',
          status: 'VERIFICADO',
          evidenceIds: [],
          howToValidate: 'Conferir.',
        },
      },
      { evidences: [E1] },
    );
    expect(menos.value.claim.text).toBe(BLOCKED_NARRATIVE_TEXT);

    const lista = { resumo: 'Três frentes: (1) outbound; (2) inbound.' };
    const controle = enforceNumberProvenance(lista, { evidences: [] });
    expect(controle.value).toEqual(lista);
    expect(controle.findings).toEqual([]);
  });
});

describe('userInputEvidence (U1)', () => {
  const u1Input = {
    companyName: 'TestCo',
    websiteUrl: 'https://testco.com.br',
    declaredPhase: 'Escala',
    crmOrFinancialInputs: { arpuMonthly: 2500, cacEstimated: 4000, churnMonthlyRate: 0.035, salesCycleDays: 90 },
  };
  const u1 = userInputEvidence(u1Input, []);

  it('usa id U1 e kind user_input', () => {
    expect(u1.id).toBe('U1');
    expect(u1.kind).toBe('user_input');
  });

  it('escreve churn em pt-BR sem separador de milhar, em fração e percentual', () => {
    expect(u1.content).toContain('0,035');
    expect(u1.content).toContain('3,5%');
    expect(u1.content).not.toContain('0.035');
  });

  it('separa concorrentes coletados dos informados sem coleta', () => {
    const ev = userInputEvidence(u1Input, [
      { url: 'https://a.test', collected: true },
      { url: 'https://b.test', collected: false },
    ]);
    expect(ev.content).toContain('Concorrentes informados e coletados: https://a.test');
    expect(ev.content).toContain('Concorrentes informados sem coleta (não analisar): https://b.test');
  });

  it('sustenta claims que citam U1 em R$, percentual e fração', () => {
    const texts = ['O ARPU de R$ 2.500 [U1].', 'Churn de 3,5% [U1].', 'Churn de 0,035 [U1].'];
    for (const text of texts) {
      const result = enforceNumberProvenance(
        { claim: { text, status: 'VERIFICADO', evidenceIds: ['U1'], howToValidate: 'Conferir.' } },
        { evidences: [u1] },
      );
      expect(result.value.claim.text, text).toBe(text);
      expect(result.findings, text).toEqual([]);
    }
  });

  it('não sustenta percentual de churn que não consta em U1', () => {
    const result = enforceNumberProvenance(
      { claim: { text: 'Churn de 4% [U1].', status: 'VERIFICADO', evidenceIds: ['U1'], howToValidate: 'Conferir.' } },
      { evidences: [u1] },
    );
    expect(result.value.claim.text).toBe(BLOCKED_NARRATIVE_TEXT);
    expect(result.value.claim.status).toBe('HIPOTESE');
  });
});
