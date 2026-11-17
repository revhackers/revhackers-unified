import { z } from 'zod';
import type { PromptSpec } from '../types';
import { SHARED_SYSTEM_PREAMBLE } from '../shared';
import { ClaimSchema, RecomendacaoSchema } from '../evidence';

export const FunilRevOpsInputSchema = z.object({
  dossierSummary: z.record(z.any()),
  motorDemandaOutput: z.record(z.any()),
});

export type FunilRevOpsInput = z.infer<typeof FunilRevOpsInputSchema>;

export const FunilRevOpsOutputSchema = z.object({
  etapasFunilB2B: z.array(z.object({
    estagio: z.string().describe('Ex: Lead Qualificado (SQL), Reunião Agendada, Proposta Enviada, Fechado Ganho, Onboarding (CS)'),
    criterioAvancoSla: RecomendacaoSchema,
    comoMedirConversao: RecomendacaoSchema.describe('Como medir a conversão desta etapa no CRM. Sem taxa numérica.'),
  })).min(4).max(6),
  slasSdrAeCs: z.array(z.object({
    transicao: z.string(),
    slaTempoMaximo: RecomendacaoSchema,
    regraPassagem: RecomendacaoSchema,
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
Desenhar o fluxo operacional de conversão do lead até o sucesso do cliente (CS), estabelecendo SLAs rigorosos de passagem de bastão entre SDR, AE e CS. Não informe taxa de conversão: para cada etapa, defina o critério de avanço e como medir a conversão no CRM da empresa.

## 2. Metodologia Passo a Passo de Análise
1. Definir as 4 a 6 etapas essenciais do funil B2B (ex: MQL, SQL, Reunião Realizada, Proposta, Fechado, Onboarding).
2. Estabelecer critérios claros de avanço (SLA de passagem) para cada estágio.
3. Definir \`comoMedirConversao\` para cada etapa: a consulta ou o relatório do CRM que mostra a proporção de avanço, sem taxa numérica.
4. Definir SLAs de tempo máximo de resposta entre SDR, AE e CS.
5. Mapear gaps típicos de processo no CRM (ex: falta de campos obrigatórios, lead sem atribuição de canal).

## 3. Guia Detalhado Campo a Campo
- \`etapasFunilB2B\`: Estágio do funil, critério de avanço (recomendação) e como medir a conversão no CRM (recomendação, sem taxa).
- \`slasSdrAeCs\`: Transições de equipe com tempo máximo e regras de passagem (recomendações).
- \`gapsProcessoCRM\`: Falhas operacionais típicas de CRM (Claims). Quantidade de leads afetados só entra quando o CRM mostrar o número; sem ele, o gap vira hipótese com o procedimento de auditoria.
- \`decisao\` & \`proximosPassos\`: Governança de RevOps.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"estagio": "Proposta Enviada", "criterioAvancoSla": {"text": "Proposta enviada só entra no funil com valor, prazo de decisão e contato do decisor preenchidos.", "baseadoEm": []}, "comoMedirConversao": {"text": "Exportar do CRM as oportunidades movidas de qualificação para proposta nos últimos 6 meses e calcular a proporção.", "baseadoEm": []}}\`
- MAL: \`{"estagio": "Proposta Enviada", "comoMedirConversao": {"text": "A conversão de SQL para proposta é de 42,5%.", "baseadoEm": []}}\`

## 5. Antipadrões a Evitar
- Nunca inventar taxas de conversão precisas sem base nos dados da empresa ou fontes auditadas.
- Anti-exemplo real (eval): MAL \`{"text": "[N] leads por mês sem dono no CRM, com perda de R$ [X] milhões em pipeline.", "status": "VERIFICADO", "evidenceIds": ["E6"]}\` → BOM \`{"text": "Não há evidência de como os leads recebem responsável; a falta de campo obrigatório precisa ser auditada no CRM.", "status": "HIPOTESE", "evidenceIds": ["E6"], "howToValidate": "Exportar do CRM os leads sem responsável atribuído no período e calcular a proporção sobre o total."}\`
- Nunca deixar de definir os SLAs de atendimento de leads por SDR.
- Afirmação sobre dado ausente no CRM é HIPOTESE com howToValidate executável; evidenceIds apenas de evidência lida que mostre o contexto da afirmação; nunca afirmar conteúdo de campo que não foi lido nem trocar o sujeito do fato.
`;

export const funilRevOpsPromptSpec: PromptSpec<FunilRevOpsInput, FunilRevOpsOutput> = {
  id: 'module.funil_revops',
  version: '2.0.1',
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
