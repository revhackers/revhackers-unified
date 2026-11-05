/**
 * scripts/ghl/reconcile-s7he-custom-fields.mjs
 * Reconciles custom fields in S7HE location:
 * 1. Deletes incorrect/test fields specified in DELETE_IDS.
 * 2. Ensures all required RevHackers custom fields exist with correct dataTypes.
 * 3. Inventories all fields and outputs s7he-custom-fields.json and campos-funnels-revisao.md.
 */

import fs from 'fs';
import path from 'path';

const TOKEN = process.env.GHL_PIT_S7HE || (fs.existsSync('/tmp/.ghl_token_location_test') ? fs.readFileSync('/tmp/.ghl_token_location_test', 'utf8').trim() : '');
const LOCATION_ID = process.env.GHL_LOCATION_S7HE || 'S7HEFAz97UKuC8NLHMmI';

const DELETE_IDS = [
  '2hATsfZ0kT9gUBhlTLDo', // material_ttulo (duplicata)
  'E6g1tpTWNUeIdWSIGnFj', // tipo_diagnstico
  'todpeLd8N8houBGhgi7R', // categoria_diagnstico
  'wPzNgR87HamBrKkwzPpk', // score_diagnstico
  'AKA4vAYo5PID47xQKM1i', // resultado_calculadora
  'DpzhGSiWoxGguBZuIqTG', // teste_origem
  // Also clean up any old un-prefixed ones created today if not needed:
  '7jpie0UtMs9NIkhWEKJt', // material_slug (sem rh_)
  'CFaNp23AhuWwQ6T7I56T', // material_title (sem rh_)
  'rQrvrB8PkH0U0wc3WzsI', // material_link (sem rh_)
  '0OGm9lOmu3hqEn4UVfrP', // calculadora (sem rh_)
];

const REQUIRED_FIELDS = {
  // Generic / shared
  'origem': 'TEXT',
  'funil': 'TEXT',
  'cargo': 'SINGLE_OPTIONS',
  'setor': 'TEXT',
  'utm_source': 'TEXT',
  'utm_medium': 'TEXT',
  'utm_campaign': 'TEXT',
  'utm_term': 'TEXT',
  'utm_content': 'utm_content',
  'linkedin': 'TEXT',
  'crm_atual': 'TEXT',
  'tamanho_do_time': 'TEXT',
  'principal_dor': 'LARGE_TEXT',
  // Specific RevHackers (rh_ prefix)
  'rh_material_slug': 'TEXT',
  'rh_material_title': 'TEXT',
  'rh_material_link': 'TEXT',
  'rh_diagnostic_type': 'TEXT',
  'rh_diagnostic_score': 'NUMERICAL',
  'rh_diagnostic_category': 'TEXT',
  'rh_calculadora': 'TEXT',
  'rh_calculadora_resultado': 'TEXT',
  'rh_consentimento_lgpd': 'CHECKBOX',
};

