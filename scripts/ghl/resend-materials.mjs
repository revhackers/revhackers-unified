#!/usr/bin/env node
// Fase 4.3 — reenvio de material para contatos migrados de oFTw cujo e-mail não foi entregue.
// Uso: node scripts/ghl/resend-materials.mjs --input runs/ghl-migration/<AAAAMMDD>/oftw-material-leads.csv [--dry-run] [--limit N]
// Env: GHL_PIT_S7HE (PIT revhackers-migracao, escopos contacts.readonly/contacts.write/locations/tags.write)
//      GHL_LOCATION_S7HE=S7HEFAz97UKuC8NLHMmI
// Mecanismo: o workflow "RH · Entrega de material" (trigger: Contact Tag Added = reenviar-material)
// envia o template "RH · Reenvio de material" e remove a tag. Para contatos com vários materiais
// não entregues, o script re-adiciona a tag após cada remoção, atualizando material_* a cada rodada.
// Saída: runs/ghl-migration/<AAAAMMDD>/reenvio-log.csv (contactId,email,slug,tentativa,status).
// Nunca grava tokens em disco.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const API = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';
const TAG_REENVIO = 'reenviar-material';
const POLL_MS = 30_000;
const POLL_MAX_MS = 5 * 60_000;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const input = opt('--input');
const limit = Number(opt('--limit') ?? Infinity);
const dryRun = flag('--dry-run');
const PIT = process.env.GHL_PIT_S7HE;
const LOCATION = process.env.GHL_LOCATION_S7HE ?? 'S7HEFAz97UKuC8NLHMmI';

if (!input) die('Informe --input <oftw-material-leads.csv>');
if (!dryRun && !PIT) die('GHL_PIT_S7HE ausente');

const outDir = dirname(input);
const logPath = join(outDir, 'reenvio-log.csv');
const migratedPath = join(outDir, 'migrated.json');

function die(msg) {
  console.error(`[resend] ${msg}`);
  process.exit(1);
}

async function ghl(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PIT}`,
      Version: VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

// CSV simples: campos sem vírgula dentro de aspas (formato gerado por export-oftw-leads.mjs)
function readCsv(path) {
  const [header, ...rows] = readFileSync(path, 'utf8').trim().split('\n');
  const cols = header.split(',');
  return rows.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, values[i] ?? '']));
  });
}

function appendLog(row) {
  if (!existsSync(logPath)) writeFileSync(logPath, 'contactId,email,slug,tentativa,status\n');
  appendFileSync(logPath, row.join(',') + '\n');
}

const migrated = existsSync(migratedPath) ? JSON.parse(readFileSync(migratedPath, 'utf8')) : {};
const pending = readCsv(input).filter((r) => r.acao === 'reenviar');

// slugs não entregues por e-mail, agrupados por e-mail
const byEmail = new Map();
for (const r of pending) {
  const slugs = r.slugs.split('|').filter(Boolean);
  byEmail.set(r.email, { nome: r.nome, slugs });
}

const queue = [...byEmail.entries()].slice(0, limit);
console.log(`[resend] ${queue.length} contato(s) com material não entregue${dryRun ? ' (dry-run)' : ''}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitTagRemoved(contactId) {
  const deadline = Date.now() + POLL_MAX_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    const { contact } = await ghl('GET', `/contacts/${contactId}`);
    if (!contact.tags?.includes(TAG_REENVIO)) return true;
  }
  return false;
}

for (const [email, { slugs }] of queue) {
  const contactId = migrated[email];
  if (!contactId) {
    appendLog(['', email, '', '', 'sem-contactId-migrado']);
    continue;
  }
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const attempt = i + 1;
    if (dryRun) {
      console.log(`[dry-run] ${email} ${slug} tentativa ${attempt}`);
      continue;
    }
    try {
      const { contact } = await ghl('GET', `/contacts/${contactId}`);
      const material = materialFor(slug); // ver nota abaixo
      await ghl('PUT', `/contacts/${contactId}`, {
        tags: [...new Set([...(contact.tags ?? []), TAG_REENVIO, `baixou:${slug}`])],
        customFields: [
          { key: 'rh_material_slug', field_value: slug },
          { key: 'rh_material_title', field_value: material.title },
        ],
      });
      const removed = await waitTagRemoved(contactId);
      appendLog([contactId, email, slug, attempt, removed ? 'enviado' : 'timeout-workflow']);
    } catch (err) {
      appendLog([contactId, email, slug, attempt, `erro:${err.message.replace(/[,\n]/g, ' ')}`]);
    }
  }
}

// Nota: materialFor(slug) lê scripts/ghl/materials-registry.json, gerado a partir de
// src/data/materialsData.ts pelo export-oftw-leads.mjs (Fase 4.1).
function materialFor(slug) {
  const registry = JSON.parse(readFileSync(new URL('./materials-registry.json', import.meta.url), 'utf8'));
  const found = registry.find((m) => m.slug === slug);
  if (!found) throw new Error(`slug sem registro: ${slug}`);
  return { title: found.title };
}
