/**
 * Migrate contacts from oFTw export to S7HE location with upsert
 */

import fs from 'fs';

const TOKEN = process.env.GHL_PIT_S7HE || '';
const LOCATION_ID = 'S7HEFAz97UKuC8NLHMmI';

async function migrate() {
  console.log('🔄 Iniciando migração de contatos para S7HE...');

  if (!TOKEN) {
    console.error('❌ ERRO: GHL_PIT_S7HE não definido.');
    process.exit(1);
  }

  const contactsPath = 'runs/ghl-migration/oftw-contacts.json';
  if (!fs.existsSync(contactsPath)) {
    console.error(`❌ ERRO: Arquivo ${contactsPath} não encontrado. Execute o exportador primeiro.`);
    process.exit(1);
  }

  const contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf-8'));
  console.log(`📋 Total de contatos para processar: ${contacts.length}`);

  let success = 0;
  let errors = 0;

  for (const c of contacts) {
    if (!c.email) {
      errors++;
      continue;
    }

    const payload = {
      locationId: LOCATION_ID,
      email: c.email,
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      phone: c.phone || '',
      companyName: c.companyName || '',
      source: 'migracao-oftw',
      tags: [...(c.tags || []), 'origem:revhackers', 'migrado:oftw'],
    };

    if (process.argv.includes('--dry-run')) {
      console.log('[DRY-RUN] Upsert payload:', JSON.stringify(payload));
      success++;
      continue;
    }

    try {
      const res = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        success++;
      } else {
        errors++;
      }
    } catch (e) {
      errors++;
    }
  }

  console.log(`\n✨ Migração concluída:\n  Sucessos: ${success}\n  Erros/Sem e-mail: ${errors}`);
}

migrate();
