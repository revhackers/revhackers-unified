import { z } from 'zod';
import type { PromptSpec } from './types';
import { SHARED_SYSTEM_PREAMBLE } from './shared';

export const ExtractInputSchema = z.object({
  url: z.string().describe('URL da página ou fonte analisada'),
  kind: z.string().describe('Tipo de fonte (site_home, site_pricing, site_about, linkedin_profile, etc.)'),
  rawContent: z.string().describe('Conteúdo textual bruto extraído da página'),
});

export type ExtractInput = z.infer<typeof ExtractInputSchema>;

export const ExtractQuoteItemSchema = z.object({
  text: z.string().describe('Informação extraída'),
  quote: z.string().describe('Trecho literal exato do texto bruto que comprova a informação'),
});

export const ExtractOutputSchema = z.object({
  url: z.string(),
  propostaValorDeclarada: z.object({
    resumo: z.string().describe('Proposta de valor principal identificada'),
    quote: z.string().describe('Trecho literal do site'),
  }).nullable(),
  icpDeclarado: z.object({
    publicoAlvo: z.string().describe('Para quem o produto é claramente direcionado segundo o texto'),
    quote: z.string().describe('Trecho literal'),
  }).nullable(),
  produtosPlanosPrecos: z.array(z.object({
    nomePlano: z.string(),
    precoStr: z.string().describe('Ex: R$ 490/mês ou sob consulta'),
    features: z.array(z.string()),
    quote: z.string(),
  })),
  provasSociais: z.array(z.object({
    tipo: z.enum(['logo', 'case_estudo', 'depoimento', 'metrica_citada']),
    descricao: z.string(),
    quote: z.string(),
  })),
  ctasConversao: z.array(z.object({
    textoBotao: z.string(),
    destino: z.string().optional(),
    quote: z.string(),
  })),
  sinaisMaturidade: z.array(z.string()).describe('Ex: chat de vendas ativo, sem login visível, enterprise form, etc.'),
  lacunasOuInconsistencias: z.array(z.string()).describe('Ex: preço ausente, termos quebrados, promessa vaga'),
});

export type ExtractOutput = z.infer<typeof ExtractOutputSchema>;

const EXTRACT_SYSTEM_PROMPT = `${SHARED_SYSTEM_PREAMBLE}

# Tarefa específica: Extração Estruturada de Página Web/Perfil
Você receberá o conteúdo textual bruto de uma página ou perfil digital. Sua tarefa é extrair fatos verificáveis estritamente com base no texto fornecido, preenchendo o JSON conforme o schema.

Regras rígidas para esta tarefa:
1. NUNCA invente informações. Se um campo não estiver presente no texto bruto, utilize null ou lista vazia ([]).
2. Todo item extraído DEVE incluir um 'quote' (trecho literal exato extraído do texto bruto).
3. Seja conciso, cirúrgico e objetivo. Foque em dados B2B (preços, ICP, promessas, provas, CTAs).
`;

export const extractPromptSpec: PromptSpec<ExtractInput, ExtractOutput> = {
  id: 'extract.page',
  version: '2.0.0',
  task: 'extract',
  system: EXTRACT_SYSTEM_PROMPT,
  buildUser(input: ExtractInput): string {
    return `Analise o conteúdo da URL ${input.url} (tipo: ${input.kind}) e extraia os fatos estruturados conforme o JSON schema.

CONTEÚDO BRUTO:
"""
${input.rawContent}
"""`;
  },
  schema: ExtractOutputSchema,
};

/** Normaliza para comparar citações: espaços colapsados, minúsculas e aspas tipográficas viram retas. */
function normalizeQuote(text: string): string {
  return text
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Mantém só os itens cuja citação (`quote`) aparece literalmente no conteúdo da página.
 * Campo único com citação inválida vira null. Devolve quantas citações foram descartadas.
 */
export function verifyExtract(extract: ExtractOutput, content: string): { extract: ExtractOutput; dropped: number } {
  const source = normalizeQuote(content);
  const supported = (quote: string): boolean => {
    const needle = normalizeQuote(quote);
    return needle.length > 0 && source.includes(needle);
  };
  let dropped = 0;
  const keepItems = <T extends { quote: string }>(items: T[]): T[] => {
    const kept = items.filter((item) => supported(item.quote));
    dropped += items.length - kept.length;
    return kept;
  };
  const keepSingle = <T extends { quote: string }>(item: T | null): T | null => {
    if (item === null) return null;
    if (supported(item.quote)) return item;
    dropped += 1;
    return null;
  };
  return {
    extract: {
      ...extract,
      propostaValorDeclarada: keepSingle(extract.propostaValorDeclarada),
      icpDeclarado: keepSingle(extract.icpDeclarado),
      produtosPlanosPrecos: keepItems(extract.produtosPlanosPrecos),
      provasSociais: keepItems(extract.provasSociais),
      ctasConversao: keepItems(extract.ctasConversao),
    },
    dropped,
  };
}
