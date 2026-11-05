import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const publicOgDir = path.resolve(rootDir, 'public/og');
const distOgDir = path.resolve(distDir, 'og');

const routes = [
  { route: '', file: 'home.png' },
  { route: 'booking', file: 'booking.png' },
  { route: 'diagnostico', file: 'diagnostico.png' },
  { route: 'servicos', file: 'servicos.png' },
  { route: 'cases', file: 'cases.png' },
  { route: 'comunidade', file: 'comunidade.png' },
  { route: 'quem-somos', file: 'quem-somos.png' },
];

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
  };
  return types[ext] || 'application/octet-stream';
}

async function captureHeroScreenshots() {
  if (!fs.existsSync(publicOgDir)) fs.mkdirSync(publicOgDir, { recursive: true });
  if (!fs.existsSync(distOgDir)) fs.mkdirSync(distOgDir, { recursive: true });

  const server = createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    let filePath = path.join(distDir, reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(distDir, 'index.html');
    }

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  const PORT = 4188;
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`🌐 Local preview server running at http://localhost:${PORT}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });

  for (const item of routes) {
    const page = await context.newPage();
    const targetUrl = `http://localhost:${PORT}/${item.route}`;
    console.log(`📸 Capturing top hero preview for /${item.route}...`);

    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);

      const publicPath = path.join(publicOgDir, item.file);
      const distPath = path.join(distOgDir, item.file);

      await page.screenshot({ path: publicPath, type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
      fs.copyFileSync(publicPath, distPath);

      console.log(`✅ Saved OG hero screenshot: /og/${item.file}`);
    } catch (err) {
      console.warn(`⚠️ Failed to capture /${item.route}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();
  console.log('🎉 All Open Graph Hero screenshots captured successfully!');
}

captureHeroScreenshots().catch((err) => {
  console.error('Error generating screenshots:', err);
  process.exit(1);
});
