import { z } from 'zod';
import type { PromptSpec } from '../types';
import { SHARED_SYSTEM_PREAMBLE } from '../shared';
import { RecomendacaoSchema } from '../evidence';

export const Plano90DiasInputSchema = z.object({
  dossierSummary: z.record(z.any()),
  allPreviousModulesSummary: z.record(z.any()),
});

export type Plano90DiasInput = z.infer<typeof Plano90DiasInputSchema>;

export const Plano90DiasOutputSchema = z.object({
  ondasExecucao: z.array(z.object({
    onda: z.enum(['onda_1', 'onda_2', 'onda_3']).describe('onda_1: Fundação & Estancamento (Dias 1-30), onda_2: Tração & Validação de Canais (Dias 31-60), onda_3: Escala & Predictibilidade (Dias 61-90)'),
    focoPrincipal: RecomendacaoSchema,
    iniciativasPraticas: z.array(z.object({
      titulo: z.string(),
      descricao: RecomendacaoSchema,
      impactoEstimado1a10: z.number().min(1).max(10),
      confianca1a10: z.number().min(1).max(10),
      facilidade1a10: z.number().min(1).max(10),
      scoreIceCalculado: z.number().optional().describe('Preenchido ou ordenado por código'),
      ownerRole: z.string(),
      prazoDias: z.number(),
    })).min(2).max(4),
  })).min(3).max(3),
  metricasSucesso90Dias: z.array(RecomendacaoSchema).min(3),
  criteriosPerseverarOuPivotar: z.object({
    criterioPerseverar: RecomendacaoSchema,
    criterioPivotar: RecomendacaoSchema,
  }),
  decisao: z.string(),
  proximosPassos: z.array(z.object({
    acao: z.string(),
    responsavelRole: z.string(),
    prazoDias: z.number(),
  })).min(1),
});

export type Plano90DiasOutput = z.infer<typeof Plano90DiasOutputSchema>;

const SYSTEM_ADDENDUM = `
# Módulo 8: Plano de Ação 90 Dias & Matriz ICE

## 1. Objetivo Executivo e Estratégico
Consolidar todas as recomendações analíticas dos 7 módulos anteriores em um plano de execução cirúrgico de 90 dias dividido em 3 ondas estritas (\`onda_1\`: Fundação & Estancamento, \`onda_2\`: Tração & Validação, \`onda_3\`: Escala). Atribuir notas de 1 a 10 para Impacto, Confiança e Facilidade em cada iniciativa prática; o código calculará o score ICE final e ordenará as iniciativas.

## 2. Metodologia Passo a Passo de Análise
1. Sintetizar os aprendizados do Dossiê e módulos anteriores (Raio-X, ICP, Comitê, Posicionamento, Motor, Funil, Unit Economics).
2. Distribuir as iniciativas cirúrgicas nas 3 ondas (\`onda_1\` dias 1-30, \`onda_2\` dias 31-60, \`onda_3\` dias 61-90).
3. Atribuir notas realistas de Impacto (I), Confiança (C) e Facilidade (E) de 1 a 10 para cada iniciativa.
4. Definir indicadores verificáveis para o horizonte de 90 dias e critérios objetivos de perseverar vs pivotar.
5. Estabelecer governança executiva e prazos.

## 3. Guia Detalhado Campo a Campo
- \`ondasExecucao\`: Array com \`onda\` (usando chaves curtas \`onda_1\`, \`onda_2\`, \`onda_3\`), foco principal e iniciativas práticas com notas ICE. \`focoPrincipal\` e \`descricao\` são recomendações.
- \`metricasSucesso90Dias\`: Indicadores verificáveis para o trimestre, definidos como forma de medir (não como meta numérica inventada). CAC, ARPU e payback entram como métrica a apurar na onda 1, nunca como valor-alvo.
- \`criteriosPerseverarOuPivotar\`: Regras de decisão estratégica ao final dos 90 dias.
- \`decisao\` & \`proximosPassos\`: Execução e governança.
- Regra numérica transversal (vale para \`metricasSucesso90Dias\`, \`iniciativasPraticas[].descricao\`, \`criteriosPerseverarOuPivotar\` e \`decisao\`): metas numéricas (percentuais, múltiplos como LTV/CAC ≥3 ou NRR ≥100%, prazos de payback) exigem fonte que declare o mesmo número para a mesma métrica: cite [ID] em \`baseadoEm\`. Sem fonte, escreva a meta sem número ou com alvo a definir no piloto. Proibido reaproveitar número de outra métrica (ex.: 40% de redução de CAC não sustenta 40% de conversão; '100% atualizado' do marketing não sustenta NRR ≥100%). Em \`criteriosPerseverarOuPivotar\` e \`decisao\`, limiares (2x, 18 meses, dia 30) seguem a mesma regra: sem fonte, viram condição qualitativa ou 'a definir com os dados da onda_1'.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"onda": "onda_1", "focoPrincipal": {"text": "Estancar a perda de conversão na página de preços e publicar o tiering.", "baseadoEm": ["E2"]}, "iniciativasPraticas": [{"titulo": "Redesenhar página de preços com tiering e contato comercial", "descricao": {"text": "Incluir opção de contato comercial para contas que pedem planos customizados; medir cliques no botão de vendas antes e depois.", "baseadoEm": ["E2"]}, "impactoEstimado1a10": 9, "confianca1a10": 8, "facilidade1a10": 7, "ownerRole": "Head de Produto", "prazoDias": 14}]}\`
- MAL: \`{"onda": "onda_1", "iniciativasPraticas": [{"titulo": "Fazer tudo", "impactoEstimado1a10": 10, "confianca1a10": 10, "facilidade1a10": 10, "ownerRole": "Todo mundo", "prazoDias": 1}]}]}}\`

## 5. Antipadrões a Evitar
- Nunca usar valores de onda diferentes de \`onda_1\`, \`onda_2\` ou \`onda_3\`.
- Nunca atribuir notas 10 em tudo sem critério analítico.
- Anti-exemplo real (eval): MAL \`{"titulo": "Calculadora de ROI", "descricao": {"text": "Calculadora que devolve payback em meses a partir do investimento do piloto.", "baseadoEm": []}}\` → BOM \`{"titulo": "Calculadora de payback do piloto", "descricao": {"text": "Calculadora alimentada pelo CAC e pelo ARPU apurados na onda 1; sem esses insumos, não publicar prazo de payback.", "baseadoEm": []}}\`
`;

export const plano90DiasPromptSpec: PromptSpec<Plano90DiasInput, Plano90DiasOutput> = {
  id: 'module.plano_90_dias',
  version: '2.0.1',
  task: 'module',
  system: SHARED_SYSTEM_PREAMBLE + SYSTEM_ADDENDUM,
  buildUser(input: Plano90DiasInput): string {
    return `Com base no Dossiê e nos outputs de todos os módulos anteriores, gere o Módulo 8 (Plano de Ação 90 Dias) em JSON estrito.

DOSSIÊ ESTRATÉGICO:
${JSON.stringify(input.dossierSummary, null, 2)}

RESUMO DOS MÓDULOS ANTERIORES:
${JSON.stringify(input.allPreviousModulesSummary, null, 2)}`;
  },
  schema: Plano90DiasOutputSchema,
};
