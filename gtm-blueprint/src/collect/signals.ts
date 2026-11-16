/** Sinal técnico ou de processo observado na home. `detectado: false` também é registrado, para o lead ver o que não existe. */
export interface SiteSignal {
  sinal: string;
  detectado: boolean;
}

/** Padrões de link por valor de negócio: preço, sobre e cases. `PRIORITY_LINK_PATTERNS` ordena a coleta de páginas internas. */
const LINK_PATTERNS = {
  precos: /pre[cç]o|pricing|planos?|plans|assinatura|investimento/i,
  sobre: /sobre|about|quem-somos|empresa|equipe|team/i,
  cases: /cases?|clientes|casos|resultados|depoimentos|customers|testimonials/i,
  produto: /produto|product|features|solu[cç][oõ]es|solutions|servi[cç]os|services/i,
};

/** Ranking de links internos por valor de negócio: preços, sobre, cases, produto. Índices menores vencem. */
export const PRIORITY_LINK_PATTERNS: RegExp[] = [LINK_PATTERNS.precos, LINK_PATTERNS.sobre, LINK_PATTERNS.cases, LINK_PATTERNS.produto];

/** Substrings (minúsculas) procuradas no HTML bruto ou renderizado da home. */
const HTML_SIGNALS: Array<{ sinal: string; needles: string[] }> = [
  { sinal: 'Google Tag Manager', needles: ['googletagmanager.com/gtm.js'] },
  { sinal: 'GA4 (Google Analytics)', needles: ['googletagmanager.com/gtag/js'] },
  { sinal: 'Pixel Meta', needles: ['connect.facebook.net'] },
  { sinal: 'LinkedIn Insight Tag', needles: ['snap.licdn.com'] },
  { sinal: 'HubSpot', needles: ['js.hs-scripts.com'] },
  { sinal: 'RD Station', needles: ['d335luupugsy2.cloudfront.net'] },
  { sinal: 'GoHighLevel', needles: ['leadconnectorhq.com'] },
  { sinal: 'Hotjar', needles: ['static.hotjar.com'] },
  { sinal: 'Microsoft Clarity', needles: ['clarity.ms'] },
  { sinal: 'Intercom', needles: ['widget.intercom.io'] },
  { sinal: 'Calendly', needles: ['calendly.com'] },
  { sinal: 'WhatsApp', needles: ['wa.me/', 'api.whatsapp.com'] },
  { sinal: 'Dados estruturados (JSON-LD)', needles: ['application/ld+json'] },
  { sinal: 'Formulário', needles: ['<form'] },
];

/** Páginas internas que a home linka, pelo caminho do link. */
const LINK_SIGNALS: Array<{ sinal: string; pattern: RegExp }> = [
  { sinal: 'Página de preços', pattern: LINK_PATTERNS.precos },
  { sinal: 'Página de cases', pattern: LINK_PATTERNS.cases },
  { sinal: 'Página sobre', pattern: LINK_PATTERNS.sobre },
];

// Número de CNPJ com ou sem pontuação, isolado por fronteira de palavra.
const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;

/** Caminho do link, sem origem, query ou fragmento, em minúsculas. */
function pathOf(href: string): string {
  return href.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0]?.toLowerCase() ?? '';
}

/** Detecta sinais técnicos no HTML (bruto ou renderizado) e páginas internas nos links da home. */
export function detectSiteSignals(html: string, links: string[]): SiteSignal[] {
  const lower = html.toLowerCase();
  const paths = links.map(pathOf);
  return [
    ...HTML_SIGNALS.map(({ sinal, needles }) => ({ sinal, detectado: needles.some((needle) => lower.includes(needle)) })),
    ...LINK_SIGNALS.map(({ sinal, pattern }) => ({ sinal, detectado: paths.some((path) => pattern.test(path)) })),
  ];
}

/** CNPJ (14 dígitos) quando os textos citam exatamente um CNPJ distinto. Zero ou vários: null. */
export function findCnpj(texts: string[]): string | null {
  const found = new Set<string>();
  for (const text of texts) {
    for (const hit of text.matchAll(CNPJ_RE)) found.add(hit[0].replace(/\D/g, ''));
  }
  if (found.size !== 1) return null;
  return [...found][0] ?? null;
}
