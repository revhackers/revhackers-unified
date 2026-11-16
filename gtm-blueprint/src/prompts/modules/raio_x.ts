import { z } from 'zod';
import type { PromptSpec } from '../types';
import { SHARED_SYSTEM_PREAMBLE } from '../shared';
import { ClaimSchema } from '../evidence';

export const RaioXInputSchema = z.object({
  dossierSummary: z.record(z.any()).describe('Resumo do Dossiê Estratégico'),
});

export type RaioXInput = z.infer<typeof RaioXInputSchema>;

export const RaioXOutputSchema = z.object({
  resumoExecutivo: z.string().describe('Visão cirúrgica de 2 parágrafos sobre a saúde atual de GTM da empresa'),
  achadosCriticosReceita: z.array(z.object({
    titulo: z.string(),
    impactoNaReceita: z.string().describe('Impacto qualitativo na receita, sem percentual nem valor'),
    evidenciaOuHipotese: ClaimSchema,
    custoDeInacao: z.string(),
  })).min(3).max(3).describe('Exatamente os 3 achados que mais custam receita'),
  decisao: z.string().describe('A decisão imediata que o CEO/CRO precisa tomar esta semana'),
  proximosPassos: z.array(z.object({
    acao: z.string(),
    responsavelRole: z.string().describe('Ex: Head de Growth, CEO, CRO'),
    prazoDias: z.number().describe('Prazo em dias para execução (ex: 7)'),
  })).min(1),
});

export type RaioXOutput = z.infer<typeof RaioXOutputSchema>;

const SYSTEM_ADDENDUM = `
# Módulo 1: Raio-X Executivo (Diagnóstico de Sangria de Receita)

## 1. Objetivo Executivo e Estratégico
Fornecer ao CEO, fundadores e CRO uma visão cirúrgica e implacável dos 3 maiores gargalos de GTM que estão sangrando receita neste momento exato. O diagnóstico deve cruzar os dados do Dossiê Estratégico com os sinais de maturidade digital e CNPJ para expor falhas estruturais de aquisição, conversão ou retenção.

## 2. Metodologia Passo a Passo de Análise
1. Analisar a tese central e o modelo de negócio do Dossiê Estratégico.
2. Identificar exatamente 3 achados críticos onde a empresa perde oportunidades de receita (ex: ausência de preços claros, CTA desalinhado com ICP enterprise, falta de prova social).
3. Avaliar o impacto qualitativo na receita e o custo de inação caso os gargalos não sejam corrigidos em 90 dias.
4. Definir a decisão executiva imediata que o líder da empresa precisa tomar na presente semana.
5. Estabelecer próximos passos acionáveis com responsáveis e prazos rigorosos.

## 3. Guia Detalhado Campo a Campo
- \`resumoExecutivo\`: Panorama analítico de 2 parágrafos apontando a saúde de GTM.
- \`achadosCriticosReceita\`: Exatamente 3 gargalos principais com título, impacto qualitativo na receita, Claim associado e custo de inação. \`impactoNaReceita\` não leva percentual nem valor.
- \`decisao\`: A decisão crítica imediata para a semana.
- \`proximosPassos\`: Ações práticas com papéis e prazos.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"titulo": "Ausência de Tiering na Página de Preços", "impactoNaReceita": "Perda de oportunidades Enterprise que buscam planos customizados sem opção clara de contato comercial conforme [E2].", "custoDeInacao": "Estagnação do ARPU e perda de espaço para concorrentes com ofertas modulares."}\`
- MAL: \`{"titulo": "Marketing Ruim", "impactoNaReceita": "Perda de 50% de leads e faturamento.", "custoDeInacao": "Empresa vai quebrar."}\`

## 5. Antipadrões a Evitar
- Nunca inventar percentuais de perda de leads ou faturamento sem suporte nas evidências.
- Nunca emitir conselhos genéricos como "melhorar o site".
`;

export const raioXPromptSpec: PromptSpec<RaioXInput, RaioXOutput> = {
  id: 'module.raio_x',
  version: '2.0.0',
  task: 'module',
  system: SHARED_SYSTEM_PREAMBLE + SYSTEM_ADDENDUM,
  buildUser(input: RaioXInput): string {
    return `Com base no Dossiê Estratégico fornecido, gere o Módulo 1 (Raio-X Executivo) em JSON estrito.

DOSSIÊ ESTRATÉGICO:
${JSON.stringify(input.dossierSummary, null, 2)}`;
  },
  schema: RaioXOutputSchema,
};
