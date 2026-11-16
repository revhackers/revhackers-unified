import { describe, it, expect } from 'vitest';
import { dossierPromptSpec, type DossierInput } from '../dossier.js';
import type { Evidence } from '../evidence.js';
import type { ExtractOutput } from '../extract.js';

function input(evidences: Evidence[], fatosExtraidos: DossierInput['fatosExtraidos'] = []): DossierInput {
  return {
    companyName: 'Acme',
    websiteUrl: 'https://acme.test',
    declaredPhase: 'Primeira Tração Validada',
    competitors: [
      { url: 'https://rival.test', collected: true },
      { url: 'https://ausente.test', collected: false },
    ],
    computedFacts: { cnpjAgeYears: null, companySizeEstimated: null, estimatedAddressState: null },
    evidences,
    fatosExtraidos,
  };
}

const EXTRACT: ExtractOutput = {
  url: 'https://acme.test',
  propostaValorDeclarada: { resumo: 'Automação de prospecção', quote: 'Acme automatiza prospecção B2B' },
  icpDeclarado: null,
  produtosPlanosPrecos: [],
  provasSociais: [],
  ctasConversao: [],
  sinaisMaturidade: [],
  lacunasOuInconsistencias: [],
};

describe('dossierPromptSpec.buildUser', () => {
  it('mantém no prompt o fim de uma página longa (orçamento de 60 mil caracteres)', () => {
    const marker = 'TRECHO-FINAL-DA-PAGINA';
    const longPage: Evidence = {
      id: 'E1',
      kind: 'site',
      source: 'https://acme.test',
      fetchedAt: '2026-11-16T00:00:00.000Z',
      content: `${'Cadências multicanal para times comerciais B2B. '.repeat(600)}${marker}`,
    };

    expect(dossierPromptSpec.buildUser(input([longPage]))).toContain(marker);
  });

  it('separa concorrentes coletados dos informados sem coleta', () => {
    const user = dossierPromptSpec.buildUser(input([]));

    expect(user).toContain('- Concorrentes informados e coletados: https://rival.test');
    expect(user).toContain('- Concorrentes informados sem coleta (não analisar): https://ausente.test');
    expect(user).not.toContain('Concorrentes Informados:');
  });

  it('imprime os fatos com citação conferida antes da lista de evidências', () => {
    const user = dossierPromptSpec.buildUser(input([], [{ evidenceId: 'E1', extract: EXTRACT }]));

    expect(user.indexOf('FATOS EXTRAÍDOS COM CITAÇÃO CONFERIDA:')).toBeGreaterThan(-1);
    expect(user.indexOf('FATOS EXTRAÍDOS COM CITAÇÃO CONFERIDA:')).toBeLessThan(user.indexOf('EVIDÊNCIAS COLETADAS:'));
    expect(user).toContain('[E1] Proposta de valor: Automação de prospecção — citação: "Acme automatiza prospecção B2B"');
  });
});
