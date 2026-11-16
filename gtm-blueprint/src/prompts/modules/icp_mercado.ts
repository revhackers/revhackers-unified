import { z } from 'zod';
import type { PromptSpec } from '../types';
import { SHARED_SYSTEM_PREAMBLE } from '../shared';
import { ClaimSchema } from '../evidence';

export const IcpMercadoInputSchema = z.object({
  dossierSummary: z.record(z.any()),
  tamBottomUpData: z.object({
    totalTargetAccounts: z.number().describe('Número total de contas no mercado brasileiro'),
    estimatedSamAccounts: z.number().describe('Contas atendíveis (SAM)'),
    estimatedSomAccounts: z.number().describe('Contas alcançáveis em 12 meses (SOM)'),
    arpuMedioMensal: z.number(),
  }).nullable().describe('null = dado de mercado indisponível: não estime números; liste exatamente quais dados coletar (contagem de empresas por CNAE/porte/UF na base aberta da Receita, ticket médio real).'),
});

export type IcpMercadoInput = z.infer<typeof IcpMercadoInputSchema>;

export const IcpMercadoOutputSchema = z.object({
  icpPrioritario: z.object({
    descricaoFirmografica: ClaimSchema,
    criteriosQualificacao: z.array(ClaimSchema),
    sinaisDeMomentoTrigger: z.array(ClaimSchema).describe('Ex: captação de Série A, troca de CTO, expansão de headcount de vendas'),
  }),
  antiIcp: z.object({
    descricaoEvitar: ClaimSchema,
    motivoDescarte: ClaimSchema,
  }),
  tamSamSomInterpretacao: z.object({
    analiseMercado: ClaimSchema,
    potencialReceitaAnualSom: z.string(),
  }),
  criteriosPriorizacaoContas: z.array(z.string()).min(3),
  decisao: z.string(),
  proximosPassos: z.array(z.object({
    acao: z.string(),
    responsavelRole: z.string(),
    prazoDias: z.number(),
  })).min(1),
});

export type IcpMercadoOutput = z.infer<typeof IcpMercadoOutputSchema>;

const SYSTEM_ADDENDUM = `
# Módulo 2: ICP e Mercado (TAM/SAM/SOM & Anti-ICP)

## 1. Objetivo Executivo e Estratégico
Definir com extrema precisão o ICP prioritário B2B e o Anti-ICP, interpretando matematicamente os dados de TAM/SAM/SOM fornecidos por código no input sem inventar números adicionais. O foco é estabelecer critérios firmográficos claros e gatilhos de momento (triggers) para prospecção cirúrgica no Brasil.

## 2. Metodologia Passo a Passo de Análise
1. Cruzar o Dossiê Estratégico com os dados numéricos de TAM, SAM e SOM passados no input (total de contas, SAM, SOM e ARPU).
2. Definir o perfil exato do ICP prioritário em termos firmográficos (setor, porte de colaboradores, faturamento, maturidade tecnológica).
3. Especificar os gatilhos de momento (triggers) que indicam prontidão de compra (ex: captação de investimento, contratação de VP de Vendas, migração de sistema).
4. Estabelecer o Anti-ICP com justificativa clara de por que descartar esses perfis evita o churn precoce e a queima de caixa.
5. Interpretar o potencial de receita anual do SOM usando estritamente os dados matemáticos fornecidos.

## 3. Guia Detalhado Campo a Campo
- \`icpPrioritario\`: Descrição firmográfica, critérios de qualificação e triggers de momento.
- \`antiIcp\`: Perfil a ser evitado e motivo do descarte.
- \`tamSamSomInterpretacao\`: Análise estratégica sobre o mercado endereçável e potencial de receita anual.
- \`criteriosPriorizacaoContas\`: Critérios objetivos para ranking de contas.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"descricaoFirmografica": {"text": "Empresas de software e serviços B2B com 50 a 250 funcionários sediadas no Sudeste, faturamento anual entre R$ 5M e R$ 30M, conforme alinhamento com a tese do Dossiê.", "status": "VERIFICADO", "evidenceIds": ["E1"]}}\`
- MAL: \`{"descricaoFirmografica": {"text": "Qualquer empresa que queira vender mais.", "status": "VERIFICADO", "evidenceIds": []}}\`

## 5. Antipadrões a Evitar
- Nunca modificar os números matemáticos de TAM/SAM/SOM fornecidos pelo código.
- Nunca criar ICPs vagos que sirvam para qualquer mercado.
`;

export const icpMercadoPromptSpec: PromptSpec<IcpMercadoInput, IcpMercadoOutput> = {
  id: 'module.icp_mercado',
  version: '1.0.0',
  task: 'module',
  system: SHARED_SYSTEM_PREAMBLE + SYSTEM_ADDENDUM,
  buildUser(input: IcpMercadoInput): string {
    return `Com base no Dossiê e nos dados de TAM/SAM/SOM fornecidos, gere o Módulo 2 (ICP e Mercado) em JSON estrito.

DOSSIÊ ESTRATÉGICO:
${JSON.stringify(input.dossierSummary, null, 2)}

DADOS TAM/SAM/SOM (FORNECIDOS POR CÓDIGO - USE ESTES NÚMEROS):
${JSON.stringify(input.tamBottomUpData, null, 2)}`;
  },
  schema: IcpMercadoOutputSchema,
};
