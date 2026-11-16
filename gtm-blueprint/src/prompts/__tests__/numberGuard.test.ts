import { describe, it, expect } from 'vitest';
import {
  enforceNumberProvenance,
  userInputEvidence,
  BLOCKED_NARRATIVE_TEXT,
  BLOCKED_HOWTO_TEXT,
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

  it('não checa campos de decisão e ação, que são proposta e não fato', () => {
    const result = enforceNumberProvenance(
      { decisao: 'Reduzir o CAC em 50% até o trimestre.', proximosPassos: [{ acao: 'Atingir 40% de aceite.' }] },
      { evidences: [] },
    );
    expect(result.value.decisao).toBe('Reduzir o CAC em 50% até o trimestre.');
    expect(result.findings).toEqual([]);
  });

  it('troca por BLOCKED_HOWTO_TEXT quando a única frase de howToValidate não tem suporte', () => {
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
    expect(result.value.claim.status).toBe('HIPOTESE');
    expect(result.value.claim.howToValidate).toBe(BLOCKED_HOWTO_TEXT);
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
