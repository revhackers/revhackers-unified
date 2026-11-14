import { describe, expect, it } from 'vitest';
import {
  buildResult,
  computeAxisScores,
  computeOverall,
  maturityBand,
  normalizeOptionScore,
} from './scoring';
import type { MaturityBand } from './scoring';
import { GROWTH_AXES } from './spec';

describe('normalizeOptionScore', () => {
  it('retorna 0 com divisão segura quando max é 0', () => {
    expect(normalizeOptionScore(0, 0)).toBe(0);
  });

  it('converte 10/20 para 50', () => {
    expect(normalizeOptionScore(10, 20)).toBe(50);
  });

  it('converte 20/20 para 100', () => {
    expect(normalizeOptionScore(20, 20)).toBe(100);
  });
});

describe('computeOverall', () => {
  it('calcula a média aritmética dos 11 eixos', () => {
    const axisScores = Object.fromEntries(
      GROWTH_AXES.map((axis, index) => [axis.id, index * 10]),
    ) as Record<(typeof GROWTH_AXES)[number]['id'], number>;
    // 0+10+...+100 = 550 / 11 = 50
    expect(computeOverall(axisScores)).toBe(50);
  });
});

describe('maturityBand', () => {
  it.each<Array<[number, MaturityBand]>>([
    [49, 'critico'],
    [50, 'alerta'],
    [89, 'alerta'],
    [90, 'otimizado'],
  ])('classifica %i como %s', (score, expected) => {
    expect(maturityBand(score)).toBe(expected);
  });
});

describe('buildResult', () => {
  it('retorna 11 recomendações com source não vazia', () => {
    const answers = Object.fromEntries(
      GROWTH_AXES.map((axis) => [axis.id, 70]),
    ) as Record<(typeof GROWTH_AXES)[number]['id'], number>;
    const result = buildResult(answers);
    const recommendations = Object.values(result.recommendations);
    expect(recommendations).toHaveLength(11);
    for (const rec of recommendations) {
      expect(rec.source.trim().length).toBeGreaterThan(0);
    }
    expect(result.overall).toBe(70);
    expect(result.band).toBe('alerta');
    expect(Object.keys(result.axisScores)).toHaveLength(11);
  });
});

describe('extensibilidade', () => {
  it('eixo extra não quebra computeOverall nem computeAxisScores', () => {
    const base = Object.fromEntries(GROWTH_AXES.map((axis) => [axis.id, 80]));
    const extended = { ...base, novo_eixo: 60 };
    const axisScores = computeAxisScores(
      extended as unknown as Record<(typeof GROWTH_AXES)[number]['id'], number>,
    );
    expect(
      computeOverall(
        axisScores as Record<(typeof GROWTH_AXES)[number]['id'], number>,
      ),
    ).toBe(78);
  });
});
