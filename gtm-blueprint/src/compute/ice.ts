/** Campos da iniciativa que o score lê. Título, descrição e dono passam intactos. */
export interface IniciativaIce {
  impactoEstimado1a10: number;
  confianca1a10: number;
  facilidade1a10: number;
  scoreIceCalculado?: number;
}

/** ICE = impacto × confiança × facilidade (1 a 1000), com uma casa decimal. */
export function scoreIce(impacto: number, confianca: number, facilidade: number): number {
  return Math.round(impacto * confianca * facilidade * 10) / 10;
}

/** Calcula o ICE de cada iniciativa e ordena cada onda do maior para o menor score. Não altera os demais campos. */
export function computeAndSortIce<T extends { ondasExecucao: Array<{ iniciativasPraticas: IniciativaIce[] }> }>(plano: T): T {
  if (!plano || !Array.isArray(plano.ondasExecucao)) {
    return plano;
  }

  const ondasExecucao = plano.ondasExecucao.map((onda) => {
    if (!Array.isArray(onda.iniciativasPraticas)) {
      return onda;
    }

    const iniciativas = onda.iniciativasPraticas.map((init) => {
      const impact = typeof init.impactoEstimado1a10 === 'number' ? init.impactoEstimado1a10 : 5;
      const confidence = typeof init.confianca1a10 === 'number' ? init.confianca1a10 : 5;
      const ease = typeof init.facilidade1a10 === 'number' ? init.facilidade1a10 : 5;
      return { ...init, scoreIceCalculado: scoreIce(impact, confidence, ease) };
    });
    iniciativas.sort((a, b) => (b.scoreIceCalculado ?? 0) - (a.scoreIceCalculado ?? 0));

    return { ...onda, iniciativasPraticas: iniciativas };
  });

  return { ...plano, ondasExecucao };
}
