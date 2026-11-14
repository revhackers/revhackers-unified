#!/usr/bin/env node
// Fase 4.2 — migra todos os contatos de oFTw para a subconta S7HE (upsert idempotente).
// Uso: node scripts/ghl/migrate-to-s7he.mjs --input runs/ghl-migration/<AAAAMMDD>/oftw-contacts.json [--dry-run] [--limit N]
// Env: GHL_PIT_S7HE (PIT revhackers-migracao: contacts.readonly, contacts.write, locations/customFields.readonly, locations/tags.write)
//      GHL_LOCATION_S7HE (opcional, default S7HEFAz97UKuC8NLHMmI)
// Entrada: oftw-contacts.json gerado por export-oftw-leads.mjs (Fase 4.1).
// Saída (mesmo diretório): migrated.json {email → contactIdS7HE}, skipped.csv, errors.csv.
// Idempotente: e-mails já presentes em migrated.json são pulados. Nunca grava o PIT em disco.
// Contato já existente em S7HE (lead FUNNELS): tags são unidas às existentes e os campos
// origem/funil NÃO são sobrescritos; source não é alterado.

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const API = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';
const LOCATION = process.env.GHL_LOCATION_S7HE ?? 'S7HEFAz97UKuC8NLHMmI';
const PIT = process.env.GHL_PIT_S7HE;
const SOURCE = 'migracao-oftw';
const MIN_INTERVAL_MS = 250;

// Chaves de campo exigidas em S7HE (plano, "Decisões fixadas"; criadas na Fase 1.1)
const REQUIRED_KEYS = [
  'origem', 'funil', 'rh_material_slug', 'rh_material_title', 'cargo', 'setor',
  'rh_consentimento_lgpd', 'rh_diagnostic_type', 'rh_diagnostic_score', 'rh_diagnostic_category',
  'rh_calculadora', 'rh_calculadora_resultado', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_term', 'utm_content', 'linkedin', 'crm_atual', 'tamanho_do_time', 'principal_dor',
];

// IDs de campos da location oFTw → chave S7HE (REVHACKERS_FIELD_MAP em src/lib/ghlRelay.ts:8-27).
// Campos legados sem chave decidida (desafios_da_empresa, ferramentas_atuais, fonte_do_lead,
// materiallink) não migram: materiallink é substituído por material_link.
const OFTW_FIELD_TO_KEY = {
  '1qsr7n8OT9GcDfs1aq6J': 'utm_source',
  '4j9NUCQoBZyhe0WdufzH': 'utm_medium',
  '0FU30gR9HD7UxPZcOns9': 'utm_campaign',
  'LCLQDAx8N7XwB1eSk1kb': 'utm_term',
  'W7HVgpIpwlm6uYFvHKwA': 'utm_content',
  'OSTYIR0k40rFmwZ0EP0h': 'cargo',
  'JhYjktc505SiN12iB8kG': 'setor',
  'fwqjWlKHp0P1f6biwu8e': 'principal_dor',
  'XdMA3ZfqWiNVPGr7s2mC': 'crm_atual',
  'sXUgGYTSmoPonpNl4z4h': 'tamanho_do_time',
  'qCUpCmj7ciDfQnonMFqY': 'rh_diagnostic_score',
  'h3jGZ0m5IajLV9nynKcI': 'rh_diagnostic_category',
  'wuQsE7Xw0NndleUuLM67': 'rh_diagnostic_type',
  'YjGoZEjX20GpLJzlOCWV': 'linkedin',
};

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = args.includes('--dry-run');
const limit = opt('--limit') !== undefined ? Number(opt('--limit')) : Infinity;
const input = opt('--input');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function die(msg) {
  console.error(`[migrate] ERRO: ${msg}`);
  process.exit(1);
}

if (!input) die('Informe --input <oftw-contacts.json>');
if (!existsSync(input)) die(`Arquivo não encontrado: ${input}`);
if (!dryRun && !PIT) die('GHL_PIT_S7HE ausente. Exporte o PIT revhackers-migracao (ver Fase 0.1).');

class ApiError extends Error {
  constructor(status, message) {
    super(`${status} ${message}`);
    this.status = status;
  }
}

