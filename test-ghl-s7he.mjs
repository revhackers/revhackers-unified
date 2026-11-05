#!/usr/bin/env node

const GHL_PIT_S7HE = process.env.GHL_PIT_S7HE;
const GHL_LOCATION_S7HE = 'S7HEFAz97UKuC8NLHMmI';

if (!GHL_PIT_S7HE) {
  console.error('❌ GHL_PIT_S7HE não setado. Use:');
  console.error('export GHL_PIT_S7HE="seu-token-aqui"');
  process.exit(1);
}

async function test() {
  console.log(`\n🧪 Testando acesso S7HE (FUNNELS)...\n`);
  
  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/locations/${GHL_LOCATION_S7HE}?Version=2021-07-28`,
      {
        headers: { Authorization: `Bearer ${GHL_PIT_S7HE}` },
      }
    );
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    
    const data = await res.json();
    console.log(`✅ S7HE OK`);
    console.log(`   Nome: ${data.name || 'N/A'}`);
    console.log(`   ID: ${data.id}`);
    console.log(`   Email: ${data.email || 'N/A'}\n`);
    
  } catch (err) {
    console.error(`❌ Erro: ${err.message}\n`);
    process.exit(1);
  }
}

test();
