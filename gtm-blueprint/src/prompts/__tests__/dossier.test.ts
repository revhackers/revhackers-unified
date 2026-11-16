import { describe, it, expect } from 'vitest';
import { dossierPromptSpec, type DossierInput } from '../dossier.js';
import type { Evidence } from '../evidence.js';

function input(evidences: Evidence[]): DossierInput {
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
  };
}

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
});
