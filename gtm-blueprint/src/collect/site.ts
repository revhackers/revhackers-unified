import type { Evidence } from '../prompts/evidence.js';

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
}

/**
 * Outcome of a browser load. `status` and `finalUrl` come from the navigation when the browser exposes them.
 * `links` are the anchor hrefs of the rendered DOM (absolute when the browser resolves them).
 */
export interface RenderResult {
  text: string;
  status: number | null;
  finalUrl: string;
  links?: string[];
}

/** Injectable I/O so tests can stub network and browser without real services. */
export interface CollectionOptions {
  fetch?: typeof fetch;
  render?: (url: string) => Promise<RenderResult | null>;
}

type FetchOutcome = 'accepted' | 'rejected' | 'unreachable';

interface FetchResult {
  outcome: FetchOutcome;
  /** Raw anchor hrefs seen on the page (HTML and, when rendered, the browser DOM). Resolved later against the page URL. */
  links: string[];
}

const MAX_TEXT_CHARS = 12000;
const THIN_TEXT_CHARS = 1500;
const MAX_INTERNAL_PAGES = 3;
/** Upper bound on internal fetches per site, so a link-heavy or error-heavy site cannot stall collection. */
const MAX_INTERNAL_ATTEMPTS = 5;
/** Error pages (soft 404, native browser network errors) are short; longer pages are never classified as errors. */
const ERROR_PAGE_MAX_CHARS = 2000;

/** Links to pages that are not public content: auth, checkout, file downloads. */
const EXCLUDED_PATH =
  /\/(?:login|signin|sign-in|logout|cadastro|register|signup|sign-up|auth|entrar|minha-conta|account|carrinho|cart|checkout|download|downloads|wp-admin|wp-login)(?=\/|$)/i;
const EXCLUDED_EXTENSION = /\.(?:pdf|zip|rar|png|jpe?g|gif|webp|svg|ico|mp4|mov|mp3|docx?|xlsx?|pptx?|xml|json|txt|csv)$/i;

/** Ranking of discovered links by business value: pricing, about, cases, product. Earlier entries win. */
const PRIORITY_PATTERNS: RegExp[] = [
  /pre[cç]o|pricing|planos?|plans|assinatura|investimento/i,
  /sobre|about|quem-somos|empresa|equipe|team/i,
  /cases?|clientes|casos|resultados|depoimentos|customers|testimonials/i,
  /produto|product|features|solu[cç][oõ]es|solutions|servi[cç]os|services/i,
];

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
  const index = PRIORITY_PATTERNS.findIndex((re) => re.test(path));
  return index === -1 ? PRIORITY_PATTERNS.length : index;
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
  const evidences: Evidence[] = [];
  const gaps: string[] = [];
  let evidenceCounter = 1;
  const fetchImpl = options.fetch ?? fetch;
  const render = options.render ?? renderWithBrowser;

  const renderSafe = async (url: string): Promise<RenderResult | null> => {
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

  const fetchAndStrip = async (url: string, kind: 'site' | 'competitor_site'): Promise<FetchResult> => {
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
        gaps.push(`Falha ao buscar ${url}: HTTP status ${res.status}`);
        return { outcome: 'rejected', links: [] };
      }
      html = await res.text();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      gaps.push(`Erro de rede ao buscar ${url}: ${msg}`);
      return { outcome: 'unreachable', links: [] };
    }

    const links = extractHrefs(html);
    let stripped = stripHtmlToText(html).slice(0, MAX_TEXT_CHARS);
    let rejection: string | null = null;
    const fetchedErrorKind = detectErrorPage(stripped);
    if (fetchedErrorKind) rejection = `${fetchedErrorKind} na resposta HTTP`;

    // SPAs (React/Vue) deliver an empty or thin shell without JS: render it in a real browser.
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
          const renderedText = rendered.text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_CHARS);
          if (rejection || renderedText.length > stripped.length) {
            stripped = renderedText;
            rejection = null;
          }
        }
      } else if (!rejection && stripped.length > 0) {
        gaps.push(`Página com pouco texto sem JavaScript e render indisponível: ${url}`);
      }
    }

    if (rejection) {
      gaps.push(`Página rejeitada (${rejection}): ${url}`);
      return { outcome: 'rejected', links };
    }
    if (stripped.length === 0) {
      gaps.push(`Página sem conteúdo textual: ${url}`);
      return { outcome: 'rejected', links };
    }

    evidences.push({
      id: `E${evidenceCounter++}`,
      kind,
      source: url,
      fetchedAt: new Date().toISOString(),
      content: stripped,
    });
    return { outcome: 'accepted', links };
  };

  // 1. Company Homepage
  const companyUrl = normalizeUrl(input.websiteUrl);
  const home = await fetchAndStrip(companyUrl, 'site');

  // Internal pages come only from links the origin actually serves (HTML anchors or rendered DOM), never guessed routes.
  if (home.outcome !== 'unreachable') {
    const candidates = discoverInternalLinks(home.links, companyUrl);
    let internalCount = 0;
    let attempts = 0;
    for (const link of candidates) {
      if (internalCount >= MAX_INTERNAL_PAGES || attempts >= MAX_INTERNAL_ATTEMPTS) break;
      attempts += 1;
      if ((await fetchAndStrip(link, 'site')).outcome === 'accepted') internalCount += 1;
    }
  }

  // 2. Competitors Homepages
  const competitors: CompetitorStatus[] = [];
  for (const compUrlRaw of input.competitors) {
    if (!compUrlRaw) continue;
    const url = normalizeUrl(compUrlRaw);
    const result = await fetchAndStrip(url, 'competitor_site');
    competitors.push({ url, collected: result.outcome === 'accepted' });
  }

  return {
    evidences,
    gaps,
    competitors,
  };
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

/**
 * Local/Node renderer for JS-only sites (system Chrome via playwright).
 * In the Cloudflare Worker this is replaced by Browser Run. Returns null when unavailable.
 */
async function renderWithBrowser(url: string): Promise<RenderResult | null> {
  if (typeof process === 'undefined' || !process.versions?.node) return null;
  try {
    // Dynamic: playwright exists only in the local Node toolchain, never in the Worker bundle.
    type PwResponse = { status(): number };
    type PwPage = {
      goto(u: string, o: object): Promise<PwResponse | null>;
      waitForTimeout(ms: number): Promise<void>;
      innerText(sel: string): Promise<string>;
      evaluate(expression: string): Promise<string[]>;
      url(): string;
    };
    type PwBrowser = { newPage(): Promise<PwPage>; close(): Promise<void> };
    const pw = (await import('playwright' as string)) as unknown as { chromium: { launch(o: object): Promise<PwBrowser> } };
    const browser = await pw.chromium.launch({
      executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox'],
    });
    try {
      const page = await browser.newPage();
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);
      const text: string = await page.innerText('body');
      // Link discovery is best-effort: a failed DOM query must not discard the rendered text.
      let links: string[] = [];
      try {
        links = await page.evaluate("Array.from(document.querySelectorAll('a[href]'), (a) => a.href)");
      } catch {
        links = [];
      }
      return {
        text: text.replace(/\s+/g, ' ').trim(),
        status: response ? response.status() : null,
        finalUrl: page.url(),
        links,
      };
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
}
