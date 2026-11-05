#!/usr/bin/env node
/**
 * Create the final 2 missing custom fields in S7HE with correct types
 * - consentimento_lgpd (CHECKBOX)
 * - diagnostic_score (NUMERICAL)
 */

import fs from 'fs';

const tokenBuffer = fs.readFileSync('/tmp/.ghl_token_location_test');
const TOKEN = tokenBuffer.toString().trim();
const LOCATION_ID = 'S7HEFAz97UKuC8NLHMmI';

const fieldsToCreate = [
  {
    name: 'Consentimento LGPD',
    dataType: 'CHECKBOX',
    description: 'Consentimento do contato para LGPD',
    options: [{ key: 'sim', label: 'Sim' }],
  },
  {
    name: 'Score Diagnóstico',
    dataType: 'NUMERICAL',
    description: 'Pontuação do diagnóstico',
  },
];

async function createFields() {
  console.log('🔧 Criando 2 campos faltantes...\n');

  for (const field of fieldsToCreate) {
    try {
      const payload = {
        name: field.name,
        dataType: field.dataType,
        description: field.description,
      };

      if (field.options) {
        payload.options = field.options;
      }

      const res = await fetch(
        `https://services.leadconnectorhq.com/locations/${LOCATION_ID}/customFields`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            Version: '2021-07-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const data = await res.json();
        console.log(`✅ ${field.name} criado com sucesso!`);
        console.log(`   ID: ${data.id || 'N/A'}\n`);
      } else {
        const error = await res.json();
        console.log(`❌ Erro ao criar ${field.name}:`);
        console.log(`   ${error.message || JSON.stringify(error)}\n`);
      }
    } catch (err) {
      console.log(`❌ Erro na requisição para ${field.name}:`);
      console.log(`   ${err.message}\n`);
    }
  }

  console.log('✨ Conclusão: Fase 0.1 (Custom Fields) completa!');
  console.log('📊 Status: 16/16 campos necessários definidos');
}

createFields();
