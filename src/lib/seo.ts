/**
 * Regras de SEO puras (sem React) compartilhadas por SEO.tsx, RouteSeo e testes.
 * Fonte unica para: quais rotas nao devem ser indexadas, formato do <title> e imagem OG.
 */

export const SITE_URL = 'https://revhackers.com.br';
export const SITE_NAME = 'RevHackers';
export const HOME_TITLE = 'RevHackers | Máquina de Receita B2B com ABM e IA';
export const MAX_TITLE_LENGTH = 60;

/** Remove tags HTML e espacos repetidos (titulos de blog vem com <span> embutido). */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Prefixos de rota que nunca devem aparecer em buscadores: painel, autenticacao,
 * paginas por token (propostas, hubs, deal rooms), resultados por lead, agradecimentos
 * e agendas internas. Mapeados a partir de src/config/routes.ts.
 * Comparacao por segmento: "/rei" cobre "/rei/wizard" e "/rei-hub" via lista explicita.
 */
export const NOINDEX_PATH_PREFIXES = [
  '/admin',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/complete-profile',
  '/auth',
  '/rei',
  '/approve',
  '/hub',
  '/dashboard',
  '/cockpit',
  '/growthmap',
  '/plan',
  '/success',
  '/p',
  '/public',
  '/cadastro-cliente',
  '/onboarding',
  '/upload-materiais',
  '/legal',
  '/obrigado',
  '/pesquisa-nps',
  '/supabase-diagnostic',
  '/agenda',
  '/diagnostico/resultado',
  '/diagnostico/v2',
  '/partners/datavoxx',
  '/claude-partner-network/obrigado',
] as const;

function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/)[0] || '/';
  const lower = withoutQuery.toLowerCase();
  return lower.length > 1 ? lower.replace(/\/+$/, '') : lower;
}

/** Retorna true quando a rota deve receber `noindex`. */
export function isNoIndexPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return NOINDEX_PATH_PREFIXES.some((prefix) => {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
    // Familias com sufixo no mesmo segmento: /rei-hub, /rei-dev, /agenda-giulliano, /obrigado-nps
    if (prefix === '/rei' || prefix === '/agenda' || prefix === '/obrigado') {
      return path.startsWith(`${prefix}-`);
    }
    return false;
  });
}

const ROBOTS_INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const ROBOTS_NOINDEX = 'noindex, nofollow';

export function getRobotsContent(pathname: string, forceNoIndex = false): string {
  return forceNoIndex || isNoIndexPath(pathname) ? ROBOTS_NOINDEX : ROBOTS_INDEX;
}

/**
 * Monta o <title>: home usa o titulo institucional; demais "Titulo | RevHackers".
 * Se passar de 60 caracteres, descarta o sufixo da marca em vez de cortar o texto no meio;
 * so trunca (em limite de palavra) quando o titulo sozinho ja excede o limite.
 */
export function buildSeoTitle(rawTitle: string): string {
  if (rawTitle === 'Home') return HOME_TITLE;
  const title = stripHtml(rawTitle);
  const withBrand = `${title} | ${SITE_NAME}`;
  if (withBrand.length <= MAX_TITLE_LENGTH) return withBrand;
  if (title.length <= MAX_TITLE_LENGTH) return title;
  const cut = title.slice(0, MAX_TITLE_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 20 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:. -]+$/, '')}…`;
}

/** Slugs de rota que possuem imagem OG dedicada em public/og/<slug>.png. */
export const OG_IMAGE_SLUGS = [
  'booking',
  'cases',
  'claude-partner-network',
  'comunidade',
  'diagnostico',
  'quem-somos',
  'servicos',
] as const;

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og/home.png`;

/**
 * Resolve a imagem OG: respeita a imagem explicita da pagina; senao usa a imagem
 * dedicada da rota (public/og) ou a da home.
 */
export function resolveOgImage(canonicalUrl: string, explicit?: string): string {
  if (explicit) return explicit;
  let path = '';
  try {
    path = new URL(canonicalUrl).pathname;
  } catch {
    path = canonicalUrl;
  }
  const slug = normalizePath(path).replace(/^\//, '');
  return (OG_IMAGE_SLUGS as readonly string[]).includes(slug)
    ? `${SITE_URL}/og/${slug}.png`
    : DEFAULT_OG_IMAGE;
}
