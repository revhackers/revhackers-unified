import { z } from 'zod';
import type { PromptSpec } from '../types';
import { SHARED_SYSTEM_PREAMBLE } from '../shared';
import { ClaimSchema } from '../evidence';

export const ComiteCompraInputSchema = z.object({
  dossierSummary: z.record(z.any()),
  icpOutput: z.record(z.any()),
});

export type ComiteCompraInput = z.infer<typeof ComiteCompraInputSchema>;

export const ComiteCompraOutputSchema = z.object({
  membrosComite: z.array(z.object({
    papel: z.enum(['Decisor (C-Level/Diretor)', 'Influenciador Técnico', 'Usuário Final', 'Bloqueador/Financeiro']),
    nomeCargo: z.string().describe('Ex: Renata Silveira (Head de RevOps)'),
    dorPrimaria: ClaimSchema,
    gatilhoConversao: ClaimSchema,
    objecaoChave: ClaimSchema,
    criterioAvaliacao: ClaimSchema,
    mensagemChaveProposta: ClaimSchema,
  })).min(3).max(4),
  dinamicaAprovacao: ClaimSchema.describe('Como o comitê interage e quem tem veto final na decisão de compra'),
  decisao: z.string(),
  proximosPassos: z.array(z.object({
    acao: z.string(),
    responsavelRole: z.string(),
    prazoDias: z.number(),
  })).min(1),
});

export type ComiteCompraOutput = z.infer<typeof ComiteCompraOutputSchema>;

const SYSTEM_ADDENDUM = `
# Módulo 3: Comitê de Compra B2B (Buying Committee)

## 1. Objetivo Executivo e Estratégico
Mapear com precisão cirúrgica a dinâmica política, as dores e o processo de aprovação do comitê de compra B2B para o ICP definido no Módulo 2 e no Dossiê. É fundamental reutilizar as personas e cargos definidos no Dossiê por nome, detalhando critérios de avaliação, objeções-chave e a mensagem exata para desarmar resistências.

## 2. Metodologia Passo a Passo de Análise
1. Resgatar as personas do comitê de compra estabelecidas no Dossiê Estratégico.
2. Detalhar para cada membro (Decisor, Influenciador, Usuário, Bloqueador/Financeiro) a dor primária, o gatilho de conversão e a objeção principal.
3. Especificar os critérios objetivos de avaliação de ROI/valor que cada membro utiliza na tomada de decisão.
4. Desenhar a dinâmica de aprovação corporativa, explicitando quem detém o poder de veto final (geralmente CFO ou CEO).
5. Definir a mensagem-chave da proposta comercial direcionada a cada stakeholder.

## 3. Guia Detalhado Campo a Campo
- \`membrosComite\`: Array com papel, nome/cargo, dor primária, gatilho, objeção, critério de avaliação e mensagem-chave.
- \`dinamicaAprovacao\`: Explicação de como o comitê delibera e quem tem veto.
- \`decisao\`: Ação tática imediata para engajamento do comitê.
- \`proximosPassos\`: Passos operacionais com prazos.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"papel": "Decisor (C-Level/Diretor)", "nomeCargo": "Carlos Alberto (CRO)", "dorPrimaria": {"text": "Previsibilidade de forecast e redução de ciclo de vendas em ciclos Enterprise, conforme tese do Dossiê.", "status": "VERIFICADO", "evidenceIds": ["E1"]}}\`
- MAL: \`{"papel": "Decisor", "nomeCargo": "Chefe", "dorPrimaria": {"text": "Quer vender mais.", "status": "VERIFICADO", "evidenceIds": []}}\`

## 5. Antipadrões a Evitar
- Nunca inventar personas desconectadas do Dossiê Estratégico.
- Nunca ignorar a figura do Bloqueador Financeiro/CFO no processo de aprovação B2B no Brasil.
- Nunca escrever textos longos: limite cada campo \`text\` e \`howToValidate\` a 2 frases curtas (máx. ~400 caracteres cada). Saída longa é cortada pelo limite de tokens e invalida o módulo inteiro.
`;

export const comiteCompraPromptSpec: PromptSpec<ComiteCompraInput, ComiteCompraOutput> = {
  id: 'module.comite_compra',
  version: '1.1.0',
  task: 'module',
  system: SHARED_SYSTEM_PREAMBLE + SYSTEM_ADDENDUM,
  buildUser(input: ComiteCompraInput): string {
    return `Com base no Dossiê Estratégico e no ICP definido, gere o Módulo 3 (Comitê de Compra B2B) em JSON estrito.

DOSSIÊ ESTRATÉGICO:
${JSON.stringify(input.dossierSummary, null, 2)}

ICP DEFINIDO NO MÓDULO ANTERIOR:
${JSON.stringify(input.icpOutput, null, 2)}`;
  },
  schema: ComiteCompraOutputSchema,
};
