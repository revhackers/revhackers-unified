import type { Evidence } from './evidence.js';
import type { CompetitorStatus } from '../collect/site.js';
import type { PipelineInput } from '../pipeline.js';

/**
 * Guarda de proveniência numérica, em três modos.
 *
 * - `fato`: afirmação sobre a empresa (Claim.text, texto corrido). Toda métrica (valor com unidade, ou número
 *   de contagem/duração em contexto de métrica) precisa ser sustentada por evidência citada no campo.
 * - `procedimento`: como validar e listas de dados a coletar (`howToValidate`, `lacunasDeDadosCriticas`,
 *   `dadosParaColetarSeAusentes`). Só moeda, percentual e multiplicador são checados; tamanho de amostra,
 *   período de análise, quantidade, prazo de execução e SLA são parâmetros do procedimento, não fatos.
 * - `recomendacao`: meta ou desenho proposto (`{ text, baseadoEm }`). Só moeda, percentual, multiplicador e
 *   prazo de payback/ciclo de vendas são checados; quantidade, prazo de execução e SLA são desenho.
 *
 * Frase com métrica sem suporte sai do campo; as demais frases permanecem. Campo sem frase restante vira texto
 * neutro (BLOCKED_NARRATIVE_TEXT; BLOCKED_HOWTO_TEXT em howToValidate; BLOCKED_RECOMMENDATION_TEXT em
 * recomendação sem frase restante).
 *
 * Suporte por campo: texto corrido usa todas as evidências próprias (citação inline não acrescenta nada);
 * Claim usa `evidenceIds` ∪ citações `[ID]` ∪ `alwaysCited`; recomendação usa `baseadoEm` ∪ citações `[ID]` ∪
 * `alwaysCited`. Id de concorrente (`competitor_site`) só sustenta dentro de `concorrentesReais[i]`.
 *
 * LIMITE: esta checagem é mecânica. Verifica que um valor normalizado (mesma unidade e magnitude) existe no
 * conteúdo da evidência citada. NÃO prova que a fonte sustenta a afirmação semanticamente (sujeito, população,
 * período ou condição podem divergir). Aprovação por esta guarda NÃO é comprovação de conteúdo.
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
  alwaysCited?: string[];
}

export interface NumberGuardOptions {
  pathPrefix?: string;
}

export interface NumberGuardResult<T> {
  value: T;
  downgradedClaims: number;
  findings: NumericFinding[];
}

export const BLOCKED_NARRATIVE_TEXT = 'A coletar: as fontes consultadas não trazem este dado.';
export const BLOCKED_HOWTO_TEXT = 'Obter o número na fonte primária (CRM, extrato financeiro ou fonte pública citada) antes de usar esta afirmação.';
export const BLOCKED_RECOMMENDATION_TEXT = 'A coletar: a meta depende de dado que as fontes consultadas não trazem.';

export type GuardMode = 'fato' | 'procedimento' | 'recomendacao';

const RESULT_DURATION_RE = /payback|retorno sobre|ROI|ciclo (?:m[ée]dio )?de vendas/i;
const FREQUENCY_RE = /^\s*(?:por|ao|à|a cada)\s|^\s*\//i;
const BENCHMARK_RE = /benchmark|m[ée]dia d[eo] (?:mercado|setor)|padr[ãa]o d[eo] (?:mercado|setor)|t[íi]pic[oa] d[eo] (?:mercado|setor)/i;
const PROCEDURE_KEYS: Record<string, true> = { lacunasDeDadosCriticas: true, dadosParaColetarSeAusentes: true };
const RECOMMENDATION_FIELDS: Record<string, true> = { text: true, baseadoEm: true };

// Tokens numéricos isolados: não colam em letras, dígitos, separadores de código (B2B, E1, gpt-5.6, v1:0).
// Hífen não cola número a letra ("gpt-5"), mas separa faixas: em "30-40%" o 40 é número isolado.
const NUM_RE = /(?<![A-Za-z0-9_.\/:])(?<![A-Za-z]-)(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{1,3}(?:,\d{3})+|\d+,\d+|\d+\.\d{1,2}|\d+)(?!\d)(?![.,]\d)/g;
const URL_RE = /https?:\/\/\S+|www\.\S+|[\w-]+\.(?:com|br|io|net|org|app|dev)\S*/gi;
const CITE_RE = /\[([A-Za-z_]+\d*(?:\s*,\s*[A-Za-z_]+\d*)*)\]/g;
// Captura o delimitador: índices pares são frases, índices ímpares são os delimitadores.
const CLAUSE_SPLIT_RE = /([;\n!?]+|\.(?!\d))/;
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

