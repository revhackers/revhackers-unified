#!/usr/bin/env node

import fs from 'fs';

const token = fs.readFileSync('/tmp/.ghl_token_agency', 'utf-8').trim();

const locations = {
  'S7HE (FUNNELS)': 'S7HEFAz97UKuC8NLHMmI',
  'oFTw (RevHackers)': 'oFTw9DcsKRUj6xCiq4mb',
};

async function getCustomFields(locationName, locationId) {
  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
        }
      }
    );

    if (!res.ok) {
      console.log(`\n❌ ${locationName}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    return data.customFields || [];
  } catch (e) {
    console.log(`\n❌ ${locationName}: ${e.message}`);
    return [];
  }
}

async function main() {
  console.log('\n🔍 AUDITORIA DE CAMPOS CUSTOMIZADOS\n');
  console.log('=' .repeat(80));

  const audit = {};

  // Collect all fields from both locations
  for (const [name, id] of Object.entries(locations)) {
    console.log(`\n📍 ${name} (${id.substring(0, 10)}...)`);
    const fields = await getCustomFields(name, id);
    
    if (fields.length === 0) {
      console.log('   ⚠️  Nenhum campo customizado');
    } else {
      console.log(`   ✅ ${fields.length} campos encontrados:\n`);
      fields.forEach((f, i) => {
        console.log(`   ${i + 1}. "${f.name}" (key: ${f.key})`);
        console.log(`      └─ Tipo: ${f.fieldType || 'unknown'}, Data: ${f.dataType || 'unknown'}`);
      });
    }

    audit[name] = fields;
  }

  // Generate audit report
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RELATÓRIO DE COMPARAÇÃO\n');

  const s7heKeys = new Set(audit['S7HE (FUNNELS)'].map(f => f.key));
  const oftKeys = new Set(audit['oFTw (RevHackers)'].map(f => f.key));

  const onlyInS7HE = Array.from(s7heKeys).filter(k => !oftKeys.has(k));
  const onlyInOFTW = Array.from(oftKeys).filter(k => !s7heKeys.has(k));
  const inBoth = Array.from(s7heKeys).filter(k => oftKeys.has(k));

  console.log(`📌 Apenas em S7HE: ${onlyInS7HE.length}`);
  if (onlyInS7HE.length > 0) {
    onlyInS7HE.forEach(k => console.log(`   - ${k}`));
  }

  console.log(`\n📌 Apenas em oFTw: ${onlyInOFTW.length}`);
  if (onlyInOFTW.length > 0) {
    onlyInOFTW.forEach(k => console.log(`   - ${k}`));
  }

  console.log(`\n✅ Em ambas: ${inBoth.length}`);
  if (inBoth.length > 0) {
    inBoth.forEach(k => console.log(`   - ${k}`));
  }

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      s7he_total: audit['S7HE (FUNNELS)'].length,
      oftw_total: audit['oFTw (RevHackers)'].length,
      only_in_s7he: onlyInS7HE,
      only_in_oftw: onlyInOFTW,
      in_both: inBoth,
    },
    details: audit,
  };

  const reportPath = `/Users/giullianoalves/orca/workspaces/revhackers/revhackers-unified/worktrees/canonical-main/rh-ghl-native-forms/runs/ghl-migration/AUDIT_CUSTOM_FIELDS.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Relatório detalhado salvo em: AUDIT_CUSTOM_FIELDS.json`);
}

main();