let lastCallAt = 0;
async function ghl(method, path, { query, body } = {}) {
  for (let attempt = 1; ; attempt++) {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();

    const url = new URL(path, API);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${PIT}`,
        Version: VERSION,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt <= 3) {
      await sleep(2000 * attempt);
      continue;
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      throw new ApiError(res.status, String(data?.message ?? text.slice(0, 200)));
    }
    return data;
  }
}

async function loadCustomFieldIds() {
  const data = await ghl('GET', `/locations/${LOCATION}/customFields`);
  const idByKey = new Map(
    (data?.customFields ?? [])
      .filter((f) => String(f.fieldKey ?? '').startsWith('contact.'))
      .map((f) => [String(f.fieldKey).slice('contact.'.length), f.id]),
  );
  const missing = REQUIRED_KEYS.filter((k) => !idByKey.has(k));
  if (missing.length) {
    die(`Campos ausentes em S7HE: ${missing.join(', ')}. Criar em Fase 1.1 antes de migrar.`);
  }
  return idByKey;
}

// Valores de campo por chave S7HE, a partir do contato oFTw e do último download.
function buildFields(rec) {
  const values = {};
  for (const cf of rec.customFields ?? []) {
    const key = OFTW_FIELD_TO_KEY[cf.id];
    if (!key || cf.value === null || cf.value === undefined || cf.value === '') continue;
    values[key] = Array.isArray(cf.value) ? cf.value.join(', ') : String(cf.value);
  }
  values.origem = 'revhackers';
  const last = (rec.material?.downloads ?? []).at(-1);
  if (last) {
    values.funil = 'materiais';
    values.rh_material_slug = last.slug;
    if (last.title) values.rh_material_title = last.title;
  }
  return values;
}

function buildTags(rec) {
  const tags = new Set((rec.tags ?? []).map((t) => String(t).trim()).filter(Boolean));
  tags.add('origem:revhackers');
  tags.add('migrado:oftw');
  const downloads = rec.material?.downloads ?? [];
  if (downloads.length) {
    tags.add('funil:materiais');
    tags.add('material-download');
  }
  for (const d of downloads) tags.add(`baixou:${d.slug}`);
  if (rec.material?.acao === 'reenviar') tags.add('reenviar-material');
  return [...tags];
}

async function findExisting(email) {
  const data = await ghl('GET', '/contacts/search/duplicate', { query: { locationId: LOCATION, email } });
  return data?.contact ?? null;
}

async function upsertContact(rec, idByKey, existing) {
  const values = buildFields(rec);
  if (existing) {
    // Lead FUNNELS já existente: preserva origem/funil dele.
    delete values.origem;
    delete values.funil;
  }
  const tags = buildTags(rec);
  if (existing) {
    const merged = new Set([...(existing.tags ?? []), ...tags]);
    tags.splice(0, tags.length, ...merged);
  }
  const body = {
    locationId: LOCATION,
    email: rec.email,
    firstName: rec.firstName || undefined,
    lastName: rec.lastName || undefined,
    phone: rec.phone || undefined,
    companyName: rec.companyName || undefined,
    tags,
    customFields: Object.entries(values).map(([k, v]) => ({ id: idByKey.get(k), value: v })),
  };
  if (!existing) body.source = SOURCE;
  const data = await ghl('POST', '/contacts/upsert', { body });
  const id = data?.contact?.id;
  if (!id) throw new ApiError(0, 'upsert sem contact.id na resposta');
  return id;
}

function buildDryPayload(rec) {
  return {
    email: rec.email,
    source: SOURCE,
    tags: buildTags(rec),
    customFields: buildFields(rec),
    nota: `📥 Migrado de oFTw em ${today}. Downloads: ${slugsOf(rec)}`,
  };
}

function slugsOf(rec) {
  return (rec.material?.downloads ?? []).map((d) => d.slug).join(', ') || '—';
}

function csvCell(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

function appendCsv(path, header, cells) {
  if (!existsSync(path)) writeFileSync(path, header + '\n');
  appendFileSync(path, cells.map(csvCell).join(',') + '\n');
}

const today = new Date().toISOString().slice(0, 10);
const records = JSON.parse(readFileSync(input, 'utf8'));
const outDir = dirname(input);
const migratedPath = join(outDir, 'migrated.json');
const skippedPath = join(outDir, 'skipped.csv');
const errorsPath = join(outDir, 'errors.csv');
const migrated = existsSync(migratedPath) ? JSON.parse(readFileSync(migratedPath, 'utf8')) : {};

const idByKey = dryRun ? null : await loadCustomFieldIds();

const stats = { total: records.length, semEmail: 0, jaMigrado: 0, processados: 0, migrados: 0, erros: 0, comMaterial: 0 };
console.log(`[migrate] ${records.length} contato(s) lidos · location ${LOCATION}${dryRun ? ' · DRY-RUN (sem chamadas à API)' : ''}`);

for (const rec of records) {
  const nome = `${rec.firstName ?? ''} ${rec.lastName ?? ''}`.trim();
  if (!rec.email) {
    stats.semEmail++;
    if (!dryRun) appendCsv(skippedPath, 'id,nome,motivo', [rec.id, nome, 'sem-email']);
    continue;
  }
  if (migrated[rec.email]) {
    stats.jaMigrado++;
    continue;
  }
  if (stats.processados >= limit) break;
  stats.processados++;
  if ((rec.material?.downloads ?? []).length) stats.comMaterial++;

  if (dryRun) {
    console.log(JSON.stringify(buildDryPayload(rec), null, 2));
    continue;
  }

  let id;
  try {
    const existing = await findExisting(rec.email);
    id = await upsertContact(rec, idByKey, existing);
    migrated[rec.email] = id;
    writeFileSync(migratedPath, JSON.stringify(migrated, null, 2) + '\n');
    stats.migrados++;
  } catch (err) {
    stats.erros++;
    appendCsv(errorsPath, 'id,email,status,erro', [rec.id, rec.email, err.status ?? '', err.message]);
    continue;
  }

  // Nota append-only; falha aqui não desfaz a migração (migrated.json já foi gravado).
  try {
    await ghl('POST', `/contacts/${id}/notes`, {
      body: { body: `📥 Migrado de oFTw em ${today}. Downloads: ${slugsOf(rec)}` },
    });
  } catch (err) {
    appendCsv(errorsPath, 'id,email,status,erro', [rec.id, rec.email, err.status ?? '', `nota: ${err.message}`]);
  }
}

console.log('[migrate] resumo:', JSON.stringify(stats, null, 2));
if (!dryRun) console.log(`[migrate] migrated.json: ${Object.keys(migrated).length} entrada(s) · ${migratedPath}`);
