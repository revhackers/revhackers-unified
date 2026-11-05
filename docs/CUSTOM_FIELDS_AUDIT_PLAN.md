# 🔍 Plano de Auditoria e Padronização de Campos Customizados

**Data**: 2026-11-05  
**Escopo**: S7HE (FUNNELS) vs oFTw (RevHackers)  
**Objetivo**: Consolidar campos únicos, eliminar duplicatas, padronizar tipos de dados

---

## 1️⃣ Fase 1: Auditoria (Script `audit-custom-fields.mjs`)

### Coleta de dados
```
✅ S7HE (FUNNELS) — S7HEFAz97UKuC8NLHMmI
   - Lista TODOS os campos (nome, chave, tipo, dataType)
   - Conta: X campos
   - Chaves: [lista]

✅ oFTw (RevHackers) — oFTw9DcsKRUj6xCiq4mb
   - Lista TODOS os campos (nome, chave, tipo, dataType)
   - Conta: Y campos
   - Chaves: [lista]
```

### Análise comparativa
```
📌 Apenas em S7HE (não migrados de oFTw):
   - [lista de chaves]
   - Decisão: Manter? Replicar em oFTw? Remover?

📌 Apenas em oFTw (histórico RevHackers):
   - [lista de chaves]
   - Decisão: Ignorar? Migrar para S7HE? Manter na origem?

✅ Em ambas (duplicadas):
   - [lista de chaves]
   - Decisão: Consolidar nome/tipo? Qual é a "golden source"?
```

---

## 2️⃣ Fase 2: Padronização (Decisões de design)

### Matriz de campos proposta (16 campos para RevHackers em S7HE)

| # | Nome Exato | Chave | Tipo | DataType | Origem | Motivo |
|---|-----------|-------|------|----------|--------|--------|
| 1 | Origem | `origem` | TEXT | string | Novo | Tag programática (revhackers/funnels) |
| 2 | Funil | `funil` | TEXT | string | Novo | Categorizar lead por superfície (materiais/diagnostico/etc) |
| 3 | Material Slug | `material_slug` | TEXT | string | Novo | Slug único do material baixado |
| 4 | Material Título | `material_title` | TEXT | string | Novo | Nome exato do material |
| 5 | Material Link | `material_link` | TEXT | string | Novo | URL do material (Notion, PDF, etc) |
| 6 | Cargo | `cargo` | TEXT | string | Novo (ex: oFTw pode ter) | Seniority da pessoa |
| 7 | Setor | `setor` | TEXT | string | Novo (ex: oFTw pode ter) | Indústria/vertical |
| 8 | Consentimento LGPD | `consentimento_lgpd` | CHECKBOX | boolean | Novo | Opt-in explícito |
| 9 | Tipo Diagnóstico | `diagnostic_type` | TEXT | string | Novo | Growth/Revenue/Site/Founder |
| 10 | Score Diagnóstico | `diagnostic_score` | NUMBER | number | Novo | 0-100 |
| 11 | Categoria Diagnóstico | `diagnostic_category` | TEXT | string | Novo | Maturity level |
| 12 | Calculadora | `calculadora` | TEXT | string | Novo | LTV/ROAS |
| 13 | Resultado Calculadora | `calculadora_resultado` | TEXT | string | Novo | JSON serializado {inputs, resultado} |
| 14 | UTM Source | `utm_source` | TEXT | string | Novo | Fonte do tráfego |
| 15 | UTM Medium | `utm_medium` | TEXT | string | Novo | Meio (organic, email, etc) |
| 16 | UTM Campaign | `utm_campaign` | TEXT | string | Novo | Campanha |

### Campos opcionais para fase 2 (se oFTw tiver)

| # | Nome | Chave | Tipo | Decisão |
|---|------|-------|------|---------|
| A | LinkedIn | `linkedin` | TEXT | Migrar se oFTw tiver com chave consistente |
| B | CRM Atual | `crm_atual` | TEXT | Migrar se relevante |
| C | Tamanho do Time | `tamanho_do_time` | TEXT | Migrar se oFTw tiver |
| D | Principal Dor | `principal_dor` | TEXT | Usar para diagnósticos em oFTw também |

---

## 3️⃣ Fase 3: Consolidação

### Campos a REMOVER de oFTw (após migração)
```
❌ Campos obsoletos ou específicos de CPN
   - [lista]
   - Data de remoção: [após Fase 4 de migração]
```

