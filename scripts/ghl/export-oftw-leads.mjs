#!/usr/bin/env node
/**
 * Fase 4.1 — exporta os contatos da location oFTw (RevHackers legada) para a migração à S7HE.
 *
 * O QUE FAZ
 *  1. Regenera scripts/ghl/materials-registry.json a partir de src/data/materialsData.ts
 *     (consumido por resend-materials.mjs). Node >= 22.18 importa o .ts diretamente (type stripping).
 *  2. Pagina GET /contacts/ da oFTw: todos os contatos, com ou sem e-mail.
 *  3. Para contatos com tag `materiais` ou `download:<slug>`: lê as conversas e as mensagens de e-mail
 *     enviadas (outbound, não falhadas) e decide se cada material foi entregue, casando o texto do e-mail
 *     com o link ou o título do material.
 *  4. Grava em <out>/:
 *       oftw-contacts.json        todos os contatos (entrada de migrate-to-s7he.mjs)
 *       oftw-material-leads.csv   leads de material (entrada de resend-materials.mjs)
 *       oftw-export-summary.json  totais e alertas
 *
 * CONFIGURAÇÃO (dono)
 *  - GHL_PIT_OFTW (obrigatório)  PIT `revhackers-export-readonly`, criado na location oFTw (plano, Fase 0.2).
 *                                Escopos: contacts.readonly, conversations.readonly,
 *                                conversations/message.readonly, locations/customFields.readonly.
 *                                Informe no terminal, sem gravar em arquivo:
 *                                  read -s GHL_PIT_OFTW && export GHL_PIT_OFTW
 *  - GHL_LOCATION_OFTW (opcional) default oFTw9DcsKRUj6xCiq4mb.
 *
 * USO (a partir da raiz do repo)
 *  node scripts/ghl/export-oftw-leads.mjs --limit 5 --debug   # prova da forma das respostas (plano V7)
 *  node scripts/ghl/export-oftw-leads.mjs                      # exportação completa
 *  Opções:
 *    --limit N   lê no máximo N contatos (para teste)
 *    --out DIR   pasta de saída (default runs/ghl-migration/<AAAAMMDD>)
 *    --debug     imprime somente NOMES das chaves das respostas (nunca valores)
 *
 * LIMITAÇÕES — validar antes de confiar no CSV
 *  - "Material entregue" exige que o e-mail antigo contenha o link ou o título do material. Mensagem sem
 *    texto no retorno da API NÃO conta como entregue (vira `reenviar`). O resumo mostra essa contagem.
 *  - E-mails enviados fora do GHL (ex.: SMTP direto do relay antigo) não aparecem em conversas: viram `reenviar`.
 *    Conferir uma amostra na aba Conversations antes do reenvio.
 *  - GHL não expõe data por tag: `primeiro_download` usa a data de criação do contato (proxy).
 *  - Ordem das tags é a ordem devolvida pela API; o último `download:` é tratado como o mais recente.
 *  - Saída contém e-mail, telefone e nome: manter somente em runs/ (fora do git).
 *  - Erro ao ler conversas de um contato não o marca como entregue: fica `revisar-manual` com a mensagem de erro.
 *
 * Nunca imprime nem grava o token. Erros de API mostram apenas status, rota e trecho da resposta.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');
const REGISTRY_PATH = join(SCRIPT_DIR, 'materials-registry.json');
const MATERIALS_TS = join(REPO_ROOT, 'src', 'data', 'materialsData.ts');

const API = 'https://services.leadconnectorhq.com';
const VERSION_CONTACTS = '2021-07-28';
const VERSION_CONVERSATIONS = '2021-04-15';
const PIT = process.env.GHL_PIT_OFTW;
const LOCATION = process.env.GHL_LOCATION_OFTW ?? 'oFTw9DcsKRUj6xCiq4mb';

const MIN_INTERVAL_MS = 120; // ~8 req/s, abaixo do limite de 100 req / 10 s
const MAX_RETRIES = 4;
const MAX_MESSAGE_PAGES = 20;
const PROGRESS_EVERY = 25;
const FAILED_STATUSES = new Set(['failed', 'undelivered', 'bounced', 'canceled', 'cancelled']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
};

function fail(msg) {
  console.error(`[export] ERRO: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { limit: Infinity, out: null, debug: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--limit') {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n <= 0) fail('--limit exige inteiro > 0');
      opts.limit = n;
    } else if (arg === '--out') {
      opts.out = argv[++i];
      if (!opts.out) fail('--out exige caminho');
    } else if (arg === '--debug') {
      opts.debug = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Uso: node scripts/ghl/export-oftw-leads.mjs [--limit N] [--out DIR] [--debug]');
      process.exit(0);
    } else {
      fail(`argumento desconhecido: ${arg}`);
    }
  }
  return opts;
}

const args = parseArgs(process.argv.slice(2));
const OUT_DIR = resolve(REPO_ROOT, args.out ?? join('runs', 'ghl-migration', today()));

// ---------- HTTP ----------

let lastCallAt = 0;
async function throttle() {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

class GhlError extends Error {
  constructor(status, route, detail) {
    super(`GET ${route} -> ${status} ${detail}`);
    this.status = status;
  }
}

async function ghl(path, { version = VERSION_CONTACTS, query = {} } = {}) {
  const url = new URL(path, API);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  for (let attempt = 0; ; attempt++) {
    await throttle();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PIT}`, Version: version, Accept: 'application/json' },
    });
    const text = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const wait = res.status === 429
        ? Number(res.headers.get('retry-after') ?? 10) * 1000
        : 2000 * 2 ** attempt;
      console.warn(`[export] HTTP ${res.status} em ${url.pathname}; nova tentativa em ${Math.round(wait / 1000)} s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new GhlError(res.status, url.pathname, text.slice(0, 300));
    return text ? JSON.parse(text) : {};
  }
}

// ---------- Registro de materiais (fonte: src/data/materialsData.ts) ----------

async function buildRegistry() {
  const mod = await import(pathToFileURL(MATERIALS_TS).href);
  const registry = mod.materialsData.map(({ slug, title, link_material, published, is_active }) => ({
    slug,
    title,
    link_material,
    published,
    is_active,
  }));
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
  return registry;
}

// ---------- Leitura da oFTw ----------

async function fetchContacts(limit, debug) {
  const contacts = [];
  let startAfterId;
  let startAfter;
  for (let page = 1; contacts.length < limit; page++) {
    const res = await ghl('/contacts/', {
      query: { locationId: LOCATION, limit: 100, startAfterId, startAfter },
    });
    if (debug && page === 1) {
      console.log(`[debug] chaves de /contacts/: ${Object.keys(res).join(', ')}`);
      console.log(`[debug] chaves de meta: ${Object.keys(res.meta ?? {}).join(', ')}`);
    }
    const batch = res.contacts ?? [];
    if (batch.length === 0) break;
    contacts.push(...batch.slice(0, limit - contacts.length));
    const total = res.meta?.total ? ` de ${res.meta.total}` : '';
    console.log(`[export] página ${page}: +${batch.length} (lidos ${contacts.length}${total})`);
    if (!res.meta?.startAfterId) break;
    startAfterId = res.meta.startAfterId;
    startAfter = res.meta.startAfter;
  }
  return contacts;
}

const isEmailMessage = (m) => /EMAIL/i.test(String(m.messageType ?? ''));

async function fetchEmailMessages(contactId, debug, state) {
  const { conversations = [] } = await ghl('/conversations/search', {
    version: VERSION_CONVERSATIONS,
    query: { locationId: LOCATION, contactId, limit: 100 },
  });
  const emails = [];
  for (const conv of conversations) {
    let lastMessageId;
    for (let page = 0; page < MAX_MESSAGE_PAGES; page++) {
      const res = await ghl(`/conversations/${conv.id}/messages`, {
        version: VERSION_CONVERSATIONS,
        query: { limit: 100, lastMessageId },
      });
      // A API devolve { messages: { messages: [...], nextPage, lastMessageId } }; aceita também a forma plana.
      const box = Array.isArray(res.messages)
        ? { messages: res.messages, nextPage: res.nextPage, lastMessageId: res.lastMessageId }
        : (res.messages ?? {});
      const list = box.messages ?? [];
      if (debug && !state.debugShown && list.length) {
        console.log(`[debug] chaves de uma mensagem: ${Object.keys(list[0]).join(', ')}`);
        state.debugShown = true;
      }
      emails.push(...list.filter(isEmailMessage));
      if (!box.nextPage || !box.lastMessageId) break;
      lastMessageId = box.lastMessageId;
    }
  }
  return emails;
}

// ---------- Decisão de entrega por material ----------

function coversMaterial(msg, mat) {
  if (msg.direction !== 'outbound') return false;
  if (FAILED_STATUSES.has(String(msg.status ?? '').toLowerCase())) return false;
  const text = [msg.subject, msg.body, msg.html].filter(Boolean).join('\n').toLowerCase();
  if (!text) return false;
  const link = (mat.link_material ?? '').toLowerCase();
  const title = (mat.title ?? '').toLowerCase();
  return (link !== '' && text.includes(link)) || (title !== '' && text.includes(title));
}

function materialDecision(contact, emails, registry) {
  const slugs = [...new Set(
    (contact.tags ?? [])
      .map((t) => String(t).trim().toLowerCase())
      .filter((t) => t.startsWith('download:'))
      .map((t) => t.slice('download:'.length).trim())
      .filter(Boolean),
  )];
  const downloads = slugs.map((slug) => {
    const mat = registry.get(slug);
    return {
      slug,
      known: Boolean(mat),
      title: mat?.title ?? null,
      link: mat?.link_material ?? null,
      delivered: mat ? emails.some((m) => coversMaterial(m, mat)) : null,
    };
  });
  const pending = downloads.filter((d) => d.known && !d.delivered).map((d) => d.slug);
  const unknown = downloads.filter((d) => !d.known).map((d) => d.slug);
  const acao = pending.length > 0
    ? 'reenviar'
    : (downloads.length === 0 || unknown.length > 0 ? 'revisar-manual' : 'ok');
  return { downloads, pending, unknown, acao };
}

function emailEntregueLabel(material) {
  const delivered = material.downloads.filter((d) => d.delivered).length;
  if (material.downloads.length === 0) return '';
  if (material.pending.length === 0 && material.unknown.length === 0) return 'sim';
  return delivered > 0 ? 'parcial' : 'nao';
}

// ---------- Saída ----------

const csvCell = (v) => String(v ?? '').replace(/[,"\r\n]/g, ' ').trim();

function buildCsv(records) {
  const header = 'email,nome,empresa,slugs,primeiro_download,email_entregue,acao,baixados';
  const rows = records
    .filter((r) => r.material && r.email)
    .map((r) => [
      r.email,
      `${r.firstName ?? ''} ${r.lastName ?? ''}`,
      r.companyName ?? '',
      r.material.pending.join('|'), // materiais a reenviar (consumido por resend-materials.mjs)
      (r.dateAdded ?? '').slice(0, 10),
      emailEntregueLabel(r.material),
      r.material.acao,
      r.material.downloads.map((d) => d.slug).join('|'),
    ].map(csvCell).join(','));
  return [header, ...rows].join('\n') + '\n';
}

// ---------- Main ----------

async function main() {
  if (!PIT) fail('GHL_PIT_OFTW ausente. Exporte o PIT revhackers-export-readonly (ver cabeçalho).');

  console.log(`[export] location oFTw: ${LOCATION}${Number.isFinite(args.limit) ? ` · limite ${args.limit}` : ''}`);
  const registryList = await buildRegistry();
  const registry = new Map(registryList.map((m) => [m.slug.toLowerCase(), m]));
  console.log(`[export] registro de materiais: ${registryList.length} itens -> scripts/ghl/materials-registry.json`);

  const contacts = await fetchContacts(args.limit, args.debug);
  console.log(`[export] ${contacts.length} contato(s) lido(s); consultando e-mails dos leads de material`);

  const debugState = { debugShown: false };
  const records = [];
  const alerts = { emailsSemTexto: 0, leadsComErro: 0, leadsMateriaisSemSlug: 0 };
  let materialLeads = 0;

  for (const [i, c] of contacts.entries()) {
    const tags = (c.tags ?? []).map((t) => String(t).trim());
    const hasMaterialTag = tags.some((t) => {
      const l = t.toLowerCase();
      return l === 'materiais' || l.startsWith('download:');
    });

    let material = null;
    if (hasMaterialTag) {
      materialLeads++;
      try {
        const emails = await fetchEmailMessages(c.id, args.debug, debugState);
        alerts.emailsSemTexto += emails.filter((m) => !(m.subject || m.body || m.html)).length;
        material = materialDecision(c, emails, registry);
        if (material.downloads.length === 0) alerts.leadsMateriaisSemSlug++;
      } catch (err) {
        alerts.leadsComErro++;
        material = { downloads: [], pending: [], unknown: [], acao: 'revisar-manual', erro: err.message };
        console.warn(`[export] contato ${c.id}: conversas não lidas (${err.message}); marcado revisar-manual`);
      }
    }

    records.push({
      id: c.id,
      email: c.email ? String(c.email).trim().toLowerCase() : null,
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      phone: c.phone ?? '',
      companyName: c.companyName ?? '',
      dateAdded: c.dateAdded ?? null,
      source: c.source ?? '',
      tags,
      customFields: (c.customFields ?? []).map((f) => ({ id: f.id, value: f.value ?? f.field_value ?? null })),
      material,
    });

    if ((i + 1) % PROGRESS_EVERY === 0) console.log(`[export] ${i + 1}/${contacts.length} processados`);
  }

  const byAcao = (acao) => records.filter((r) => r.material?.acao === acao).length;
  const summary = {
    geradoEm: new Date().toISOString(),
    location: LOCATION,
    contatosLidos: records.length,
    contatosComEmail: records.filter((r) => r.email).length,
    leadsMaterial: materialLeads,
    acao: { reenviar: byAcao('reenviar'), ok: byAcao('ok'), 'revisar-manual': byAcao('revisar-manual') },
    alertas: alerts,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'oftw-contacts.json'), JSON.stringify(records, null, 2) + '\n');
  writeFileSync(join(OUT_DIR, 'oftw-material-leads.csv'), buildCsv(records));
  writeFileSync(join(OUT_DIR, 'oftw-export-summary.json'), JSON.stringify(summary, null, 2) + '\n');

  console.log('[export] resumo:', JSON.stringify(summary, null, 2));
  if (alerts.emailsSemTexto > 0) {
    console.warn(`[export] ALERTA: ${alerts.emailsSemTexto} e-mail(s) sem assunto/corpo na API; não contam como entregues. Revisar amostra.`);
  }
  if (alerts.leadsComErro > 0) console.warn(`[export] ALERTA: ${alerts.leadsComErro} lead(s) com erro de leitura -> revisar-manual.`);
  console.log(`[export] arquivos em ${OUT_DIR}`);
}

main().catch((err) => {
  if (err instanceof GhlError && err.status === 401) {
    fail(`401 da API: PIT inválido/revogado ou sem escopos de leitura (${err.message})`);
  }
  fail(err.stack ?? err.message);
});
