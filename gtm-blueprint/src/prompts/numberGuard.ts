import type { Evidence } from './evidence.js';
import type { CompetitorStatus } from '../collect/site.js';
import type { PipelineInput } from '../pipeline.js';

/**
 * Guarda de proveniência numérica.
 *
 * Regra: toda métrica (valor com unidade, ou número de contagem/duração em contexto de métrica) em um campo
 * textual precisa ser sustentada por uma evidência CITADA no mesmo campo (evidenceIds do claim ou [ID] inline).
 * Se qualquer métrica de um campo não tiver suporte, o campo INTEIRO vira texto neutro. Repetir um número
 * permitido em outra frase do mesmo campo não libera a frase com número sem fonte.
 *
 * LIMITE: esta checagem é mecânica. Verifica que um valor normalizado (mesma unidade e magnitude) existe no
 * conteúdo da evidência citada. NÃO prova que a fonte sustenta a afirmação semanticamente (sujeito, população,
 * período ou condição podem divergir). Aprovação por esta guarda NÃO é comprovação de conteúdo.
 * Fontes `competitor_site` não entram no índice: concorrente não sustenta métrica própria.
 * Extrações (`extract.*`) não passam por esta guarda: citam texto bruto com números literais.
 *
 * Convenção de `churnMonthlyRate`: fração mensal (0,035 = 3,5% ao mês), a mesma de `unit_economics` (LTV = ARPU / churn).
 * `userInputEvidence` emite fração e percentual, porque a guarda casa `%` com `pct` e número puro com `num`/`*`.
 * Entradas do cliente viram a evidência `U1` (kind `user_input`): citáveis pela guarda, fora do loop de extração.
 */

export interface NumericFinding {
  path: string;
  reason: string;
}

export interface NumberGuardContext {
  evidences: Evidence[];
}

export interface NumberGuardOptions {
  pathPrefix?: string;
}

export interface NumberGuardResult<T> {
  value: T;
  downgradedClaims: number;
  findings: NumericFinding[];
}

export const BLOCKED_NARRATIVE_TEXT = 'Dado quantitativo não disponível nas fontes consultadas; validar antes de decidir.';
export const BLOCKED_HOWTO_TEXT = 'Obter o número na fonte primária (CRM, extrato financeiro ou fonte pública citada) antes de usar esta afirmação.';

// Tokens numéricos isolados: não colam em letras, dígitos, separadores de código (B2B, E1, gpt-5.6, v1:0).
const NUM_RE = /(?<![A-Za-z0-9_\-.\/:])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{1,3}(?:,\d{3})+|\d+,\d+|\d+\.\d{1,2}|\d+)(?!\d)(?![.,]\d)/g;
const URL_RE = /https?:\/\/\S+|www\.\S+|[\w-]+\.(?:com|br|io|net|org|app|dev)\S*/gi;
const CITE_RE = /\[([A-Za-z_]+\d*(?:\s*,\s*[A-Za-z_]+\d*)*)\]/g;
const CLAUSE_SPLIT_RE = /[;\n!?]+|\.(?!\d)/;
// Cláusula de proposta/meta não é fato medido. Risco: frase factual com "meta" passa sem checagem.
const PROPOSAL_RE = /\b(meta|metas|alvo|proposta|propor|proposto|sugerid[oa]|recomend\w*|validar|prazo|onda)\b/i;
const ICE_RE = /\bICE\b/;
const CURRENCY_PREFIX_RE = /(?:R\$|US\$|USD)\s*$/;
const PCT_SUFFIX_RE = /^\s*(?:%|por cento)/i;
const X_SUFFIX_RE = /^\s*(?:x|vezes)(?![\p{L}])/iu;
const DURATION_SUFFIX_RE = /^\s*(dias?|m[êe]s(?:es)?|anos?|semanas?)(?![\p{L}])/iu;
const DURATION_UNITS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^dia/i, 'dias'],
  [/^m[êe]s/i, 'meses'],
  [/^ano/i, 'anos'],
  [/^semana/i, 'semanas'],
];
// "M" é maiúsculo de propósito: "5 m" (metros) não vira milhão.
const SCALES: ReadonlyArray<readonly [RegExp, number]> = [
  [/^\s*(?:mil|k)(?![\p{L}])/iu, 1e3],
  [/^\s*(?:milhões|milhão|mi)(?![\p{L}])/iu, 1e6],
  [/^\s*M(?![\p{L}])/u, 1e6],
  [/^\s*(?:bilhões|bilhão|bi)(?![\p{L}])/iu, 1e9],
];
const COUNT_NOUN_RE = /^\s*(contas|clientes|leads|empresas|vendedores|SDRs?|AEs?|reuniões|reunião|licenças|usuários|funcionários|colaboradores|deals|negócios|contratos|pessoas)(?![\p{L}])/iu;
const DURATION_CONTEXT_RE = /CAC|LTV|payback|churn|ARPU|ciclo de vendas|convers|receita|faturamento|MRR|ARR|CNPJ|fundad|abert|ativ[oa] h|há/i;
const METRIC_KEYWORD_RE = /convers|churn|CAC|LTV|payback|ARPU|margem|ticket|MRR|ARR|NPS|ROI|faturamento|receita|taxa|CPL|CPA/i;

