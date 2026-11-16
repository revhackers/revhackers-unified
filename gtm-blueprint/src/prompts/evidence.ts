import { z } from 'zod';

export const EvidenceKindSchema = z.enum([
  'cnpj',
  'site',
  'competitor_site',
  'linkedin',
  'crux',
  'market_count',
  'user_input',
  'file',
  'computed',
]);

export const EvidenceSchema = z.object({
  id: z.string().describe('Identificador único da evidência, ex: E1, E2'),
  kind: EvidenceKindSchema.describe('Tipo da fonte da evidência'),
  source: z.string().describe('URL ou nome da fonte/dataset de origem'),
  fetchedAt: z.string().describe('Data da coleta ISO 8601'),
  content: z.string().describe('Conteúdo textual ou resumo da evidência'),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const ClaimStatusSchema = z.enum(['VERIFICADO', 'HIPOTESE']);

const ClaimObjectSchema = z.object({
  text: z.string().describe('Fato observado ou hipótese sobre a empresa ou o mercado'),
  status: ClaimStatusSchema.describe('VERIFICADO exige evidenceIds válidos; HIPOTESE exige howToValidate'),
  evidenceIds: z.array(z.string()).default([]).describe('IDs das evidências que sustentam a afirmação (obrigatório se VERIFICADO). Use SOMENTE ids da lista de evidências recebida (E1, E2...). Nunca crie ids.'),
  howToValidate: z.string().optional().describe('Como validar a hipótese em campo (obrigatório se HIPOTESE)'),
});

/**
 * Small models sometimes return a bare string (or a list) where a Claim is expected.
 * Coerce to the SAFE side: unstructured text becomes HIPOTESE without evidence, never VERIFICADO.
 */
export const ClaimSchema = z.preprocess((v) => {
  if (typeof v === 'string') return { text: v, status: 'HIPOTESE', evidenceIds: [] };
  if (Array.isArray(v)) {
    const texts = v.map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' && 'text' in x ? String(x.text) : '')).filter(Boolean);
    return { text: texts.join(' '), status: 'HIPOTESE', evidenceIds: [] };
  }
  return v;
}, ClaimObjectSchema);

export type Claim = z.infer<typeof ClaimSchema>;

/**
 * Recomendação: ação, desenho de processo, mensagem ou alvo proposto. Não é fato observado e não tem status.
 * Uma string solta ou uma lista de strings vira recomendação sem referências.
 */
export const RecomendacaoSchema = z.preprocess(
  (v) => {
    if (typeof v === 'string') return { text: v, baseadoEm: [] };
    if (Array.isArray(v)) {
      return { text: v.filter((x): x is string => typeof x === 'string').join(' '), baseadoEm: [] };
    }
    return v;
  },
  z.object({
    text: z.string().describe('Ação, desenho de processo, mensagem ou alvo proposto. Não é fato observado.'),
    baseadoEm: z.array(z.string()).default([]).describe('IDs das evidências que motivam a recomendação. Use somente ids recebidos.'),
  }),
);

export type Recomendacao = z.infer<typeof RecomendacaoSchema>;

const SOURCE_HEADER_MAX = 200;
const OMISSION_MARKER_RESERVE = 80;
const INCOMPLETE_NOTICE_RESERVE = 320;

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function renderEvidenceHeader(ev: Evidence): string {
  const source = normalizeSpaces(ev.source);
  const shown = source.length > SOURCE_HEADER_MAX ? `${source.slice(0, SOURCE_HEADER_MAX)}…` : source;
  return `[${ev.id}] (${ev.kind}) Fonte: ${shown} (${ev.fetchedAt}) — `;
}

function cutMarkerReserve(total: number): number {
  return 60 + 2 * String(total).length;
}

// Água-furtando: fontes curtas recebem o conteúdo inteiro; as longas dividem o restante em cotas iguais.
function allocateContentBudget(needs: number[], budget: number): number[] {
  const allocation = new Array<number>(needs.length).fill(0);
  const order = needs.map((_, i) => i).sort((a, b) => needs[a] - needs[b]);
  let remaining = budget;
  order.forEach((idx, k) => {
    const share = Math.floor(remaining / (needs.length - k));
    const take = Math.min(needs[idx], share);
    allocation[idx] = take;
    remaining -= take;
  });
  return allocation;
}

/**
 * Renderiza evidências para o prompt dentro de `maxChars`, sem excluir fontes.
 * - Cabeçalho (ID, tipo, fonte, data) de TODAS as evidências é sempre emitido: IDs citáveis ficam visíveis.
 * - Orçamento de conteúdo dividido de forma justa; fontes curtas liberam o excedente.
 * - Espaços normalizados (tokens numéricos preservados); cortes em fronteira de espaço, marcados com exibidos/total
 *   (contagem em caracteres normalizados).
 * - Orçamento insuficiente é declarado no próprio texto (AVISO DE INCOMPLETUDE).
 * Limite: se só os cabeçalhos excederem `maxChars`, o texto excede para não ocultar IDs.
 * Checagem mecânica: isto garante visibilidade e marcação de corte; não prova que a fonte sustenta a afirmação.
 */
export function renderEvidenceCompact(evidences: Evidence[], maxChars = 8000): string {
  if (!evidences || evidences.length === 0) {
    return 'Nenhuma evidência externa fornecida. Trate todas as premissas analíticas como HIPOTESE.';
  }

  const headers = evidences.map(renderEvidenceHeader);
  const bodies = evidences.map((ev) => normalizeSpaces(ev.content));
  const headerChars = headers.reduce((sum, h) => sum + h.length + 1, 0);
  const bodyChars = bodies.reduce((sum, b) => sum + b.length, 0);
  if (headerChars + bodyChars <= maxChars) {
    return evidences.map((_, i) => headers[i] + bodies[i]).join('\n');
  }

  const budget = maxChars - headerChars - evidences.length * OMISSION_MARKER_RESERVE - INCOMPLETE_NOTICE_RESERVE;
  const allocation = allocateContentBudget(bodies.map((b) => b.length), Math.max(0, budget));
  let truncated = 0;
  let omitted = 0;
  const lines = evidences.map((_, i) => {
    const total = bodies[i].length;
    if (allocation[i] >= total) return headers[i] + bodies[i];
    const keep = allocation[i] - cutMarkerReserve(total);
    if (keep <= 0) {
      omitted += 1;
      return `${headers[i]}[conteúdo omitido por orçamento: ${total} caracteres]`;
    }
    let cut = bodies[i].slice(0, keep);
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > keep / 2) cut = cut.slice(0, lastSpace);
    truncated += 1;
    return `${headers[i]}${cut} […cortado: exibidos ${cut.length} de ${total} caracteres]`;
  });
  return [
    ...lines,
    `[AVISO DE INCOMPLETUDE: ${truncated} fonte(s) com trecho cortado e ${omitted} sem conteúdo, por limite de ${maxChars} caracteres. Os IDs listados existem nesta execução; o que estiver apenas nos trechos cortados ou omitidos não está verificado aqui.]`,
  ].join('\n');
}

function isClaimLike(v: unknown): v is { text: unknown; status: unknown; evidenceIds: unknown; howToValidate?: unknown } {
  return typeof v === 'object' && v !== null && 'text' in v && 'status' in v && 'evidenceIds' in v;
}

function isRecomendacaoLike(v: unknown): v is { text: unknown; baseadoEm: unknown } {
  return typeof v === 'object' && v !== null && 'text' in v && 'baseadoEm' in v && !('status' in v);
}

/**
 * Trava epistêmica aplicada por código (não depende do modelo obedecer):
 * - remove evidenceIds inexistentes e rebaixa para HIPOTESE todo VERIFICADO sem evidência válida;
 * - remove de `baseadoEm` das recomendações os ids inexistentes.
 * Devolve o total de rebaixamentos para auditoria.
 */
export function enforceEvidence<T>(value: T, validIds: ReadonlySet<string>): { value: T; downgraded: number } {
  let downgraded = 0;
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v !== 'object' || v === null) return v;
    const entries = Object.entries(v).map(([k, child]) => [k, walk(child)] as const);
    const obj: Record<string, unknown> = Object.fromEntries(entries);
    if (isClaimLike(obj)) {
      const ids = Array.isArray(obj.evidenceIds) ? obj.evidenceIds.filter((id): id is string => typeof id === 'string' && validIds.has(id)) : [];
      obj.evidenceIds = ids;
      if (obj.status === 'VERIFICADO' && ids.length === 0) {
        obj.status = 'HIPOTESE';
        obj.howToValidate = typeof obj.howToValidate === 'string' && obj.howToValidate
          ? obj.howToValidate
          : 'Rebaixado automaticamente: a afirmação não cita evidência coletada. Validar com dado do cliente ou fonte pública antes de usar.';
        downgraded += 1;
      }
    } else if (isRecomendacaoLike(obj)) {
      obj.baseadoEm = Array.isArray(obj.baseadoEm)
        ? obj.baseadoEm.filter((id): id is string => typeof id === 'string' && validIds.has(id))
        : [];
    }
    return obj;
  };
  return { value: walk(value) as T, downgraded };
}

