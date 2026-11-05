/**
 * Export leads and material downloads from oFTw location
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

async function exportLeads() {
  console.log('📦 Iniciando exportação de contatos de oFTw...');

  if (!TOKEN) {
    console.error('❌ ERRO: GHL_PIT_OFTW não definido.');
    process.exit(1);
  }

  try {
    let contacts = [];
    let startAfter = undefined;
    let startAfterId = undefined;
    let page = 1;

    do {
      let url = `/contacts/?locationId=${LOCATION_ID}&limit=100`;
      if (startAfter) url += `&startAfter=${startAfter}`;
      if (startAfterId) url += `&startAfterId=${startAfterId}`;

      console.log(`⏳ Buscando página ${page}...`);
      const data = await fetchGhl(url);
      const batch = data.contacts || [];
      if (batch.length === 0) break;

      contacts.push(...batch);
      const last = batch[batch.length - 1];
      startAfter = last.dateAdded;
      startAfterId = last.id;
      page++;

      if (process.argv.includes('--limit') && page > 3) {
        console.log('⚠️ Limite de teste atingido (--limit). Parando paginação.');
        break;
      }
    } while (true);

    console.log(`✅ Total de contatos exportados: ${contacts.length}`);

    const outDir = 'runs/ghl-migration';
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(`${outDir}/oftw-contacts.json`, JSON.stringify(contacts, null, 2));
    console.log(`📁 Salvo em ${outDir}/oftw-contacts.json`);

  } catch (err) {
    console.error('❌ Erro na exportação:', err.message);
  }
}

exportLeads();