// Tabelas estáticas de chaves: `Record<string, true>` com lookup `=== true` (ts-set-map). Evita herdar chaves do protótipo (ex.: `constructor`).
const IGNORED_KEYS: Record<string, true> = {
  id: true, url: true, source: true, onda: true, status: true, evidenceIds: true, ownerRole: true, responsavelRole: true,
  locationPath: true, fetchedAt: true, severidade: true, tipoProblema: true,
};
const CLAIM_FIELDS: Record<string, true> = { text: true, status: true, evidenceIds: true, howToValidate: true };
const NO_KEYS: Record<string, true> = {};

type SupportIndex = Map<string, Set<string>>;

interface UnitSpec {
  unit: string;
  factor: number;
  prefix: string;
  suffix: string;
}

interface Metric {
  token: string;
  spec: UnitSpec;
}

interface GuardState {
  index: SupportIndex;
  prefix: string;
  findings: NumericFinding[];
  downgradedClaims: number;
}

// Formato único de chave: índice das fontes e checagem das afirmações devem usar exatamente o mesmo canônico.
function factKey(unit: string, value: number): string {
  return `${unit}|${String(Number(value.toFixed(6)))}`;
}

// Números com ponto de milhar são pt-BR. Grupos com vírgula são en-US. "2,5" nunca vira 25.
// Fonte inclusiva também aceita "2,500" como decimal pt-BR (2,5), porque a fonte pode estar em qualquer convenção.
function valueCandidates(token: string, inclusive: boolean): number[] {
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(token)) return [Number(token.replace(/\./g, '').replace(',', '.'))];
  if (/^\d{1,3}(,\d{3})+$/.test(token)) {
    const enUs = Number(token.replace(/,/g, ''));
    return inclusive && /^\d+,\d{3}$/.test(token) ? [enUs, Number(token.replace(',', '.'))] : [enUs];
  }
  if (/^\d+,\d+$/.test(token)) return [Number(token.replace(',', '.'))];
  return [Number(token)];
}

function scaleOf(rest: string): { factor: number; consumed: number } {
  for (const [re, factor] of SCALES) {
    const hit = re.exec(rest);
    if (hit) return { factor, consumed: hit[0].length };
  }
  return { factor: 1, consumed: 0 };
}

// Unidade explícita pelo contexto imediato (prefixo de moeda, sufixo de %, x, duração, substantivo de contagem).
// Duração em afirmação exige contexto de métrica; em fonte, qualquer duração conta.
function unitOf(before: string, rest: string, clause: string, isSource: boolean): UnitSpec | null {
  const pct = PCT_SUFFIX_RE.exec(rest);
  if (pct) return { unit: 'pct', factor: 1, prefix: '', suffix: pct[0] };
  const times = X_SUFFIX_RE.exec(rest);
  if (times) return { unit: 'x', factor: 1, prefix: '', suffix: times[0] };
  const scale = scaleOf(rest);
  const currency = CURRENCY_PREFIX_RE.exec(before);
  if (currency) return { unit: 'moeda', factor: scale.factor, prefix: currency[0], suffix: rest.slice(0, scale.consumed) };
  const noun = COUNT_NOUN_RE.exec(rest.slice(scale.consumed));
  if (noun) return { unit: 'num', factor: scale.factor, prefix: '', suffix: rest.slice(0, scale.consumed + noun[0].length) };
  const duration = DURATION_SUFFIX_RE.exec(rest);
  if (!duration || !(isSource || DURATION_CONTEXT_RE.test(clause))) return null;
  const unit = DURATION_UNITS.find(([re]) => re.test(duration[1] ?? ''))?.[1];
  return unit ? { unit, factor: 1, prefix: '', suffix: duration[0] } : null;
}

