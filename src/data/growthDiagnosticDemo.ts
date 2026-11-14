// Dados demonstrativos do Diagnóstico Growth — uso exclusivo para
// preview/desenvolvimento. Scoring NÃO validado; todo consumo desta
// amostra deve exibir o selo DEMONSTRATIVO.

import type { GrowthAxisId } from '@/lib/growth-diagnostic/spec';
import { buildResult } from '@/lib/growth-diagnostic/scoring';

export const DEMO_LABEL = 'DADOS DEMONSTRATIVOS — scoring nao validado';

export const GROWTH_DIAGNOSTIC_DEMO_ANSWERS: Record<GrowthAxisId, number> = {
  estrategia: 40,
  posicionamento: 55,
  aquisicao: 20,
  demanda: 35,
  marketing: 60,
  vendas: 75,
  crm: 30,
  revops: 45,
  retencao: 65,
  automacao: 25,
  maturidade: 50,
};

export const GROWTH_DIAGNOSTIC_DEMO_RESULT = buildResult(
  GROWTH_DIAGNOSTIC_DEMO_ANSWERS,
);
