import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

const pages = [
  {
    route: 'booking',
    title: 'Agendar Sessão Estratégica de RevOps | RevHackers',
    description: 'Agende uma auditoria de receita gratuita. Mapeamos os vazamentos da sua operação B2B e apresentamos um plano de crescimento acelerado.',
    defaultImage: '/uploads/oftw/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/booking'
  },
  {
    route: 'diagnostico',
    title: 'Diagnóstico de Maturidade RevOps & Growth | RevHackers',
    description: 'Avalie a maturidade das suas operações de Marketing, Vendas e Customer Success. Receba um score detalhado da sua máquina de receita.',
    defaultImage: '/uploads/oftw/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/diagnostico'
  },
  {
    route: 'servicos',
    title: 'Serviços de Revenue Operations & Inteligência de Dados | RevHackers',
    description: 'Consultoria completa em RevOps: Arquitetura de CRM, Agentes de IA, Founder-Led Growth, Mídia Paga B2B e Automação de Processos.',
    defaultImage: '/uploads/oftw/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/servicos'
  },
  {
    route: 'cases',
    title: 'Cases de Sucesso em Revenue Operations B2B | RevHackers',
    description: 'Conheça como empresas B2B escalaram receita e eliminaram gargalos operacionais com a consultoria RevHackers.',
    defaultImage: '/uploads/oftw/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/cases'
  },
  {
    route: 'comunidade',
    title: 'Comunidade RevHackers | Revenue Operations & Growth',
    description: 'Junte-se à comunidade de executivos, founders e líderes de RevOps do Brasil. Conteúdos exclusivos, ferramentas e networking.',
    defaultImage: '/uploads/oftw/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/comunidade'
  },
  {
    route: 'quem-somos',
    title: 'Quem Somos | RevHackers Consultoria RevOps',
    description: 'A primeira consultoria de Revenue Operations do Brasil. Conheça nossa história, equipe e metodologia de arquitetura de receita.',
    defaultImage: '/uploads/oftw/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/quem-somos'
  },
  {
    route: 'blog',
    title: 'Blog de Revenue Operations & Growth B2B | RevHackers',
    description: 'Artigos sobre Growth, Revenue Operations, ABM, Automação e Tecnologia B2B. Estratégias avançadas para escalar sua operação de receita no Brasil.',
    defaultImage: 'https://revhackers.com.br/og/home.png',
    canonical: 'https://revhackers.com.br/blog'
  }
];

const SITE = 'https://revhackers.com.br';

const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderHtml(baseHtml, { title, description, canonical, image }) {
  const t = esc(title);
  const d = esc(description);
  const c = esc(canonical);
  const i = esc(image);
  const set = (html, pattern, replacement) => html.replace(pattern, () => replacement);
  let html = baseHtml;
  html = set(html, /<title>.*?<\/title>/gi, `<title>${t}</title>`);
  html = set(html, /<meta name="description"\s+content="[^"]*"/gi, `<meta name="description" content="${d}"`);
  html = set(html, /<link rel="canonical"\s+href="[^"]*"/gi, `<link rel="canonical" href="${c}"`);
  html = set(html, /<meta property="og:title"\s+content="[^"]*"/gi, `<meta property="og:title" content="${t}"`);
  html = set(html, /<meta property="og:description"\s+content="[^"]*"/gi, `<meta property="og:description" content="${d}"`);
  html = set(html, /<meta property="og:url"\s+content="[^"]*"/gi, `<meta property="og:url" content="${c}"`);
  html = set(html, /<meta property="og:image"\s+content="[^"]*"/gi, `<meta property="og:image" content="${i}"`);
  html = set(html, /<meta name="twitter:title"\s+content="[^"]*"/gi, `<meta name="twitter:title" content="${t}"`);
  html = set(html, /<meta name="twitter:description"\s+content="[^"]*"/gi, `<meta name="twitter:description" content="${d}"`);
  html = set(html, /<meta name="twitter:image"\s+content="[^"]*"/gi, `<meta name="twitter:image" content="${i}"`);
  return html;
}

function generatePageHtml() {
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('dist/index.html not found!');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexPath, 'utf-8');

  for (const page of pages) {
    // Use page-specific hero screenshot if generated, else fallback image
    const ogScreenshotFile = path.join(distDir, 'og', `${page.route}.png`);
    const pageImage = fs.existsSync(ogScreenshotFile)
      ? `${SITE}/og/${page.route}.png`
      : page.defaultImage;

    const customHtml = renderHtml(baseHtml, { ...page, image: pageImage });

    // Write directory structure: dist/<route>/index.html
    const routeDir = path.join(distDir, page.route);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    fs.writeFileSync(path.join(routeDir, 'index.html'), customHtml, 'utf-8');

    // Also write dist/<route>.html for direct file matching
    fs.writeFileSync(path.join(distDir, `${page.route}.html`), customHtml, 'utf-8');

    console.log(`✅ Generated pre-rendered OG HTML for /${page.route} (Image: ${pageImage})`);
  }

  // Um HTML por post do blog, a partir do índice gerado no build (blog-index.json).
  const blogIndexPath = path.join(distDir, 'blog-index.json');
  if (!fs.existsSync(blogIndexPath)) {
    console.error('dist/blog-index.json not found!');
    process.exit(1);
  }
  const posts = JSON.parse(fs.readFileSync(blogIndexPath, 'utf-8'));
  const blogDir = path.join(distDir, 'blog');
  fs.mkdirSync(blogDir, { recursive: true });
  for (const post of posts) {
    const html = renderHtml(baseHtml, {
      title: `${post.title} | RevHackers`,
      description: post.description.slice(0, 160),
      canonical: `${SITE}/blog/${post.slug}`,
      image: post.cover ? SITE + post.cover : `${SITE}/og/home.png`,
    });
    fs.writeFileSync(path.join(blogDir, `${post.slug}.html`), html, 'utf-8');
  }
  console.log(`✅ Generated pre-rendered OG HTML for ${posts.length} blog posts`);

  // Sitemap: um <url> por post.
  const sitemapPath = path.join(distDir, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const entries = posts
      .map((post) => `  <url><loc>${SITE}/blog/${post.slug}</loc><lastmod>${post.updated ?? post.date}</lastmod></url>`)
      .join('\n');
    const sitemap = fs.readFileSync(sitemapPath, 'utf-8');
    fs.writeFileSync(sitemapPath, sitemap.replace('</urlset>', () => `${entries}\n</urlset>`), 'utf-8');
  }

  fs.rmSync(blogIndexPath);
}

generatePageHtml();