// Fonte: todo número vira métrica (sem unidade vira `num`). Afirmação: sem unidade só conta com palavra-chave de métrica,
// e cláusulas de proposta ou ICE são ignoradas.
function metricsIn(text: string, isSource: boolean): Metric[] {
  const metrics: Metric[] = [];
  for (const clause of text.split(CLAUSE_SPLIT_RE)) {
    if (!isSource && (PROPOSAL_RE.test(clause) || ICE_RE.test(clause))) continue;
    const keyword = METRIC_KEYWORD_RE.test(clause);
    for (const hit of clause.matchAll(NUM_RE)) {
      const token = hit[1] ?? '';
      const start = hit.index ?? 0;
      const before = clause.slice(0, start);
      const rest = clause.slice(start + token.length);
      const scale = scaleOf(rest);
      let spec = unitOf(before, rest, clause, isSource);
      if (!spec && (isSource || keyword)) {
        spec = { unit: isSource ? 'num' : '*', factor: scale.factor, prefix: '', suffix: rest.slice(0, scale.consumed) };
      }
      if (spec) metrics.push({ token, spec });
    }
  }
  return metrics;
}

function buildIndex(evidences: Evidence[]): SupportIndex {
  const index: SupportIndex = new Map();
  for (const ev of evidences) {
    if (ev.kind === 'competitor_site') continue;
    const keys = new Set<string>();
    for (const { token, spec } of metricsIn(ev.content.replace(URL_RE, ' '), true)) {
      for (const value of valueCandidates(token, true)) {
        keys.add(factKey(spec.unit, value * spec.factor));
        keys.add(factKey('*', value * spec.factor));
      }
    }
    index.set(ev.id, keys);
  }
  return index;
}

function unsupportedMetrics(text: string, claimIds: string[], index: SupportIndex): { labels: string[]; cited: string[] } {
  const body = text.replace(URL_RE, ' ');
  const inline = [...body.matchAll(CITE_RE)].flatMap((hit) => (hit[1] ?? '').split(',').map((id) => id.trim()));
  const cited = [...new Set([...claimIds, ...inline])];
  const labels: string[] = [];
  for (const { token, spec } of metricsIn(body, false)) {
    const keys = valueCandidates(token, false).map((value) => factKey(spec.unit, value * spec.factor));
    const supported = cited.some((id) => keys.some((key) => index.get(id)?.has(key)));
    if (!supported) labels.push(`${spec.prefix}${token}${spec.suffix}`.trim());
  }
  return { labels, cited };
}

function reasonFor(labels: string[], cited: string[]): string {
  const quoted = labels.map((label) => `"${label}"`).join(', ');
  const plural = labels.length > 1;
  const noun = plural ? 'Métricas' : 'Métrica';
  if (cited.length === 0) return `${noun} ${quoted} sem citação de evidência no campo.`;
  return `${noun} ${quoted} ${plural ? 'não constam' : 'não consta'} nas evidências citadas (${cited.join(', ')}).`;
}

function joinPath(parent: string, child: string): string {
  if (!parent || !child) return parent || child;
  return child.startsWith('[') ? `${parent}${child}` : `${parent}.${child}`;
}

function isClaimLike(value: object): value is Record<string, unknown> {
  return 'text' in value && 'status' in value && 'evidenceIds' in value;
}

function walkObject(
  node: Record<string, unknown>,
  path: string,
  state: GuardState,
  skip: Record<string, true>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(node).map(([key, value]): [string, unknown] => [
      key,
      IGNORED_KEYS[key] === true || skip[key] === true ? value : walk(value, joinPath(path, key), state),
    ]),
  );
}

function guardText(text: string, path: string, state: GuardState): string {
  const { labels, cited } = unsupportedMetrics(text, [], state.index);
  if (labels.length === 0) return text;
  state.findings.push({ path: joinPath(state.prefix, path), reason: reasonFor(labels, cited) });
  return BLOCKED_NARRATIVE_TEXT;
}

// Afirmação com métrica sem suporte: `text` e `howToValidate` viram texto neutro e status HIPOTESE.
// Um finding por campo ofensor. Downgrade conta apenas quando o status muda de VERIFICADO para HIPOTESE.
function guardClaim(claim: Record<string, unknown>, path: string, state: GuardState): Record<string, unknown> {
  const claimIds = Array.isArray(claim.evidenceIds)
    ? claim.evidenceIds.filter((id): id is string => typeof id === 'string')
    : [];
  const checks = ['text', 'howToValidate']
    .filter((key) => typeof claim[key] === 'string')
    .map((key) => ({ key, ...unsupportedMetrics(String(claim[key]), claimIds, state.index) }))
    .filter((check) => check.labels.length > 0);
  const others = walkObject(claim, path, state, CLAIM_FIELDS);
  if (checks.length === 0) return others;
  for (const check of checks) {
    state.findings.push({
      path: joinPath(state.prefix, joinPath(path, check.key)),
      reason: reasonFor(check.labels, check.cited),
    });
  }
  if (claim.status === 'VERIFICADO') state.downgradedClaims += 1;
  return { ...others, text: BLOCKED_NARRATIVE_TEXT, status: 'HIPOTESE', howToValidate: BLOCKED_HOWTO_TEXT };
}

