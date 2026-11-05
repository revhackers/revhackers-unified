/**
 * Inventory read-only script for oFTw location
 * Fetches workflows, calendars, funnels, and location details.
 */

import fs from 'fs';

const TOKEN = process.env.GHL_PIT_OFTW || '';
const LOCATION_ID = 'oFTw9DcsKRUj6xCiq4mb';

async function fetchGhl(endpoint) {
  const res = await fetch(`https://services.leadconnectorhq.com${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Version': '2021-07-28',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error ${res.status}: ${errText}`);
  }
  return res.json();
}

async function runInventory() {
  console.log('🔍 Iniciando inventário read-only de oFTw...');

  if (!TOKEN) {
    console.error('❌ ERRO: Variável de ambiente GHL_PIT_OFTW não definida.');
    console.error('   Defina com: export GHL_PIT_OFTW="pit-..."');
    process.exit(1);
  }

  try {
    // 0. Location details
    console.log('⏳ Buscando detalhes da location...');
    let locDetails = {};
    try {
      locDetails = await fetchGhl(`/locations/${LOCATION_ID}`);
    } catch (e) {
      console.log('   ⚠️ Aviso: Não foi possível buscar detalhes da location:', e.message);
    }

    // 1. Workflows
    console.log('⏳ Buscando workflows...');
    const wfRes = await fetchGhl(`/workflows/?locationId=${LOCATION_ID}`);
    const workflows = wfRes.workflows || wfRes || [];
    console.log(`   Encontrados ${workflows.length} workflows.`);

    // 2. Calendars
    console.log('⏳ Buscando calendários...');
    const calRes = await fetchGhl(`/calendars/?locationId=${LOCATION_ID}`);
    const calendars = calRes.calendars || calRes || [];
    console.log(`   Encontrados ${calendars.length} calendários.`);

    // 3. Funnels
    console.log('⏳ Buscando funis...');
    const funRes = await fetchGhl(`/funnels/lookup/list?locationId=${LOCATION_ID}`);
    const funnels = funRes.funnels || funRes || [];
    console.log(`   Encontrados ${funnels.length} funis.`);

    // Gerar relatório markdown
    const loc = locDetails.location || locDetails || {};
    const report = `# Inventário Read-Only · Location oFTw (${LOCATION_ID})
Data: ${new Date().toISOString()}

## Location
- **Nome**: ${loc.name || 'N/A'}
- **Domínio**: ${loc.domain || loc.email || 'N/A'}
- **Timezone**: ${loc.timezone || 'N/A'}

## Workflows (${workflows.length})
| Nome | Status | ID | Última Atualização | Decisão |
|---|---|---|---|---|
${workflows.map(w => {
  const isPublished = (w.status || '').toLowerCase() === 'published';
  const isRecent = w.updatedAt && new Date(w.updatedAt) >= new Date('2026-08-07');
  const decisao = (isPublished && isRecent) ? 'manter até recriar' : 'congelar';
  return `| ${w.name || 'Sem nome'} | ${w.status || 'N/A'} | ${w.id} | ${w.updatedAt || 'N/A'} | ${decisao} |`;
}).join('\n')}

## Calendários (${calendars.length})
| Nome | ID | Ativo |
|---|---|---|
${calendars.map(c => `| ${c.name || 'Sem nome'} | ${c.id} | ${c.isActive ?? true} |`).join('\n')}

## Funis / Sites (${funnels.length})
| Nome | Domínio / Path | ID |
|---|---|---|
${funnels.map(f => `| ${f.name || 'Sem nome'} | ${f.domain || f.path || 'N/A'} | ${f.id} |`).join('\n')}
`;

    const outDir = 'runs/ghl-migration/20261105';
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = `${outDir}/oftw-inventario.md`;
    fs.writeFileSync(outPath, report);
    console.log(`\n✨ Inventário salvo com sucesso em ${outPath}`);

  } catch (err) {
    console.error('❌ Falha ao executar inventário:', err.message);
  }
}

runInventory();
