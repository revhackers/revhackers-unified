import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HOME_TITLE,
  MAX_TITLE_LENGTH,
  buildSeoTitle,
  getRobotsContent,
  isNoIndexPath,
  resolveOgImage,
} from '../src/lib/seo';

const readPublic = (name: string) =>
  readFileSync(resolve(process.cwd(), 'public', name), 'utf-8');

const sitemapPaths = [...readPublic('sitemap.xml').matchAll(/<loc>https:\/\/revhackers\.com\.br([^<]*)<\/loc>/g)].map(
  (match) => match[1] || '/',
);

/** Regras Disallow do grupo "User-agent: *" (prefixo; "*" final e ignorado). */
const robotsDisallow = (() => {
  const lines = readPublic('robots.txt').split(/\r?\n/);
  const rules: string[] = [];
  let inStarGroup = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^user-agent:/i.test(line)) inStarGroup = /^user-agent:\s*\*$/i.test(line);
    else if (inStarGroup && /^disallow:/i.test(line)) {
      const value = line.replace(/^disallow:\s*/i, '').replace(/\*$/, '');
      if (value) rules.push(value);
    }
  }
  return rules;
})();

describe('isNoIndexPath', () => {
  it.each([
    '/admin',
    '/admin/projects/123',
    '/login',
    '/rei/wizard',
    '/rei-hub',
    '/plan/abc',
    '/hub/42',
    '/p/proposta-x',
    '/public/growthmap/token',
    '/diagnostico/resultado/uuid',
    '/diagnostico/v2',
    '/diagnostico/linkedin/r/qualquer-slug',
    '/agenda',
    '/agenda-giulliano',
    '/obrigado',
    '/obrigado-nps',
    '/claude-partner-network/obrigado',
    '/ADMIN/',
  ])('marca %s como noindex', (path) => {
    expect(isNoIndexPath(path)).toBe(true);
  });

  it.each([
    '/',
    '/servicos',
    '/servicos/ecossistema-crm',
    '/diagnostico',
    '/diagnostico-growth',
    '/diagnostico/linkedin',
    '/score',
    '/score-site',
    '/blog/qualquer-post',
    '/cases/qualquer-case',
    '/materiais/qualquer',
    '/privacidade',
    '/planejamento-de-vendas',
    '/booking',
  ])('mantem %s indexavel', (path) => {
    expect(isNoIndexPath(path)).toBe(false);
  });

  it('ignora querystring e hash ao decidir', () => {
    expect(isNoIndexPath('/booking?company=Acme')).toBe(false);
    expect(isNoIndexPath('/admin?x=1#a')).toBe(true);
  });

  it('getRobotsContent respeita o override explicito', () => {
    expect(getRobotsContent('/servicos')).toContain('index, follow');
    expect(getRobotsContent('/servicos', true)).toBe('noindex, nofollow');
    expect(getRobotsContent('/admin')).toBe('noindex, nofollow');
  });
});

describe('invariantes sitemap x robots x noindex', () => {
  it('o sitemap lista ao menos as paginas centrais', () => {
    expect(sitemapPaths).toEqual(expect.arrayContaining(['/', '/servicos', '/diagnostico', '/booking']));
  });

  it('nenhuma URL do sitemap e noindex', () => {
    expect(sitemapPaths.filter((path) => isNoIndexPath(path))).toEqual([]);
  });

  it('nenhuma URL do sitemap e bloqueada pelo robots.txt', () => {
    const blocked = sitemapPaths.filter((path) => robotsDisallow.some((rule) => path.startsWith(rule)));
    expect(blocked).toEqual([]);
  });

  it('robots.txt declara o sitemap e nao deixa o grupo "*" vazio', () => {
    expect(readPublic('robots.txt')).toMatch(/^Sitemap:\s*https:\/\/revhackers\.com\.br\/sitemap\.xml$/m);
    expect(robotsDisallow.length).toBeGreaterThan(10);
  });

  it('o sitemap lista as novas rotas de diagnostico', () => {
    expect(sitemapPaths).toEqual(expect.arrayContaining(['/diagnostico-growth', '/diagnostico/linkedin']));
  });

  it('o share do diagnostico LinkedIn e noindex e bloqueado pelo robots.txt', () => {
    expect(isNoIndexPath('/diagnostico/linkedin/r/qualquer-slug')).toBe(true);
    expect(getRobotsContent('/diagnostico/linkedin/r/qualquer-slug')).toBe('noindex, nofollow');
    expect(robotsDisallow).toContain('/diagnostico/linkedin/r/');
  });

  it('robots.txt nao tem Disallow duplicado', () => {
    const duplicados = robotsDisallow.filter((rule, index) => robotsDisallow.indexOf(rule) !== index);
    expect(duplicados).toEqual([]);
  });
});

describe('buildSeoTitle', () => {
  it('usa o titulo institucional na home', () => {
    expect(buildSeoTitle('Home')).toBe(HOME_TITLE);
  });

  it('acrescenta a marca quando cabe em 60 caracteres', () => {
    expect(buildSeoTitle('Metodologia RevOps')).toBe('Metodologia RevOps | RevHackers');
  });

  it('descarta a marca em vez de cortar o texto quando excede 60 caracteres', () => {
    const title = 'Auditoria de Site B2B - Diagnóstico de Performance Gratuito';
    expect(title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(buildSeoTitle(title)).toBe(title);
  });

  it('trunca em limite de palavra quando o titulo sozinho excede o limite', () => {
    const title = 'Como estruturar uma operação de receita previsível para empresas B2B em crescimento acelerado';
    const result = buildSeoTitle(title);
    expect(result.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(result.endsWith('…')).toBe(true);
    expect(title.startsWith(result.slice(0, -1))).toBe(true);
    expect(title.charAt(result.length - 1)).toBe(' ');
  });
});

describe('resolveOgImage', () => {
  it('respeita imagem explicita', () => {
    expect(resolveOgImage('https://revhackers.com.br/blog/x', 'https://cdn.exemplo/img.png')).toBe(
      'https://cdn.exemplo/img.png',
    );
  });

  it('usa a imagem dedicada da rota quando existe em public/og', () => {
    expect(resolveOgImage('https://revhackers.com.br/servicos')).toBe('https://revhackers.com.br/og/servicos.png');
    expect(resolveOgImage('https://revhackers.com.br/quem-somos/')).toBe('https://revhackers.com.br/og/quem-somos.png');
  });

  it('cai para a imagem da home nas demais rotas', () => {
    expect(resolveOgImage('https://revhackers.com.br/blog/post')).toBe('https://revhackers.com.br/og/home.png');
  });
});