function walk(node: unknown, path: string, state: GuardState): unknown {
  if (typeof node === 'string') return guardText(node, path, state);
  if (Array.isArray(node)) return node.map((item, i) => walk(item, `${path}[${i}]`, state));
  if (!node || typeof node !== 'object') return node;
  if (isClaimLike(node)) return guardClaim(node, path, state);
  return walkObject(node as Record<string, unknown>, path, state, NO_KEYS);
}

/**
 * Aplica a guarda de proveniência numérica a toda string de `moduleOutput` (incluindo arrays e claims).
 * Não altera números em campos não textuais. Retorna findings com caminho absoluto (prefixo `options.pathPrefix`).
 * Checagem mecânica: ver limites no cabeçalho do módulo.
 */
export function enforceNumberProvenance<T>(
  moduleOutput: T,
  ctx: NumberGuardContext,
  options: NumberGuardOptions = {},
): NumberGuardResult<T> {
  const state: GuardState = {
    index: buildIndex(ctx.evidences),
    prefix: options.pathPrefix ?? '',
    findings: [],
    downgradedClaims: 0,
  };
  const value = walk(moduleOutput, '', state) as T;
  return { value, downgradedClaims: state.downgradedClaims, findings: state.findings };
}

// Número pt-BR sem separador de milhar: "0,035" (ponto seguido de 3 dígitos seria lido como milhar pela guarda).
function formatPtBr(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/, '').replace('.', ',');
}

/**
 * Duas linhas sempre: concorrentes coletados e concorrentes informados sem coleta. O dossiê e a evidência U1
 * usam o mesmo texto, para que nenhum módulo analise um concorrente que não foi lido.
 */
export function competitorLines(competitors: CompetitorStatus[]): string[] {
  const collected = competitors.filter((c) => c.collected).map((c) => c.url);
  const skipped = competitors.filter((c) => !c.collected).map((c) => c.url);
  return [
    `Concorrentes informados e coletados: ${collected.join('; ') || 'nenhum'}`,
    `Concorrentes informados sem coleta (não analisar): ${skipped.join('; ') || 'nenhum'}`,
  ];
}

/**
 * Entrada informada pelo cliente como evidência `U1` (kind `user_input`). Citável por claims e pela guarda.
 * Não entra em `allEvidences`: o loop de extração não processa esta evidência. Campos nulos saem do conteúdo.
 */
export function userInputEvidence(
  input: Pick<PipelineInput, 'companyName' | 'websiteUrl' | 'declaredPhase' | 'declaredIcp' | 'crmOrFinancialInputs' | 'tamBottomUpData'>,
  competitors: CompetitorStatus[],
): Evidence {
  const lines = [
    `Empresa: ${input.companyName}`,
    `Site informado: ${input.websiteUrl}`,
    `Fase declarada: ${input.declaredPhase}`,
  ];
  if (input.declaredIcp) lines.push(`ICP declarado: ${input.declaredIcp}`);
  lines.push(...competitorLines(competitors));
  const crm = input.crmOrFinancialInputs;
  if (crm?.arpuMonthly != null) lines.push(`ARPU mensal: R$ ${formatPtBr(crm.arpuMonthly)}`);
  if (crm?.cacEstimated != null) lines.push(`CAC estimado: R$ ${formatPtBr(crm.cacEstimated)}`);
  if (crm?.churnMonthlyRate != null) {
    // Fração e percentual: a guarda casa `%` com `pct` e número puro com `num`/`*`.
    lines.push(`Churn mensal: ${formatPtBr(crm.churnMonthlyRate)} (${formatPtBr(crm.churnMonthlyRate * 100)}%)`);
  }
  if (crm?.salesCycleDays != null) lines.push(`Ciclo de vendas: ${formatPtBr(crm.salesCycleDays)} dias`);
  const tam = input.tamBottomUpData;
  if (tam) {
    lines.push(
      `Contas-alvo totais: ${formatPtBr(tam.totalTargetAccounts)} contas`,
      `Contas SAM estimadas: ${formatPtBr(tam.estimatedSamAccounts)} contas`,
      `Contas SOM estimadas: ${formatPtBr(tam.estimatedSomAccounts)} contas`,
      `ARPU médio mensal (TAM): R$ ${formatPtBr(tam.arpuMedioMensal)}`,
    );
  }
  return {
    id: 'U1',
    kind: 'user_input',
    source: 'entrada informada pelo cliente',
    fetchedAt: new Date().toISOString(),
    content: lines.join('\n'),
  };
}