// Chaves onde moram as personas do comitê (dossiê e módulo 3) e as dores/objeções que nenhum dado do site comprova.
const PERSONA_GROUP_KEYS: Record<string, true> = { comiteCompraB2B: true, membrosComite: true };
const PERSONA_CLAIM_KEYS: Record<string, true> = {
  dorPrincipal: true, gatilhoDeCompra: true, objecaoPrincipal: true, dorPrimaria: true,
  gatilhoConversao: true, objecaoChave: true, criterioAvaliacao: true,
};
const PERSONA_VALIDATION = 'Validar em entrevistas de discovery ou win/loss com clientes e prospects.';
const CLIENT_LIST_KEY = 'clientesObservados';

/**
 * Trava de persona por código: dor, gatilho, objeção e critério de uma persona nunca são fato verificado.
 * Claims VERIFICADO sob as chaves de persona viram HIPOTESE com `howToValidate` (existente ou padrão).
 * Em `clientesObservados`, entradas cujo `evidenceId` não existe são removidas.
 * Devolve o total de rebaixamentos de persona para auditoria.
 */
export function enforcePersonaHypothesis<T>(value: T, validIds: ReadonlySet<string>): { value: T; downgraded: number } {
  let downgraded = 0;
  const walk = (v: unknown, inPersonaGroup: boolean): unknown => {
    if (Array.isArray(v)) return v.map((item) => walk(item, inPersonaGroup));
    if (typeof v !== 'object' || v === null) return v;
    const obj: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(v)) {
      if (key === CLIENT_LIST_KEY && Array.isArray(child)) {
        obj[key] = child.filter((client) => {
          const evidenceId = typeof client === 'object' && client !== null && 'evidenceId' in client ? client.evidenceId : undefined;
          return typeof evidenceId === 'string' && validIds.has(evidenceId);
        });
        continue;
      }
      obj[key] = walk(child, inPersonaGroup || PERSONA_GROUP_KEYS[key] === true);
    }
    if (inPersonaGroup) {
      for (const key of Object.keys(PERSONA_CLAIM_KEYS)) {
        const claim = obj[key];
        if (!isClaimLike(claim) || claim.status !== 'VERIFICADO') continue;
        obj[key] = {
          ...claim,
          status: 'HIPOTESE',
          howToValidate: typeof claim.howToValidate === 'string' && claim.howToValidate.trim() ? claim.howToValidate : PERSONA_VALIDATION,
        };
        downgraded += 1;
      }
    }
    return obj;
  };
  return { value: walk(value, false) as T, downgraded };
}
