import { describe, it, expect } from 'vitest';
import { computeUnitEconomics, computeSomAnual, computedEvidence } from '../unitEconomics.js';

describe('computeUnitEconomics', () => {
  it('calcula LTV, payback e LTV/CAC quando as quatro entradas existem', () => {
    const ue = computeUnitEconomics({ arpuMonthly: 2500, cacEstimated: 4000, churnMonthlyRate: 0.035, salesCycleDays: 90 });

    expect(ue.status).toBe('DADOS REAIS FORNECIDOS');
    expect(ue.ltv).toBeCloseTo(2500 / 0.035, 6);
    expect(ue.paybackMeses).toBeCloseTo(1.6, 6);
    expect(ue.ltvCac).toBeCloseTo((2500 / 0.035) / 4000, 6);
    expect(ue.faltantes).toEqual([]);
  });

  it('classifica como parcial e lista o que falta quando só algumas entradas existem', () => {
    const ue = computeUnitEconomics({ arpuMonthly: 2500, cacEstimated: null, churnMonthlyRate: 0.035 });

    expect(ue.status).toBe('DADOS PARCIAIS');
    expect(ue.ltv).toBeCloseTo(2500 / 0.035, 6);
    expect(ue.paybackMeses).toBeNull();
    expect(ue.ltvCac).toBeNull();
    expect(ue.faltantes).toEqual(['CAC', 'ciclo de vendas']);
  });

  it('classifica como ausente quando nenhuma entrada existe', () => {
    const ue = computeUnitEconomics(undefined);

    expect(ue.status).toBe('DADOS AUSENTES - NECESSITA COLETA');
    expect(ue.ltv).toBeNull();
    expect(ue.paybackMeses).toBeNull();
    expect(ue.faltantes).toEqual(['ticket médio mensal', 'CAC', 'churn mensal', 'ciclo de vendas']);
  });

  it('trata zero e valores negativos como ausentes, sem dividir por zero', () => {
    const ue = computeUnitEconomics({ arpuMonthly: 0, cacEstimated: 4000, churnMonthlyRate: -0.1, salesCycleDays: null });

    expect(ue.arpuMensal).toBeNull();
    expect(ue.churnMensal).toBeNull();
    expect(ue.ltv).toBeNull();
    expect(ue.paybackMeses).toBeNull();
    expect(ue.status).toBe('DADOS PARCIAIS');
  });
});

describe('computeSomAnual', () => {
  it('multiplica contas SOM pelo ARPU médio mensal e por 12', () => {
    expect(computeSomAnual({ totalTargetAccounts: 1000, estimatedSamAccounts: 200, estimatedSomAccounts: 50, arpuMedioMensal: 2000 })).toBe(1200000);
  });

  it('devolve null sem dados de mercado ou com valor não positivo', () => {
    expect(computeSomAnual(undefined)).toBeNull();
    expect(computeSomAnual({ totalTargetAccounts: 1000, estimatedSamAccounts: 200, estimatedSomAccounts: 50, arpuMedioMensal: 0 })).toBeNull();
  });
});

describe('computedEvidence (C1)', () => {
  it('é null quando nada foi calculado', () => {
    expect(computedEvidence(computeUnitEconomics(undefined), null)).toBeNull();
  });

  it('emite uma linha por valor calculado no formato pt-BR, com id C1 e kind computed', () => {
    const ue = computeUnitEconomics({ arpuMonthly: 2500, cacEstimated: 4000, churnMonthlyRate: 0.035, salesCycleDays: 90 });
    const ev = computedEvidence(ue, 1200000);

    expect(ev?.id).toBe('C1');
    expect(ev?.kind).toBe('computed');
    expect(ev?.content).toContain('ARPU mensal: R$ 2500');
    expect(ev?.content).toContain('Churn mensal: 0,035 (3,5%)');
    expect(ev?.content).toContain('Payback (CAC ÷ ARPU mensal): 1,6 meses');
    expect(ev?.content).toContain('SOM anual (contas SOM × ARPU médio × 12): R$ 1200000');
  });
});
