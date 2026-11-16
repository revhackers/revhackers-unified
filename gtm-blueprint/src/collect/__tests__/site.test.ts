// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { collectSiteData, detectErrorPage, type RenderResult } from '../site.js';

type Page = { status?: number; body: string };

/**
 * Local fetch stub: maps exact URLs to canned responses; unknown URLs reject like a DNS failure.
 * Every requested URL is appended to `calls` so tests can assert which pages were fetched.
 */
function stubFetch(pages: Record<string, Page>, calls: string[] = []): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    const page = pages[url];
    if (!page) throw new TypeError(`fetch failed: ${url}`);
    return new Response(page.body, { status: page.status ?? 200, headers: { 'content-type': 'text/html' } });
  }) as unknown as typeof fetch;
}

/** Soft-404 shape: HTTP 200 with site navigation rendered before the error headline. */
const SOFT_404_BASELINE =
  'Home Auditoria Metodologia Ecossistema Casos Materiais Blog Login Falar com especialista 404 Oops! Página não encontrada ' +
  'A página que você está procurando foi movida, removida, renomeada ou talvez nunca tenha existido. ' +
  'Voltar para a página inicial. Entre em contato conosco caso precise de ajuda. '.repeat(5);

/** Baseline DNS tool page captured as content (190 chars). */
const DNS_TOOL_BASELINE =
  'Google Public DNS Public DNS DNS Name Enter a domain (like example.com) or IP address (like 8.8.8.8 or 2001:4860:4860::8844) here. Resolve Help Cache Flush Get Started with Google Public DNS';

const longTechnicalText = 'Guia técnico: como tratar erros 404 em APIs REST e diagnosticar falhas de DNS com dig e nslookup. '.repeat(40);
const shell = '<html><head><title>App</title></head><body><div id="root"></div></body></html>';

const noRender = async (): Promise<RenderResult | null> => null;

const html = (body: string): Page => ({ body: `<html><body>${body}</body></html>` });
const link = (href: string): string => `<a href="${href}">link</a>`;

describe('detectErrorPage', () => {
  it('flags the baseline nav-prefixed soft-404 text', () => {
    expect(detectErrorPage(SOFT_404_BASELINE)).toBe('soft-404');
  });

  it('flags anchored soft-404 headlines', () => {
    expect(detectErrorPage('404 Not Found')).toBe('soft-404');
    expect(detectErrorPage('Página não encontrada. Volte para a home.')).toBe('soft-404');
  });

  it('flags the baseline Google Public DNS tool page', () => {
    expect(detectErrorPage(DNS_TOOL_BASELINE)).toBe('dns-tool-page');
  });

  it('does not flag a DNS tool page missing its tool-specific markers', () => {
    expect(detectErrorPage('Google Public DNS is a resolver service for developers.')).toBeNull();
  });

  it('flags native browser DNS error text when short', () => {
    expect(detectErrorPage('This site can’t be reached. Try running Google Public DNS.')).toBe('browser-network-error');
  });

  it('preserves long technical content that mentions 404 or DNS', () => {
    expect(detectErrorPage(longTechnicalText)).toBeNull();
  });

  it('returns null for empty text (handled as gap by collector)', () => {
    expect(detectErrorPage('   ')).toBeNull();
  });
});