### Campos a MANTER em ambas (para histórico)
```
✅ Campos que já existem em oFTw
   - Manter como estão
   - Usar durante migração (Fase 4)
   - Opcional: replicar em S7HE com mesmo nome/tipo
```

### Campos NOVOS só em S7HE (RevHackers nativo)
```
🆕 16 campos acima
   - Criados via API (script)
   - Não afetam oFTw
   - Prontos para formulários nativos GHL
```

---

## 4️⃣ Documentação (Saída esperada)

### Arquivo: `AUDIT_CUSTOM_FIELDS.json`
```json
{
  "timestamp": "2026-11-05T14:30:00Z",
  "summary": {
    "s7he_total": 0,
    "oftw_total": X,
    "only_in_s7he": [],
    "only_in_oftw": [...],
    "in_both": [...]
  },
  "details": {
    "S7HE (FUNNELS)": [...],
    "oFTw (RevHackers)": [...]
  },
  "recommendations": [
    {
      "type": "create",
      "location": "S7HE",
      "fields": [...],
      "reason": "Nova estratégia RevHackers"
    },
    {
      "type": "consolidate",
      "field": "...",
      "locations": ["S7HE", "oFTw"],
      "decision": "Usar em ambas com chave padrão"
    },
    {
      "type": "retire",
      "field": "...",
      "location": "oFTw",
      "reason": "Obsoleto após migração",
      "decommission_date": "2026-12-05"
    }
  ]
}
```

### Arquivo: `CUSTOM_FIELDS_STANDARDIZATION.md`
```markdown
# Padronização de Campos Customizados

## Convenções de chave
- Nomes: `snake_case`
- Sem espaços, acentos, caracteres especiais
- Máximo 50 caracteres
- Prefixo opcional: `utm_`, `diagnostic_`, etc.

## Convenções de tipo
- TEXT: strings livres (< 500 char)
- NUMBER: valores numéricos inteiros ou decimais
- CHECKBOX: booleanos (true/false)
- SELECT: dropdown pré-definido (não usado aqui)

## Versionamento
- Versão: 1.0 (2026-11-05)
- Próxima revisão: pós-Fase 4 (após migração de leads)
- Mudanças breaking: exigem atualização de scripts

## Propriedade
- **S7HE campos**: Tech team (migrations, APIs)
- **oFTw campos**: Legacy (manutenção durante rollback window)
```

---

## 5️⃣ Checklist de Execução

```
PRÉ-AUDITORIA:
[ ] Token agency com escopos completos (todos os scopes = "Select all")
[ ] Acesso confirmado em ambas locations (HTTP 200 em GET /locations/{id})

AUDITORIA:
[ ] Rodar `audit-custom-fields.mjs`
[ ] Gerar `AUDIT_CUSTOM_FIELDS.json`
[ ] Revisar recomendações

PADRONIZAÇÃO:
[ ] Decidir quais campos de oFTw migrar para S7HE
[ ] Confirmar 16 campos exatos para S7HE (lista acima)
[ ] Atualizar `CUSTOM_FIELDS_STANDARDIZATION.md` com decisões

CRIAÇÃO EM S7HE:
[ ] Rodar `create-s7he-custom-fields.mjs`
[ ] Validar: GET /locations/S7HE/customFields retorna 16 campos
[ ] Documentar IDs retornados (mapeamento chave → id)

CONSOLIDAÇÃO:
[ ] Decidir retirement schedule para campos obsoletos em oFTw
[ ] Registrar em changelog (data, campo, motivo)
[ ] Comunicar ao dono sobre rollback window (7 dias)

PÓS-MIGRAÇÃO (Fase 4):
[ ] Remover campos obsoletos de oFTw (se decidido)
[ ] Atualizar scripts de migração com novos IDs
[ ] Arquivo final: `CUSTOM_FIELDS_FINAL_STATE.json`
```

---

## 6️⃣ Notas importantes

⚠️ **Escopo do token**: Necessário `locations/customFields.write` para criar em S7HE  
⚠️ **Acesso a oFTw**: Token agency tem acesso? Se não, precisará de PIT de oFTw específico  
⚠️ **Reversibilidade**: Campos podem ser deletados sem afetar leads (dados orfãos no campo)  
⚠️ **Migração**: Scripts de Fase 4 usarão chaves exatas como mapeamento  

---

**Próximo passo**: Fornecer token com escopos completos → Rodar auditoria → Gerar relatório → Decisões finais
