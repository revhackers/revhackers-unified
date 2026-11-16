import type { Evidence } from '../prompts/evidence.js';
import { detectSiteSignals, PRIORITY_LINK_PATTERNS, type SiteSignal } from './signals.js';

export interface CollectionInput {
  companyName: string;
  websiteUrl: string;
  competitors: string[];
}

/** Concorrente informado. `collected` é true quando a página entrou nas evidências. */
export interface CompetitorStatus {
  url: string;
  collected: boolean;
}

export interface CollectionResult {
  evidences: Evidence[];
  gaps: string[];
  /** Concorrentes na ordem de entrada. */
  competitors: CompetitorStatus[];
  /** Sinais técnicos da home (vazio quando a home não entrou nas evidências). */
  signals: SiteSignal[];
}

/**
 * Outcome of a browser load. `status` and `finalUrl` come from the navigation when the browser exposes them.
 * `links` are the anchor hrefs of the rendered DOM (absolute when the browser resolves them).
 * `html` is the rendered DOM, used to detect scripts and forms the fetched shell does not show.
 */
export interface RenderResult {
  text: string;
  status: number | null;
  finalUrl: string;
  links?: string[];
  html?: string;
}

/** Injectable I/O so tests can stub network and browser without real services. */
export interface CollectionOptions {
  fetch?: typeof fetch;
  render?: (url: string) => Promise<RenderResult | null>;
}

type FetchOutcome = 'accepted' | 'rejected' | 'unreachable';
type PageKind = 'site' | 'competitor_site';

interface PageDraft {
  kind: PageKind;
  source: string;
  content: string;
  /** HTML bruto e, quando houve render, o HTML renderizado. Usado para detectar sinais. */
  html: string;
}

interface FetchResult {
  outcome: FetchOutcome;
  /** Raw anchor hrefs seen on the page (HTML and, when rendered, the browser DOM). Resolved later against the page URL. */
  links: string[];
  /** Presente quando a página entra nas evidências. Os ids são atribuídos depois, em ordem fixa. */
  draft?: PageDraft;
  /** Lacuna desta tentativa: página rejeitada, erro de rede, ou coletada sem render. */
  gap?: string;
}

const MAX_TEXT_CHARS = 12000;
const THIN_TEXT_CHARS = 1500;
/** Páginas internas aceitas por site, na ordem de prioridade. */
const MAX_INTERNAL_PAGES = 5;
/** Candidatas internas buscadas em paralelo por site. As primeiras bem-sucedidas, por prioridade, entram. */
const MAX_INTERNAL_ATTEMPTS = 8;
/** Error pages (soft 404, native browser network errors) are short; longer pages are never classified as errors. */
const ERROR_PAGE_MAX_CHARS = 2000;

/** Links to pages that are not public content: auth, checkout, file downloads. */
const EXCLUDED_PATH =
  /\/(?:login|signin|sign-in|logout|cadastro|register|signup|sign-up|auth|entrar|minha-conta|account|carrinho|cart|checkout|download|downloads|wp-admin|wp-login)(?=\/|$)/i;
const EXCLUDED_EXTENSION = /\.(?:pdf|zip|rar|png|jpe?g|gif|webp|svg|ico|mp4|mov|mp3|docx?|xlsx?|pptx?|xml|json|txt|csv)$/i;

/** Soft 404 headline anchored at the start of the text. */
const SOFT_404_HEADLINE: RegExp[] = [
  /^(?:erro\s+|error\s+)?404\b[\s.:\-–|—]*(?:not found|page not found|this page could not be found|the requested url was not found|página não encontrada|pagina nao encontrada|não encontrad[ao]|nao encontrad[ao])/i,
  /^(?:page not found|página não encontrada|pagina nao encontrada)\b/i,
];

/**
 * Soft 404 rendered after navigation chrome (menus before the error). Requires the 404 code together with the
 * "Oops! Página não encontrada" / "Oops! Page not found" headline, or the standard "a página que você está procurando" body.
 */
const SOFT_404_EMBEDDED: RegExp[] = [
  /\b404\b[\s\S]*Oops!\s*(?:Página não encontrada|Page not found)/i,
  /Oops!\s*(?:Página não encontrada|Page not found)[\s\S]*\b404\b/i,
  /A página que você está procurando foi movida, removida, renomeada ou talvez nunca tenha existido/i,
];

/**
 * Public DNS lookup tool page (e.g. dns.google) returned as content. Requires all tool-specific markers together,
 * so a business or article that merely mentions DNS is never classified.
 */
const DNS_TOOL_MARKERS: RegExp[] = [/DNS Name/, /Enter a domain \(like example\.com\)/, /Cache Flush/, /Google Public DNS/];

