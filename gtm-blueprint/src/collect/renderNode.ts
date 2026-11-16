import type { RenderResult } from './site.js';

/**
 * Local/Node renderer for JS-only sites (system Chrome via playwright).
 * In the Cloudflare Worker this is replaced by Browser Run. Returns null when unavailable.
 * Passado a `collectSiteData` como `options.render`; sem ele, páginas sem texto no HTML bruto ficam como lacuna.
 */
export async function renderWithBrowser(url: string): Promise<RenderResult | null> {
  if (typeof process === 'undefined' || !process.versions?.node) return null;
  try {
    // Dynamic: playwright exists only in the local Node toolchain, never in the Worker bundle.
    type PwResponse = { status(): number };
    type PwPage = {
      goto(u: string, o: object): Promise<PwResponse | null>;
      waitForTimeout(ms: number): Promise<void>;
      innerText(sel: string): Promise<string>;
      content(): Promise<string>;
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
      // Link discovery and DOM serialization are best-effort: a failed query must not discard the rendered text.
      let links: string[] = [];
      try {
        links = await page.evaluate("Array.from(document.querySelectorAll('a[href]'), (a) => a.href)");
      } catch {
        links = [];
      }
      let html: string | undefined;
      try {
        html = await page.content();
      } catch {
        html = undefined;
      }
      return {
        text: text.replace(/\s+/g, ' ').trim(),
        status: response ? response.status() : null,
        finalUrl: page.url(),
        links,
        html,
      };
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
}
