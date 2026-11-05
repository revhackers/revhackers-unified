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
    defaultImage: 'https://storage.googleapis.com/msgsndr/oFTw9DcsKRUj6xCiq4mb/media/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/booking'
  },
  {
    route: 'diagnostico',
    title: 'Diagnóstico de Maturidade RevOps & Growth | RevHackers',
    description: 'Avalie a maturidade das suas operações de Marketing, Vendas e Customer Success. Receba um score detalhado da sua máquina de receita.',
    defaultImage: 'https://storage.googleapis.com/msgsndr/oFTw9DcsKRUj6xCiq4mb/media/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/diagnostico'
  },
  {
    route: 'servicos',
    title: 'Serviços de Revenue Operations & Inteligência de Dados | RevHackers',
    description: 'Consultoria completa em RevOps: Arquitetura de CRM, Agentes de IA, Founder-Led Growth, Mídia Paga B2B e Automação de Processos.',
    defaultImage: 'https://storage.googleapis.com/msgsndr/oFTw9DcsKRUj6xCiq4mb/media/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/servicos'
  },
  {
    route: 'cases',
    title: 'Cases de Sucesso em Revenue Operations B2B | RevHackers',
    description: 'Conheça como empresas B2B escalaram receita e eliminaram gargalos operacionais com a consultoria RevHackers.',
    defaultImage: 'https://storage.googleapis.com/msgsndr/oFTw9DcsKRUj6xCiq4mb/media/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/cases'
  },
  {
    route: 'comunidade',
    title: 'Comunidade RevHackers | Revenue Operations & Growth',
    description: 'Junte-se à comunidade de executivos, founders e líderes de RevOps do Brasil. Conteúdos exclusivos, ferramentas e networking.',
    defaultImage: 'https://storage.googleapis.com/msgsndr/oFTw9DcsKRUj6xCiq4mb/media/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/comunidade'
  },
  {
    route: 'quem-somos',
    title: 'Quem Somos | RevHackers Consultoria RevOps',
    description: 'A primeira consultoria de Revenue Operations do Brasil. Conheça nossa história, equipe e metodologia de arquitetura de receita.',
    defaultImage: 'https://storage.googleapis.com/msgsndr/oFTw9DcsKRUj6xCiq4mb/media/67f7fc91b95d208445a1317a.jpeg',
    canonical: 'https://revhackers.com.br/quem-somos'
  }
];

function generatePageHtml() {
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('dist/index.html not found!');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexPath, 'utf-8');

  for (const page of pages) {
    let customHtml = baseHtml;

    // Use page-specific hero screenshot if generated, else fallback image
    const ogScreenshotFile = path.join(distDir, 'og', `${page.route}.png`);
    const pageImage = fs.existsSync(ogScreenshotFile)
      ? `https://revhackers.com.br/og/${page.route}.png`
      : page.defaultImage;

    // Replace Title
    customHtml = customHtml.replace(/<title>.*?<\/title>/gi, `<title>${page.title}</title>`);

    // Replace Meta Description
    customHtml = customHtml.replace(/<meta name="description"\s+content="[^"]*"/gi, `<meta name="description" content="${page.description}"`);

    // Replace Canonical
    customHtml = customHtml.replace(/<link rel="canonical"\s+href="[^"]*"/gi, `<link rel="canonical" href="${page.canonical}"`);

    // Replace Open Graph Tags
    customHtml = customHtml.replace(/<meta property="og:title"\s+content="[^"]*"/gi, `<meta property="og:title" content="${page.title}"`);
    customHtml = customHtml.replace(/<meta property="og:description"\s+content="[^"]*"/gi, `<meta property="og:description" content="${page.description}"`);
    customHtml = customHtml.replace(/<meta property="og:url"\s+content="[^"]*"/gi, `<meta property="og:url" content="${page.canonical}"`);
    customHtml = customHtml.replace(/<meta property="og:image"\s+content="[^"]*"/gi, `<meta property="og:image" content="${pageImage}"`);

    // Replace Twitter Tags
    customHtml = customHtml.replace(/<meta name="twitter:title"\s+content="[^"]*"/gi, `<meta name="twitter:title" content="${page.title}"`);
    customHtml = customHtml.replace(/<meta name="twitter:description"\s+content="[^"]*"/gi, `<meta name="twitter:description" content="${page.description}"`);
    customHtml = customHtml.replace(/<meta name="twitter:image"\s+content="[^"]*"/gi, `<meta name="twitter:image" content="${pageImage}"`);

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
}

generatePageHtml();