/** Chromium network-error page signatures (specific phrases/codes, never bare words like "404" or "DNS"). */
const NATIVE_ERROR_SIGNATURES: RegExp[] = [
  /(?:Try running|Tente executar o) Google Public DNS/i,
  /DNS address could not be found/i,
  /This site can(?:’|')t be reached/i,
  /(?:Este site não pode ser acessado|Não é possível acessar este site)/i,
  /\bERR_(?:NAME_NOT_RESOLVED|CONNECTION_REFUSED|CONNECTION_TIMED_OUT|CONNECTION_RESET|INTERNET_DISCONNECTED|SSL_PROTOCOL_ERROR|CERT_[A-Z_]+)\b/,
  /\bDNS_PROBE_(?:FINISHED|STARTED)_[A-Z_]+\b/,
];

/**
 * Classifies text that is an error page rather than site content.
 * Returns null for valid content, including long technical pages that mention 404 or DNS.
 */
export function detectErrorPage(text: string): 'soft-404' | 'browser-network-error' | 'dns-tool-page' | null {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > ERROR_PAGE_MAX_CHARS) return null;
  if (SOFT_404_HEADLINE.some((re) => re.test(trimmed)) || SOFT_404_EMBEDDED.some((re) => re.test(trimmed))) return 'soft-404';
  if (NATIVE_ERROR_SIGNATURES.some((re) => re.test(trimmed))) return 'browser-network-error';
  if (DNS_TOOL_MARKERS.every((re) => re.test(trimmed))) return 'dns-tool-page';
  return null;
}

function renderRejection(rendered: RenderResult): string | null {
  if (rendered.status !== null && rendered.status >= 400) return `HTTP ${rendered.status} no render`;
  if (rendered.finalUrl.startsWith('chrome-error:') || rendered.finalUrl.startsWith('chrome://')) {
    return 'erro nativo do navegador no render';
  }
  const kind = detectErrorPage(rendered.text);
  return kind ? `${kind} no render` : null;
}

/** Extracts raw href values from `<a href>` tags. Unresolved; resolution happens against the page URL. */
function extractHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const anchor = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match: RegExpExecArray | null;
  while ((match = anchor.exec(html)) !== null) {
    hrefs.push(match[1] ?? match[2] ?? '');
  }
  return hrefs;
}

function rankInternalLink(path: string): number {
  const index = PRIORITY_LINK_PATTERNS.findIndex((re) => re.test(path));
  return index === -1 ? PRIORITY_LINK_PATTERNS.length : index;
}

/**
 * Resolves real links from a page to same-origin content URLs, ordered by business priority.
 * Drops other origins, non-http schemes, the page itself, root, auth/checkout pages and file downloads.
 * Fragments and query strings are removed so variants of one page collapse to one candidate.
 */
function discoverInternalLinks(hrefs: string[], pageUrl: string): string[] {
  const base = new URL(pageUrl);
  const self = new URL(pageUrl);
  self.hash = '';
  self.search = '';
  const seen = new Set<string>();
  const ranked: { url: string; rank: number; order: number }[] = [];

  hrefs.forEach((raw, order) => {
    let target: URL;
    try {
      target = new URL(raw.trim(), base);
    } catch {
      return;
    }
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return;
    if (target.origin !== base.origin) return;
    target.hash = '';
    target.search = '';
    const path = target.pathname.toLowerCase();
    if (path === '/' || path === '') return;
    if (EXCLUDED_PATH.test(path) || EXCLUDED_EXTENSION.test(path)) return;
    const url = target.toString();
    if (url === self.toString() || seen.has(url)) return;
    seen.add(url);
    ranked.push({ url, rank: rankInternalLink(path), order });
  });

  return ranked.sort((a, b) => a.rank - b.rank || a.order - b.order).map((entry) => entry.url);
}

