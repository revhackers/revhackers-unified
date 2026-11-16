import { z } from 'zod';
import type { PromptSpec } from '../types';
import { SHARED_SYSTEM_PREAMBLE } from '../shared';
import { ClaimSchema } from '../evidence';

export const FunilRevOpsInputSchema = z.object({
  dossierSummary: z.record(z.any()),
  motorDemandaOutput: z.record(z.any()),
});

export type FunilRevOpsInput = z.infer<typeof FunilRevOpsInputSchema>;

export const FunilRevOpsOutputSchema = z.object({
  etapasFunilB2B: z.array(z.object({
    estagio: z.string().describe('Ex: Lead Qualificado (SQL), Reunião Agendada, Proposta Enviada, Fechado Ganho, Onboarding (CS)'),
    criterioAvancoSla: ClaimSchema,
    conversaoEsperadaBenchmark: ClaimSchema.describe('Obrigatório ser HIPÓTESE sem números inventados, salvo benchmark explícito nas evidências'),
  })).min(4).max(6),
  slasSdrAeCs: z.array(z.object({
    transicao: z.string(),
    slaTempoMaximo: ClaimSchema,
    regraPassagem: ClaimSchema,
  })).min(2),
  gapsProcessoCRM: z.array(ClaimSchema),
  decisao: z.string(),
  proximosPassos: z.array(z.object({
    acao: z.string(),
    responsavelRole: z.string(),
    prazoDias: z.number(),
  })).min(1),
});

export type FunilRevOpsOutput = z.infer<typeof FunilRevOpsOutputSchema>;

const SYSTEM_ADDENDUM = `
# Módulo 6: Funil B2B e RevOps (Sales Operations)

## 1. Objetivo Executivo e Estratégico
Desenhar o fluxo operacional de conversão do lead até o sucesso do cliente (CS), estabelecendo SLAs rigorosos de passagem de bastão entre SDR, AE e CS. É proibido inventar taxas de conversão numéricas em \`conversaoEsperadaBenchmark\`; estas devem ser marcadas como HIPÓTESE com orientação de como auditar no CRM, a menos que uma fonte externa conste nas evidências.

## 2. Metodologia Passo a Passo de Análise
1. Definir as 4 a 6 etapas essenciais do funil B2B (ex: MQL, SQL, Reunião Realizada, Proposta, Fechado, Onboarding).
2. Estabelecer critérios claros de avanço (SLA de passagem) para cada estágio.
3. Definir \`conversaoEsperadaBenchmark\` estritamente como HIPÓTESE fundamentada, explicando como medir a conversão real no CRM da empresa.
4. Definir SLAs de tempo máximo de resposta entre SDR, AE e CS.
5. Mapear gaps típicos de processo no CRM (ex: falta de campos obrigatórios, lead sem atribuição de canal).

## 3. Guia Detalhado Campo a Campo
- \`etapasFunilB2B\`: Estágio do funil, critério de avanço e conversão esperada (HIPÓTESE sem números inventados).
- \`slasSdrAeCs\`: Transições de equipe com tempo máximo e regras.
- \`gapsProcessoCRM\`: Falhas operacionais típicas de CRM.
- \`decisao\` & \`proximosPassos\`: Governança de RevOps.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"conversaoEsperadaBenchmark": {"text": "Taxa estimada de conversão de SQL para Proposta em torno de 25% a 35% conforme benchmarks de inside sales B2B SaaS no Brasil; a taxa exata precisa ser extraída diretamente do pipeline do CRM.", "status": "HIPOTESE", "evidenceIds": [], "howToValidate": "Exportar do CRM o histórico de oportunidades movidas de qualificação para proposta nos últimos 6 meses e calcular a proporção."}}\`
- MAL: \`{"conversaoEsperadaBenchmark": {"text": "Conversão exata de 42.5%.", "status": "VERIFICADO", "evidenceIds": []}}\`

## 5. Antipadrões a Evitar
- Nunca inventar taxas de conversão precisas sem base nos dados da empresa ou fontes auditadas.
- Nunca deixar de definir os SLAs de atendimento de leads por SDR.
`;

export const funilRevOpsPromptSpec: PromptSpec<FunilRevOpsInput, FunilRevOpsOutput> = {
  id: 'module.funil_revops',
  version: '1.0.0',
  task: 'module',
  system: SHARED_SYSTEM_PREAMBLE + SYSTEM_ADDENDUM,
  buildUser(input: FunilRevOpsInput): string {
    return `Com base no Dossiê e no Motor de Demanda, gere o Módulo 6 (Funil e RevOps) em JSON estrito.

DOSSIÊ ESTRATÉGICO:
${JSON.stringify(input.dossierSummary, null, 2)}

MOTOR DE DEMANDA:
${JSON.stringify(input.motorDemandaOutput, null, 2)}`;
  },
  schema: FunilRevOpsOutputSchema,
};
