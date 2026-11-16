import puppeteer, { type Browser } from '@cloudflare/puppeteer';
import type { RenderResult } from '../src/collect/site.js';

const NAVIGATION_TIMEOUT_MS = 30000;
/** Tempo para o JavaScript da página assentar depois de `domcontentloaded`. */
const SETTLE_MS = 4000;

/**
 * Renderiza a página no Browser Run. Qualquer erro devolve null: a página entra como lacuna de render, sem derrubar
 * a coleta.
 */
export function createRender(env: Pick<Env, 'BROWSER'>): (url: string) => Promise<RenderResult | null> {
  return async (url) => {
    let browser: Browser | undefined;
    try {
      browser = await puppeteer.launch(env.BROWSER);
      const page = await browser.newPage();
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
      await scheduler.wait(SETTLE_MS);
      const text = String(await page.evaluate("document.body ? document.body.innerText : ''"));
      const links = (await page.evaluate("Array.from(document.querySelectorAll('a[href]'), (a) => a.href)")) as string[];
      const html = String(await page.evaluate('document.documentElement.outerHTML'));
      return {
        text: text.replace(/\s+/g, ' ').trim(),
        status: response?.status() ?? null,
        finalUrl: page.url(),
        links,
        html,
      };
    } catch {
      return null;
    } finally {
      await browser?.close().catch(() => undefined);
    }
  };
}