// Unidades checadas fora do modo `fato`: amostra, período, quantidade e SLA nunca são métrica a sustentar.
const PROCEDURE_UNITS: Record<string, true> = { moeda: true, pct: true, x: true };
const RECOMMENDATION_UNITS: Record<string, true> = { moeda: true, pct: true, x: true, dias: true, meses: true, anos: true, semanas: true };

// Tabelas estáticas de chaves: `Record<string, true>` com lookup `=== true` (ts-set-map). Evita herdar chaves do protótipo (ex.: `constructor`).
// Chaves de texto livre que não são afirmação sobre a empresa, ou que são rótulos/identificadores.
const IGNORED_KEYS: Record<string, true> = {
  id: true, url: true, source: true, onda: true, status: true, evidenceIds: true, ownerRole: true, responsavelRole: true,
  locationPath: true, fetchedAt: true, severidade: true, tipoProblema: true,
  decisao: true, acao: true, titulo: true, criteriosPriorizacaoContas: true, pilar: true, canal: true, estagio: true,
  transicao: true, papel: true, cargo: true, cargoArquetipo: true, nome: true, setorAparente: true, alinhamento: true,
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
  ownIds: string[];
  competitorIds: Set<string>;
  alwaysCited: string[];
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
// Em `recomendacao`, duração só conta em frase de payback/retorno/ciclo de vendas.
function unitOf(before: string, rest: string, clause: string, isSource: boolean, mode: GuardMode = 'fato'): UnitSpec | null {
  const pct = PCT_SUFFIX_RE.exec(rest);
  if (pct) return { unit: 'pct', factor: 1, prefix: '', suffix: pct[0] };
  const times = X_SUFFIX_RE.exec(rest);
  // "3x por semana" é cadência, não multiplicador: o sufixo x/vezes só vale sem marcador de frequência.
  if (times && !FREQUENCY_RE.test(rest.slice(times[0].length))) {
    return { unit: 'x', factor: 1, prefix: '', suffix: times[0] };
  }
  const scale = scaleOf(rest);
  const currency = CURRENCY_PREFIX_RE.exec(before);
  if (currency) return { unit: 'moeda', factor: scale.factor, prefix: currency[0], suffix: rest.slice(0, scale.consumed) };
  const noun = COUNT_NOUN_RE.exec(rest.slice(scale.consumed));
  if (noun) return { unit: 'num', factor: scale.factor, prefix: '', suffix: rest.slice(0, scale.consumed + noun[0].length) };
  const duration = DURATION_SUFFIX_RE.exec(rest);
  if (!duration) return null;
  if (!isSource) {
    if (mode === 'recomendacao') {
      if (!RESULT_DURATION_RE.test(clause)) return null;
    } else if (!DURATION_CONTEXT_RE.test(clause)) {
      return null;
    }
  }
  const unit = DURATION_UNITS.find(([re]) => re.test(duration[1] ?? ''))?.[1];
  return unit ? { unit, factor: 1, prefix: '', suffix: duration[0] } : null;
}

// Fonte: todo número vira métrica (sem unidade vira `num`). Afirmação: sem unidade só conta com palavra-chave de métrica.
// Número sem unidade de um único dígito em afirmação é marcador de lista ou de etapa, não métrica.
function metricsIn(text: string, isSource: boolean, mode: GuardMode = 'fato'): Metric[] {
  const metrics: Metric[] = [];
  for (const clause of text.split(CLAUSE_SPLIT_RE)) {
    const keyword = METRIC_KEYWORD_RE.test(clause);
    for (const hit of clause.matchAll(NUM_RE)) {
      const token = hit[1] ?? '';
      const start = hit.index ?? 0;
      const before = clause.slice(0, start);
      const rest = clause.slice(start + token.length);
      const scale = scaleOf(rest);
      let spec = unitOf(before, rest, clause, isSource, mode);
      if (!spec && (isSource || keyword)) {
        spec = { unit: isSource ? 'num' : '*', factor: scale.factor, prefix: '', suffix: rest.slice(0, scale.consumed) };
      }
      if (!spec) continue;
      if (!isSource && spec.unit === '*' && /^\d$/.test(token)) continue;
      if (!isSource && mode === 'procedimento' && PROCEDURE_UNITS[spec.unit] !== true) continue;
      if (!isSource && mode === 'recomendacao' && RECOMMENDATION_UNITS[spec.unit] !== true) continue;
      metrics.push({ token, spec });
    }
  }
  return metrics;
}

function buildIndex(evidences: Evidence[]): SupportIndex {
  const index: SupportIndex = new Map();
  for (const ev of evidences) {
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

// Rótulos das métricas de `text` que nenhuma evidência citada sustenta, no modo pedido.
// Frase com benchmark de mercado e métrica em moeda, percentual ou x é sempre sem suporte.
function unsupportedLabels(text: string, cited: string[], index: SupportIndex, mode: GuardMode): string[] {
  const labels: string[] = [];
  const benchmark = BENCHMARK_RE.test(text);
  for (const { token, spec } of metricsIn(text.replace(URL_RE, ' '), false, mode)) {
    const keys = valueCandidates(token, false).map((value) => factKey(spec.unit, value * spec.factor));
    const benchmarked = benchmark && (spec.unit === 'moeda' || spec.unit === 'pct' || spec.unit === 'x');
    const supported = !benchmarked && cited.some((id) => keys.some((key) => index.get(id)?.has(key)));
    if (!supported) labels.push(`${spec.prefix}${token}${spec.suffix}`.trim() + (benchmarked ? ' (benchmark)' : ''));
  }
  return labels;
}

/**
 * Remove as frases com métrica sem suporte (com o delimitador que as segue) e junta o restante.
 * `baseIds` vale para o texto inteiro: ids do campo mais `alwaysCited` (citações [ID] somam quando `useInlineCites`).
 */
function redactUnsupported(
  text: string,
  baseIds: string[],
  index: SupportIndex,
  mode: GuardMode,
  useInlineCites = true,
): { text: string; labels: string[]; cited: string[] } {
  const inline = useInlineCites
    ? [...text.replace(URL_RE, ' ').matchAll(CITE_RE)].flatMap((hit) => (hit[1] ?? '').split(',').map((id) => id.trim()))
    : [];
  const cited = [...new Set([...baseIds, ...inline])];
  const parts = text.split(CLAUSE_SPLIT_RE);
  const labels: string[] = [];
  const kept: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = parts[i] ?? '';
    const delimiter = parts[i + 1] ?? '';
    const missing = unsupportedLabels(sentence, cited, index, mode);
    if (missing.length > 0) {
      labels.push(...missing);
      continue;
    }
    kept.push(sentence, delimiter);
  }
  return { text: kept.join('').replace(/\s+/g, ' ').trim(), labels, cited };
}

function hasLetters(text: string): boolean {
  return /\p{L}/u.test(text);
}

function reasonFor(labels: string[], cited: string[], bare = false): string {
  const quoted = labels.map((label) => `"${label}"`).join(', ');
  const plural = labels.length > 1;
  if (bare) {
    return plural
      ? `Métricas ${quoted} não constam em nenhuma evidência da empresa.`
      : `Métrica ${quoted} não consta em nenhuma evidência da empresa.`;
  }
  const noun = plural ? 'Métricas' : 'Métrica';
  if (cited.length === 0) return `${noun} ${quoted} sem citação de evidência no campo.`;
  return `${noun} ${quoted} ${plural ? 'não constam' : 'não consta'} nas evidências citadas (${cited.join(', ')}).`;
}

// Id de concorrente só sustenta afirmação dentro de `concorrentesReais[i]`; fora dali, sai da lista antes da checagem.
function idsForPath(path: string, ids: string[], state: GuardState): string[] {
  if (/(^|\.)concorrentesReais\[/.test(path)) return ids;
  return ids.filter((id) => !state.competitorIds.has(id));
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
  mode: GuardMode = 'fato',
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(node).map(([key, value]): [string, unknown] => [
      key,
      IGNORED_KEYS[key] === true || skip[key] === true
        ? value
        : walk(value, joinPath(path, key), state, PROCEDURE_KEYS[key] === true ? 'procedimento' : mode),
    ]),
  );
}

function guardText(text: string, path: string, state: GuardState, mode: GuardMode): string {
  const redacted = redactUnsupported(text, state.ownIds, state.index, mode, false);
  if (redacted.labels.length === 0) return text;
  state.findings.push({ path: joinPath(state.prefix, path), reason: reasonFor(redacted.labels, redacted.cited, true) });
  return hasLetters(redacted.text) ? redacted.text : BLOCKED_NARRATIVE_TEXT;
}

// Afirmação com métrica sem suporte em `text`: frases ofensoras saem, o status vira HIPOTESE e (sem frase
// restante) `evidenceIds` esvazia. Achado só em `howToValidate` troca o campo (texto restante ou
// BLOCKED_HOWTO_TEXT) sem mexer no status: amostra e período de análise são procedimento, não fato.
// Um finding por campo ofensor. Downgrade conta apenas quando o status muda de VERIFICADO para HIPOTESE.
function guardClaim(claim: Record<string, unknown>, path: string, state: GuardState): Record<string, unknown> {
  const claimIds = Array.isArray(claim.evidenceIds)
    ? claim.evidenceIds.filter((id): id is string => typeof id === 'string')
    : [];
  const ids = idsForPath(path, [...claimIds, ...state.alwaysCited], state);
  const text = typeof claim.text === 'string' ? redactUnsupported(claim.text, ids, state.index, 'fato') : null;
  const how = typeof claim.howToValidate === 'string' ? redactUnsupported(claim.howToValidate, ids, state.index, 'procedimento') : null;
  const others = walkObject(claim, path, state, CLAIM_FIELDS);
  const textHit = text !== null && text.labels.length > 0;
  const howHit = how !== null && how.labels.length > 0;
  if (!textHit && !howHit) return others;

  const out: Record<string, unknown> = { ...others };
  if (text && textHit) {
    state.findings.push({ path: joinPath(state.prefix, joinPath(path, 'text')), reason: reasonFor(text.labels, text.cited) });
    out.text = hasLetters(text.text) ? text.text : BLOCKED_NARRATIVE_TEXT;
    out.status = 'HIPOTESE';
    if (claim.status === 'VERIFICADO') state.downgradedClaims += 1;
    if (out.text === BLOCKED_NARRATIVE_TEXT) out.evidenceIds = [];
    if (how === null) out.howToValidate = BLOCKED_HOWTO_TEXT;
  }
  if (how && howHit) {
    state.findings.push({ path: joinPath(state.prefix, joinPath(path, 'howToValidate')), reason: reasonFor(how.labels, how.cited) });
    out.howToValidate = hasLetters(how.text) ? how.text : BLOCKED_HOWTO_TEXT;
  }
  return out;
}

// Recomendação ({ text, baseadoEm }): frases com valor em moeda, percentual, multiplicador ou prazo de payback/
// ciclo de vendas sem fonte saem de `text`. Sem frase restante, o texto vira BLOCKED_RECOMMENDATION_TEXT e
// `baseadoEm` esvazia. As demais chaves do objeto ficam como estão.
function guardRecommendation(node: Record<string, unknown>, path: string, state: GuardState): Record<string, unknown> {
  if (typeof node.text !== 'string') return node;
  const refs = Array.isArray(node.baseadoEm)
    ? node.baseadoEm.filter((id): id is string => typeof id === 'string')
    : [];
  const ids = idsForPath(path, [...refs, ...state.alwaysCited], state);
  const redacted = redactUnsupported(node.text, ids, state.index, 'recomendacao');
  const others = walkObject(node, path, state, RECOMMENDATION_FIELDS);
  if (redacted.labels.length === 0) return others;
  state.findings.push({ path: joinPath(state.prefix, joinPath(path, 'text')), reason: reasonFor(redacted.labels, redacted.cited) });
  const nextText = hasLetters(redacted.text) ? redacted.text : BLOCKED_RECOMMENDATION_TEXT;
  return { ...others, text: nextText, baseadoEm: nextText === BLOCKED_RECOMMENDATION_TEXT ? [] : node.baseadoEm };
}

function walk(node: unknown, path: string, state: GuardState, mode: GuardMode = 'fato'): unknown {
  if (typeof node === 'string') return guardText(node, path, state, mode);
  if (Array.isArray(node)) return node.map((item, i) => walk(item, `${path}[${i}]`, state, mode));
  if (!node || typeof node !== 'object') return node;
  if (isClaimLike(node)) return guardClaim(node, path, state);
  // Recomendação ({ text, baseadoEm }) propõe meta ou desenho: checa valor de meta, não fato.
  if ('baseadoEm' in node) return guardRecommendation(node as Record<string, unknown>, path, state);
  return walkObject(node as Record<string, unknown>, path, state, NO_KEYS, mode);
}

/**
 * Aplica a guarda de proveniência numérica a toda string de `moduleOutput` (incluindo arrays, claims e
 * recomendações). Não altera números em campos não textuais. Retorna findings com caminho absoluto
 * (prefixo `options.pathPrefix`). Checagem mecânica: ver limites no cabeçalho do módulo.
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
    ownIds: ctx.evidences.filter((ev) => ev.kind !== 'competitor_site').map((ev) => ev.id),
    competitorIds: new Set(ctx.evidences.filter((ev) => ev.kind === 'competitor_site').map((ev) => ev.id)),
    alwaysCited: ctx.alwaysCited ?? [],
  };
  const value = walk(moduleOutput, '', state) as T;
  return { value, downgradedClaims: state.downgradedClaims, findings: state.findings };
}

// Número pt-BR sem separador de milhar: "0,035" (ponto seguido de 3 dígitos seria lido como milhar pela guarda).
export function formatPtBr(value: number): string {
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
