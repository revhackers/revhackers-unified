#!/usr/bin/env node

import fs from 'fs';

const token = fs.readFileSync('/tmp/.ghl_token_agency', 'utf-8').trim();
const locationId = 'S7HEFAz97UKuC8NLHMmI';

// 16 custom fields per plan Fase 1.1
const customFields = [
  { name: 'Origem', type: 'TEXT' },
  { name: 'Funil', type: 'TEXT' },
  { name: 'Material Slug', type: 'TEXT' },
  { name: 'Material Título', type: 'TEXT' },
  { name: 'Material Link', type: 'TEXT' },
  { name: 'Cargo', type: 'TEXT' },
  { name: 'Setor', type: 'TEXT' },
  { name: 'Consentimento LGPD', type: 'CHECKBOX' },
  { name: 'Tipo Diagnóstico', type: 'TEXT' },
  { name: 'Score Diagnóstico', type: 'NUMBER' },
  { name: 'Categoria Diagnóstico', type: 'TEXT' },
  { name: 'Calculadora', type: 'TEXT' },
  { name: 'Resultado Calculadora', type: 'TEXT' },
  { name: 'UTM Source', type: 'TEXT' },
  { name: 'UTM Medium', type: 'TEXT' },
  { name: 'UTM Campaign', type: 'TEXT' },
];

async function createCustomField(field) {
  const body = {
    name: field.name,
    dataType: field.type,  // TEXT, NUMBER, CHECKBOX
    model: 'contact',      // REQUIRED: must be 'contact' for Contact fields
  };

  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (res.ok) {
      const data = await res.json();
      console.log(`✅ ${field.name} (${field.type})`);
      return { name: field.name, type: field.type };
    } else {
      const err = await res.text();
      console.log(`❌ ${field.name}: HTTP ${res.status}`);
      console.log(`   ${err.substring(0, 150)}`);
      return null;
    }
  } catch (e) {
    console.log(`❌ ${field.name}: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log(`\n📋 Criando 16 custom fields em S7HE...\n`);
  
  const created = [];
  for (const field of customFields) {
    const result = await createCustomField(field);
    if (result) created.push(result);
    await new Promise(r => setTimeout(r, 200)); // rate limit
  }

  console.log(`\n✅ Resultado: ${created.length}/${customFields.length} campos criados\n`);
}

main();