describe('collectSiteData', () => {
  it('rejects HTTP 200 nav-prefixed soft-404 homepage and keeps later valid source with unique id', async () => {
    const fetch = stubFetch({
      'https://acme.test': { body: `<html><body>${SOFT_404_BASELINE}${link('/pricing')}</body></html>` },
      'https://acme.test/pricing': html('Plano Starter por R$ 199 mensais para equipes pequenas de vendas.'),
    });
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'acme.test', competitors: [] }, { fetch, render: noRender });

    expect(result.evidences).toHaveLength(1);
    expect(result.evidences[0].id).toBe('E1');
    expect(result.evidences[0].source).toBe('https://acme.test/pricing');
    expect(result.evidences.some((e) => e.content.includes('Página não encontrada'))).toBe(false);
    expect(result.gaps.some((g) => g.includes('https://acme.test') && g.includes('rejeitada'))).toBe(true);
  });

  it('rejects HTTP 200 DNS tool page captured as content', async () => {
    const fetch = stubFetch({
      'https://acme.test': { body: `<html><body>${DNS_TOOL_BASELINE}${link('/precos')}</body></html>` },
      'https://acme.test/precos': html('Plano Pro com onboarding dedicado e suporte comercial.'),
    });
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: [] }, { fetch, render: noRender });

    expect(result.evidences.map((e) => e.source)).toEqual(['https://acme.test/precos']);
    expect(result.evidences[0].id).toBe('E1');
    expect(result.gaps.some((g) => g.includes('dns-tool-page'))).toBe(true);
  });

  it('rejects HTTP 200 pages whose browser render returns Google Public DNS error text', async () => {
    const fetch = stubFetch({ 'https://acme.test': { body: shell } });
    const render = async (): Promise<RenderResult> => ({
      text: 'This site can’t be reached. Try running Google Public DNS.',
      status: null,
      finalUrl: 'chrome-error://chromewebdata/',
    });
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: [] }, { fetch, render });

    expect(result.evidences).toHaveLength(0);
    expect(result.gaps.some((g) => g.includes('rejeitada'))).toBe(true);
  });

  it('rejects render with HTTP error status even when text looks like content', async () => {
    const fetch = stubFetch({ 'https://acme.test': { body: shell } });
    const render = async (): Promise<RenderResult> => ({
      text: 'Bem-vindo ao Acme, a plataforma de vendas B2B para equipes comerciais em crescimento acelerado no Brasil.',
      status: 404,
      finalUrl: 'https://acme.test/missing',
    });
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: [] }, { fetch, render });

    expect(result.evidences).toHaveLength(0);
    expect(result.gaps.some((g) => g.includes('HTTP 404'))).toBe(true);
  });

  it('accepts SPA content rendered with HTTP 200 after an empty shell', async () => {
    const fetch = stubFetch({ 'https://acme.test': { body: shell } });
    const rendered = 'Acme automatiza prospecção B2B com dados de decisores e cadências multicanal para times de vendas. '.repeat(3);
    const render = async (): Promise<RenderResult> => ({ text: rendered, status: 200, finalUrl: 'https://acme.test/' });
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: [] }, { fetch, render });

    expect(result.evidences).toHaveLength(1);
    expect(result.evidences[0].content).toContain('prospecção B2B');
  });

  it('records gap and no evidence for empty page without render', async () => {
    const fetch = stubFetch({ 'https://acme.test': { body: '<html><body>   </body></html>' } });
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: [] }, { fetch, render: noRender });

    expect(result.evidences).toHaveLength(0);
    expect(result.gaps.some((g) => g.includes('sem conteúdo textual'))).toBe(true);
  });

  it('preserves a legitimately small site without imposing a minimum length', async () => {
    const fetch = stubFetch({ 'https://tiny.test': html('Ateliê Lua: cerâmica artesanal sob encomenda.') });
    const result = await collectSiteData({ companyName: 'Ateliê Lua', websiteUrl: 'https://tiny.test', competitors: [] }, { fetch, render: noRender });

    expect(result.evidences).toHaveLength(1);
    expect(result.evidences[0].content).toContain('cerâmica artesanal');
  });

  it('preserves long technical pages mentioning 404 and DNS', async () => {
    const fetch = stubFetch({ 'https://dev.test': html(longTechnicalText) });
    const result = await collectSiteData({ companyName: 'Dev', websiteUrl: 'https://dev.test', competitors: [] }, { fetch, render: noRender });

    expect(result.evidences).toHaveLength(1);
    expect(result.gaps.filter((g) => g.includes('rejeitada'))).toHaveLength(0);
  });

  it('keeps collecting competitors after a rejected source and assigns unique ids', async () => {
    const fetch = stubFetch({
      'https://acme.test': { body: '<html><body>Página não encontrada</body></html>' },
      'https://rival.test': html('Rival oferece automação de prospecção para times de vendas enterprise.'),
      'https://other.test': html('Other vende CRM com inteligência de funil para operações comerciais.'),
    });
    const result = await collectSiteData(
      { companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: ['https://rival.test', 'https://other.test'] },
      { fetch, render: noRender },
    );

    expect(result.evidences.map((e) => e.id)).toEqual(['E1', 'E2']);
    expect(result.evidences.map((e) => e.source)).toEqual(['https://rival.test', 'https://other.test']);
  });

  it('skips a linked soft-404 page and accepts the next real linked page', async () => {
    const calls: string[] = [];
    const fetch = stubFetch(
      {
        'https://acme.test': html(`Acme vende prospecção B2B para times comerciais. ${link('/precos')} ${link('/cases')}`),
        'https://acme.test/precos': { body: `<html><body>${SOFT_404_BASELINE}</body></html>` },
        'https://acme.test/cases': html('Case: a Beta triplicou reuniões qualificadas em seis meses com cadências multicanal.'),
      },
      calls,
    );
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: [] }, { fetch, render: noRender });

    expect(result.evidences.map((e) => e.id)).toEqual(['E1', 'E2']);
    expect(result.evidences.map((e) => e.source)).toEqual(['https://acme.test', 'https://acme.test/cases']);
    expect(result.gaps.some((g) => g.includes('/precos') && g.includes('rejeitada'))).toBe(true);
    expect(calls).toEqual(['https://acme.test', 'https://acme.test/precos', 'https://acme.test/cases']);
  });

  it('fetches only same-origin content links, ordered by priority, without fragments or duplicates', async () => {
    const calls: string[] = [];
    const hrefs = [
      '#topo',
      '/login',
      '/files/deck.pdf',
      'https://other.test/precos',
      'mailto:x@acme.test',
      '/sobre#equipe',
      '/cases',
      '/cases?utm=1',
      '/',
      'https://acme.test',
    ];
    const fetch = stubFetch(
      {
        'https://acme.test': html(`Acme automatiza prospecção B2B. ${hrefs.map(link).join(' ')}`),
        'https://acme.test/sobre': html('Sobre a Acme: fundada por operadores de vendas com experiência em SaaS B2B.'),
        'https://acme.test/cases': html('Case: a Beta reduziu o ciclo de vendas em quarenta por cento em um trimestre.'),
      },
      calls,
    );
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: [] }, { fetch, render: noRender });

    expect(calls).toEqual(['https://acme.test', 'https://acme.test/sobre', 'https://acme.test/cases']);
    expect(result.evidences.map((e) => e.source)).toEqual(['https://acme.test', 'https://acme.test/sobre', 'https://acme.test/cases']);
  });

  it('uses links from the rendered DOM when the fetched shell has none', async () => {
    const calls: string[] = [];
    const fetch = stubFetch({ 'https://acme.test': { body: shell }, 'https://acme.test/planos': html('Planos com cadências ilimitadas e suporte comercial dedicado para equipes.') }, calls);
    const rendered = 'Acme automatiza prospecção B2B com dados de decisores e cadências multicanal para times de vendas. '.repeat(3);
    const render = async (url: string): Promise<RenderResult | null> =>
      url === 'https://acme.test'
        ? { text: rendered, status: 200, finalUrl: 'https://acme.test/', links: ['https://acme.test/planos'] }
        : null;
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: [] }, { fetch, render });

    expect(result.evidences.map((e) => e.source)).toEqual(['https://acme.test', 'https://acme.test/planos']);
    expect(calls).toEqual(['https://acme.test', 'https://acme.test/planos']);
  });

  it('never guesses routes when the homepage exposes no links', async () => {
    const calls: string[] = [];
    const fetch = stubFetch(
      {
        'https://acme.test': html('Acme automatiza prospecção B2B para times de vendas com cadências multicanal e dados de decisores.'),
        'https://acme.test/pricing': html('Plano Starter por R$ 199 mensais.'),
      },
      calls,
    );
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: [] }, { fetch, render: noRender });

    expect(calls).toEqual(['https://acme.test']);
    expect(result.evidences).toHaveLength(1);
  });

  it('caps internal fetch attempts at five even when every linked page is an error', async () => {
    const calls: string[] = [];
    const links = Array.from({ length: 8 }, (_, i) => link(`/pagina-${i + 1}`));
    const pages: Record<string, Page> = {
      'https://acme.test': html(`Acme automatiza prospecção B2B para times de vendas. ${links.join(' ')}`),
    };
    for (let i = 1; i <= 8; i++) pages[`https://acme.test/pagina-${i}`] = { body: `<html><body>${SOFT_404_BASELINE}</body></html>` };
    const fetch = stubFetch(pages, calls);
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: [] }, { fetch, render: noRender });

    expect(calls).toHaveLength(1 + 5);
    expect(result.evidences).toHaveLength(1);
  });

  it('caps accepted internal pages at three', async () => {
    const calls: string[] = [];
    const links = Array.from({ length: 5 }, (_, i) => link(`/pagina-${i + 1}`));
    const pages: Record<string, Page> = {
      'https://acme.test': html(`Acme automatiza prospecção B2B para times de vendas. ${links.join(' ')}`),
    };
    for (let i = 1; i <= 5; i++) pages[`https://acme.test/pagina-${i}`] = html(`Página ${i} da Acme com conteúdo comercial distinto e suficiente.`);
    const fetch = stubFetch(pages, calls);
    const result = await collectSiteData({ companyName: 'Acme', websiteUrl: 'https://acme.test', competitors: [] }, { fetch, render: noRender });

    expect(result.evidences).toHaveLength(4);
    expect(calls).toHaveLength(1 + 3);
  });
});
