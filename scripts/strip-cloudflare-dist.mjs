/**
 * strip-cloudflare-dist.mjs
 *
 * Remove do `dist/` os artefatos que só fazem sentido na Hostinger (PHP).
 * O Cloudflare Workers Static Assets serve arquivos estáticos — sem o strip,
 * `public/api/*.php` e `public/.htaccess` seriam publicados como fonte legível.
 *
 * Uso: `node scripts/strip-cloudflare-dist.mjs [dist]`
 * Falha (exit 1) se o diretório não existir. Idempotente.
 */
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.resolve(rootDir, process.argv[2] ?? 'dist');

// Artefatos Hostinger-only. `_headers` é propositalmente mantido (Cloudflare o honra).
const STRIP_TARGETS = ['api', '.htaccess'];

if (!existsSync(distDir)) {
  console.error(`[strip-cloudflare-dist] diretório inexistente: ${distDir}`);
  process.exitCode = 1;
} else {
  for (const rel of STRIP_TARGETS) {
    const target = path.join(distDir, rel);
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
      console.log(`[strip-cloudflare-dist] removido: ${rel}`);
    }
  }
}
