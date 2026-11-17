import { z } from 'zod';
import type { PromptSpec } from '../types';
import { SHARED_SYSTEM_PREAMBLE } from '../shared';
import { ClaimSchema, RecomendacaoSchema } from '../evidence';

export const MotorDemandaInputSchema = z.object({
  dossierSummary: z.record(z.any()),
  posicionamentoOutput: z.record(z.any()),
});

export type MotorDemandaInput = z.infer<typeof MotorDemandaInputSchema>;

export const MotorDemandaOutputSchema = z.object({
  mixCanaisPrioritarios: z.array(z.object({
    canal: z.enum(['ABM (Account-Based Marketing)', 'Outbound Rigoroso', 'Founder-Led LinkedIn / Social Selling', 'Inbound / SEO Técnico', 'Parcerias e Canais / Ecossistema']),
    alocacaoEsforcoPercentual: z.number().describe('Percentual de alocação de esforço da equipe (soma deve ser 100%)'),
    justificativaEstagioIcp: ClaimSchema,
    playConcretoExecucao: RecomendacaoSchema,
  })).min(3).max(4),
  ritualOperacionalGtm: RecomendacaoSchema.describe('Rotina semanal de prospecção e alinhamento Marketing/Vendas'),
  decisao: z.string(),
  proximosPassos: z.array(z.object({
    acao: z.string(),
    responsavelRole: z.string(),
    prazoDias: z.number(),
  })).min(1),
});

export type MotorDemandaOutput = z.infer<typeof MotorDemandaOutputSchema>;

const SYSTEM_ADDEND_RULE = `
# Módulo 5: Motor de Demanda e Canais GTM

## 1. Objetivo Executivo e Estratégico
Definir a matriz de canais de aquisição B2B mais eficiente para o estágio atual da empresa e ticket médio, estabelecendo a alocação de esforço operacional da equipe (cujos percentuais representam exclusivamente esforço/recursos, nunca promessas de resultados financeiros).

## 2. Metodologia Passo a Passo de Análise
1. Cruzar o estágio do negócio e o ICP do Dossiê com os canais viáveis (ABM, Outbound, LinkedIn/Social Selling, Inbound, Parcerias).
2. Proibir canais inadequados ao ticket e estágio (ex: sugerir tráfego pago B2C de massa para SaaS Enterprise).
3. Atribuir percentuais de alocação de esforço operacional cuja soma seja 100%.
4. Escrever plays táticos concretos de execução comercial (passo a passo de prospecção) em vez de dicas genéricas.
5. Desenhar o ritual operacional semanal de alinhamento entre Marketing e Vendas (SrevOps).

## 3. Guia Detalhado Campo a Campo
- \`mixCanaisPrioritarios\`: Array de canais com alocação de esforço (recursos/equipe), justificativa alinhada ao estágio (Claim) e play tático de execução (recomendação). A justificativa cita a origem observada dos clientes; quando ela não está no CRM, a frase vira hipótese com validação.
- \`playConcretoExecucao\`: Quantidades de desenho (toques, cadência, headcount) só do dossiê ou de evidência citada em \`baseadoEm\`; percentuais de diagnóstico só com a mesma métrica na fonte citada.
- Se a meta numérica sair por falta de fonte, o play descreve a execução qualitativa — nunca vazio, nunca só marcador. Percentual de diagnóstico (ex.: follow-up manual) exige fonte que declare essa mesma métrica.
- \`ritualOperacionalGtm\`: Rotina de cadência semanal de alinhamento comercial (recomendação).
- \`decisao\`: Decisão imediata sobre canais.
- \`proximosPassos\`: Ações operacionais com prazos.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"canal": "Founder-Led LinkedIn / Social Selling", "alocacaoEsforcoPercentual": 40, "justificativaEstagioIcp": {"text": "Adequado à fase de tração inicial onde o fundador possui autoridade técnica perante C-Levels, conforme Dossiê.", "status": "VERIFICADO", "evidenceIds": ["E1"]}, "playConcretoExecucao": {"text": "Publicar teardowns semanais de processo comercial e enviar convites personalizados aos decisores mapeados no Dossiê; medir a taxa de aceite no próprio LinkedIn.", "baseadoEm": ["E1"]}}\`
- MAL: \`{"canal": "Marketing Digital", "alocacaoEsforcoPercentual": 50, "justificativaEstagioIcp": {"text": "Fazer anúncios.", "status": "VERIFICADO", "evidenceIds": []}}\`

## 5. Antipadrões a Evitar
- Nunca usar percentuais para prever resultados de conversão (percentuais permitidos apenas para alocação de esforço/recursos).
- Nunca sugerir estratégias genéricas de postagens sem cadência ou ICP.
- Anti-exemplo real (eval): MAL \`{"canal": "Founder-Led LinkedIn / Social Selling", "justificativaEstagioIcp": {"text": "ICP de até [N] colaboradores e ticket de R$ [X] fecha [N] contratos pelo canal.", "status": "VERIFICADO", "evidenceIds": []}}\` → BOM \`{"canal": "Founder-Led LinkedIn / Social Selling", "justificativaEstagioIcp": {"text": "A eficácia do canal depende de o decisor reconhecer o fundador; a origem dos contratos atuais não está registrada e precisa ser apurada.", "status": "HIPOTESE", "evidenceIds": ["E1"], "howToValidate": "Cruzar a origem de cada contrato fechado no período com o canal de entrada registrado no CRM."}}\`
`;

export const motorDemandaPromptSpec: PromptSpec<MotorDemandaInput, MotorDemandaOutput> = {
  id: 'module.motor_demanda',
  version: '2.0.1',
  task: 'module',
  system: SHARED_SYSTEM_PREAMBLE + SYSTEM_ADDEND_RULE,
  buildUser(input: MotorDemandaInput): string {
    return `Com base no Dossiê e no Posicionamento, gere o Módulo 5 (Motor de Demanda) em JSON estrito.

DOSSIÊ ESTRATÉGICO:
${JSON.stringify(input.dossierSummary, null, 2)}

POSICIONAMENTO:
${JSON.stringify(input.posicionamentoOutput, null, 2)}`;
  },
  schema: MotorDemandaOutputSchema,
};