export async function collectSiteData(input: CollectionInput, options: CollectionOptions = {}): Promise<CollectionResult> {
  const fetchImpl = options.fetch ?? fetch;
  const render = options.render;

  const renderSafe = async (url: string): Promise<RenderResult | null> => {
    if (!render) return null;
    try {
      return await render(url);
    } catch {
      return null;
    }
  };

  const normalizeUrl = (rawUrl: string): string => {
    let u = rawUrl.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u;
    }
    return u;
  };

  // Uma tentativa de página. Não grava evidência: a coleta paralela devolve rascunhos e os ids são atribuídos depois.
  const fetchAndStrip = async (url: string, kind: PageKind): Promise<FetchResult> => {
    let res: Response;
    let html: string;
    try {
      res = await fetchImpl(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 RevHackersGTMBlueprint/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        return { outcome: 'rejected', links: [], gap: `Falha ao buscar ${url}: HTTP status ${res.status}` };
      }
      html = await res.text();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { outcome: 'unreachable', links: [], gap: `Erro de rede ao buscar ${url}: ${msg}` };
    }

    const links = extractHrefs(html);
    let detectionHtml = html;
    let stripped = stripHtmlToText(html).slice(0, MAX_TEXT_CHARS);
    let rejection: string | null = null;
    const fetchedErrorKind = detectErrorPage(stripped);
    if (fetchedErrorKind) rejection = `${fetchedErrorKind} na resposta HTTP`;

    // SPAs (React/Vue) deliver an empty or thin shell without JS: render it in a real browser when one is configured.
    let renderUnavailable = false;
    if (rejection || stripped.length < THIN_TEXT_CHARS) {
      const rendered = await renderSafe(url);
      if (rendered) {
        links.push(...(rendered.links ?? []));
        const renderedRejection = renderRejection(rendered);
        if (renderedRejection) {
          // The browser saw an error page: the fetched shell is not site content, even when it is non-empty.
          rejection = renderedRejection;
          stripped = '';
        } else {
          if (rendered.html) detectionHtml = `${detectionHtml}\n${rendered.html}`;
          const renderedText = rendered.text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_CHARS);
          if (rejection || renderedText.length > stripped.length) {
            stripped = renderedText;
            rejection = null;
          }
        }
      } else if (!rejection) {
        renderUnavailable = true;
      }
    }

    if (rejection) {
      return { outcome: 'rejected', links, gap: `Página rejeitada (${rejection}): ${url}` };
    }
    if (stripped.length === 0) {
      return {
        outcome: 'rejected',
        links,
        gap: `Página sem conteúdo textual${renderUnavailable ? ' e render indisponível' : ''}: ${url}`,
      };
    }
    return {
      outcome: 'accepted',
      links,
      draft: { kind, source: url, content: stripped, html: detectionHtml },
      gap: renderUnavailable ? `Página com pouco texto sem JavaScript e render indisponível: ${url}` : undefined,
    };
  };

  // 1. Home first: its links decide which internal pages exist.
  const companyUrl = normalizeUrl(input.websiteUrl);
  const home = await fetchAndStrip(companyUrl, 'site');

  // 2. Internal candidates (only links the origin actually serves, in priority order) and competitors, in parallel.
  const candidates = home.outcome === 'unreachable'
    ? []
    : discoverInternalLinks(home.links, companyUrl).slice(0, MAX_INTERNAL_ATTEMPTS);
  const competitorUrls = input.competitors.filter((raw) => raw).map(normalizeUrl);
  const [internalResults, competitorResults] = await Promise.all([
    Promise.all(candidates.map((url) => fetchAndStrip(url, 'site'))),
    Promise.all(competitorUrls.map((url) => fetchAndStrip(url, 'competitor_site'))),
  ]);

  // 3. Internal pages: the first MAX_INTERNAL_PAGES that loaded, in priority order.
  const internal: FetchResult[] = [];
  for (const result of internalResults) {
    if (internal.length >= MAX_INTERNAL_PAGES) break;
    if (result.outcome === 'accepted') internal.push(result);
  }

  // 4. Evidence ids in fixed order: home, internal pages (priority), competitors (entry order).
  const evidences: Evidence[] = [];
  const addPage = (result: FetchResult): void => {
    if (!result.draft) return;
    evidences.push({
      id: `E${evidences.length + 1}`,
      kind: result.draft.kind,
      source: result.draft.source,
      fetchedAt: new Date().toISOString(),
      content: result.draft.content,
    });
  };
  addPage(home);
  internal.forEach(addPage);
  const competitors: CompetitorStatus[] = [];
  competitorUrls.forEach((url, i) => {
    const result = competitorResults[i];
    addPage(result);
    competitors.push({ url, collected: result.outcome === 'accepted' });
  });

  // 5. Sinais técnicos da home, só quando a home entrou nas evidências.
  const signals = home.draft ? detectSiteSignals(home.draft.html, home.links) : [];
  if (home.draft) {
    evidences.push({
      id: 'S1',
      kind: 'site_signals',
      source: home.draft.source,
      fetchedAt: new Date().toISOString(),
      content: signals
        .map((s) => (s.detectado ? `Detectado na home: ${s.sinal}` : `Não detectado no HTML da home: ${s.sinal}`))
        .join('\n'),
    });
  }

  const gaps = [home, ...internalResults, ...competitorResults].flatMap((result) => (result.gap ? [result.gap] : []));
  return { evidences, gaps, competitors, signals };
}

function stripHtmlToText(html: string): string {
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}
