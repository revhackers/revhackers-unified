export interface Initiative {
  titulo: string;
  descricao: { text: string; status: 'VERIFICADO' | 'HIPOTESE'; evidenceIds?: string[]; howToValidate?: string };
  impactoEstimado1a10: number;
  confianca1a10: number;
  facilidade1a10: number;
  scoreIceCalculado?: number;
  ownerRole: string;
  prazoDias: number;
}

export interface OndaExecucao {
  onda: 'onda_1' | 'onda_2' | 'onda_3' | 'onda_4' | string;
  focoPrincipal: { text: string; status: 'VERIFICADO' | 'HIPOTESE'; evidenceIds?: string[]; howToValidate?: string };
  iniciativasPraticas: Initiative[];
}

export interface Plano90DiasData {
  ondasExecucao: OndaExecucao[];
  [key: string]: unknown;
}

export function computeAndSortIce(plano: Plano90DiasData): Plano90DiasData {
  if (!plano || !Array.isArray(plano.ondasExecucao)) {
    return plano;
  }

  const updatedOndas = plano.ondasExecucao.map((onda) => {
    if (!Array.isArray(onda.iniciativasPraticas)) {
      return onda;
    }

    const calculatedIniciativas = onda.iniciativasPraticas.map((init) => {
      const impact = typeof init.impactoEstimado1a10 === 'number' ? init.impactoEstimado1a10 : 5;
      const confidence = typeof init.confianca1a10 === 'number' ? init.confianca1a10 : 5;
      const ease = typeof init.facilidade1a10 === 'number' ? init.facilidade1a10 : 5;
      const scoreIceCalculado = Math.round(impact * confidence * ease * 10) / 10;

      return {
        ...init,
        scoreIceCalculado,
      };
    });

    // Sort descending by scoreIceCalculado
    calculatedIniciativas.sort((a, b) => (b.scoreIceCalculado ?? 0) - (a.scoreIceCalculado ?? 0));

    return {
      ...onda,
      iniciativasPraticas: calculatedIniciativas,
    };
  });

  return {
    ...plano,
    ondasExecucao: updatedOndas,
  };
}