async function ghlFetch(endpoint, options = {}) {
  const url = `https://services.leadconnectorhq.com${endpoint}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (res.status === 204) return null;
  
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }
  
  if (!res.ok) {
    throw new Error(`API ${options.method || 'GET'} ${endpoint} failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  const isApply = process.argv.includes('--apply');
  console.log(`🚀 Reconciliação de Custom Fields S7HE (${LOCATION_ID}) [${isApply ? 'APPLY' : 'DRY-RUN'}]`);

  if (!TOKEN) {
    console.error('❌ ERRO: GHL_PIT_S7HE não definido e /tmp/.ghl_token_location_test não encontrado.');
    process.exit(1);
  }

  // 1. Fetch current fields
  console.log('⏳ Buscando custom fields existentes...');
  const data = await ghlFetch(`/locations/${LOCATION_ID}/customFields`);
  const fields = data.customFields || data || [];
  console.log(`   Encontrados ${fields.length} campos no total.`);

  const fieldMap = new Map(); // key -> field object
  const nonRhFields = [];

  for (const f of fields) {
    const key = f.fieldKey ? f.fieldKey.replace('contact.', '') : (f.name || '').toLowerCase().replace(/\s+/g, '_');
    fieldMap.set(key, f);
    if (!key.startsWith('rh_') && !['origem', 'funil', 'cargo', 'setor', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'linkedin', 'crm_atual', 'tamanho_do_time', 'principal_dor'].includes(key)) {
      nonRhFields.push(f);
    }
  }

  // 2. Determine actions
  const toDelete = [];
  for (const f of fields) {
    if (DELETE_IDS.includes(f.id) || DELETE_IDS.includes(f.fieldKey) || DELETE_IDS.includes(f.name)) {
      toDelete.push(f);
    }
  }

  const toCreate = [];
  for (const [key, dataType] of Object.entries(REQUIRED_FIELDS)) {
    if (!fieldMap.has(key)) {
      toCreate.push({ name: key, dataType });
    } else {
      const existing = fieldMap.get(key);
      if (existing.dataType !== dataType && !(dataType === 'TEXT' && existing.dataType === 'LARGE_TEXT')) {
        console.log(`   ⚠️ Aviso: Campo ${key} existe com dataType ${existing.dataType}, esperado ${dataType}`);
      }
    }
  }

  console.log(`\n📋 Plano de Ação:`);
  console.log(`   - Campos para apagar: ${toDelete.length}`);
  toDelete.forEach(f => console.log(`     • [${f.id}] ${f.name} (${f.fieldKey})`));
  console.log(`   - Campos para criar: ${toCreate.length}`);
  toCreate.forEach(f => console.log(`     • ${f.name} (${f.dataType})`));

  if (isApply) {
    // Execute deletions
    for (const f of toDelete) {
      console.log(`🗑️ Apagando campo [${f.id}] ${f.name}...`);
      try {
        await ghlFetch(`/locations/${LOCATION_ID}/customFields/${f.id}`, { method: 'DELETE' });
      } catch (err) {
        console.log(`   ❌ Falha ao apagar ${f.id}: ${err.message}. Tentando endpoint alternativo...`);
        try {
          await ghlFetch(`/custom-fields/${f.id}`, { method: 'DELETE' });
        } catch (err2) {
          console.log(`   ❌ Falha também no endpoint alternativo: ${err2.message}`);
        }
      }
    }

    // Execute creations
    for (const f of toCreate) {
      console.log(`➕ Criando campo ${f.name} (${f.dataType})...`);
      const payload = {
        name: f.name,
        dataType: f.dataType,
        model: 'contact',
        placeholder: ''
      };
      if (f.dataType === 'CHECKBOX') {
        payload.options = ['Sim'];
      }
      try {
        await ghlFetch(`/locations/${LOCATION_ID}/customFields`, {
          method: 'POST',
          body: payload,
        });
      } catch (err) {
        console.error(`   ❌ Erro ao criar ${f.name}: ${err.message}`);
      }
    }
  }

  // 3. Re-fetch and output reports
  console.log('⏳ Atualizando inventário de campos...');
  const finalData = await ghlFetch(`/locations/${LOCATION_ID}/customFields`);
  const finalFields = finalData.customFields || finalData || [];

  const outDir = 'runs/ghl-migration/20261105';
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 's7he-custom-fields.json');
  fs.writeFileSync(jsonPath, JSON.stringify(finalFields, null, 2));

  // Campos Funnels revisão
  const funnelsRevisaoMd = `# Campos da Subconta FUNNELS (S7HE) - Revisão
Data: ${new Date().toISOString()}
Total de campos na subconta: ${finalFields.length}

## Campos RevHackers / Compartilhados (Oficiais)
${finalFields.filter(f => {
  const k = f.fieldKey ? f.fieldKey.replace('contact.', '') : f.name;
  return k.startsWith('rh_') || ['origem', 'funil', 'cargo', 'setor', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'linkedin', 'crm_atual', 'tamanho_do_time', 'principal_dor'].includes(k);
}).map(f => `- **${f.name}** (\`${f.fieldKey || f.id}\`) — Tipo: \`${f.dataType}\``).join('\n')}

## Outros Campos (Pertencentes ao FUNNELS SaaS / Não apagar)
${finalFields.filter(f => {
  const k = f.fieldKey ? f.fieldKey.replace('contact.', '') : f.name;
  return !k.startsWith('rh_') && !['origem', 'funil', 'cargo', 'setor', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'linkedin', 'crm_atual', 'tamanho_do_time', 'principal_dor'].includes(k);
}).map(f => `- **${f.name}** (\`${f.fieldKey || f.id}\`) — Tipo: \`${f.dataType}\``).join('\n')}
`;
  fs.writeFileSync(path.join(outDir, 'campos-funnels-revisao.md'), funnelsRevisaoMd);

  // Fase 1 log
  const fase1Md = `# Relatório Fase 1 · Custom Fields S7HE
Data: ${new Date().toISOString()}
- Total inicial: ${fields.length}
- Apagados: ${toDelete.length}
- Criados: ${toCreate.length}
- Total final: ${finalFields.length}
`;
  fs.writeFileSync(path.join(outDir, 'fase1.md'), fase1Md);

  console.log(`\n✨ Relatórios salvos em ${outDir}/`);
  if (!isApply) {
    console.log(`💡 Para executar as alterações, rode com: node scripts/ghl/reconcile-s7he-custom-fields.mjs --apply`);
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
