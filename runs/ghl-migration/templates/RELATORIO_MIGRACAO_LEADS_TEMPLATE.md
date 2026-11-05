# Relatório de migração de leads — oFTw → S7HE

Data de geração: `<AAAAMMDD>`
Fonte: `runs/ghl-migration/<AAAAMMDD>/`
Arquivos de origem: `oftw-contacts.json`, `oftw-material-leads.csv`, `migrated.json`, `errors.csv`, `skipped.csv`, `reenvio-log.csv`

## 1. Contatos exportados vs. migrados

| Métrica | Valor |
|---|---|
| Contatos exportados de oFTw (`oFTw9DcsKRUj6xCiq4mb`) | `<N>` |
| Contatos com e-mail (elegíveis à migração) | `<N>` |
| Contatos sem e-mail (`skipped.csv`) | `<N>` |
| Contatos migrados para S7HE (`migrated.json`) | `<N>` |
| Contatos já existentes em S7HE (união de tags, FUNNELS preservado) | `<N>` |
| Erros de upsert (`errors.csv`) | `<N>` |
| Notas de migração gravadas | `<N>` |

Divergência de conferência (exportados − migrados − sem e-mail − erros): `<N>` (deve ser 0)

## 2. Materiais reenviados

| Métrica | Valor |
|---|---|
| Contatos com download (`material-download`) | `<N>` |
| Downloads com e-mail entregue (`email_entregue=true`) | `<N>` |
| Downloads sem entrega (`acao=reenviar`) | `<N>` |
| Contatos com ao menos um reenvio | `<N>` |
| Reenvios enviados (`reenvio-log.csv` status `enviado`) | `<N>` |
| Reenvios com timeout do workflow (tag não removida em 5 min) | `<N>` |
| Falhas de reenvio (`erro:*`) | `<N>` |
| Taxa de reenvio com sucesso | `<%>` |

Falhas de entrega (Conversations em S7HE com status `failed`/`undelivered`), por material:

| Slug | Título | Reenvios | Enviados | Falhas | Observação |
|---|---|---|---|---|---|
| `<slug>` | `<título>` | `<N>` | `<N>` | `<N>` | `<ex.: link morto V6>` |

Lista nominal (`email | material | status reenvio`): anexar `reenvio-log.csv` ou inserir tabela aqui.

## 3. Não recuperável

Leads que submeteram o formulário após a revogação do PIT `pit-9285…` em produção (HTTP 401 do relay `ghl.php`) não existem em nenhum sistema: o upsert falhou, a API staging exige autenticação e não há log com e-mail.

| Item | Valor |
|---|---|
| Data estimada da primeira falha (Hostinger hPanel → Logs, linhas `[ghl.php]`) | `<AAAA-MM-DD>` |
| Data da última submissão registrada em oFTw | `<AAAA-MM-DD>` |
| Estimativa de submissões perdidas | `<N>` (não verificável; declarar como estimativa) |
| Contatos de oFTw com material e sem e-mail entregue, não reenviáveis por falta de e-mail | `<N>` |

Ação recomendada ao dono: nenhuma recuperação possível para os itens acima; comunicar como limitação.

## 4. Linha do tempo

| Data | Evento |
|---|---|
| `<AAAA-MM-DD>` | Primeira falha 401 do relay `ghl.php` (token revogado) |
| `<AAAA-MM-DD>` | Início do plano (Fase 0 — PITs criados, inventário oFTw) |
| `<AAAA-MM-DD>` | Export de oFTw (`export-oftw-leads.mjs`) concluído |
| `<AAAA-MM-DD>` | Campos e formulários criados em S7HE (Fase 1) |
| `<AAAA-MM-DD>` | Migração por `migrate-to-s7he.mjs` (dry-run, `--limit 3`, completa) |
| `<AAAA-MM-DD>` | Reenvio de materiais (`resend-materials.mjs`) concluído |
| `<AAAA-MM-DD>` | Troca de nameservers para Cloudflare (Fase 3.5) |
| `<AAAA-MM-DD>` | Congelamento de oFTw |

## 5. Estatísticas

| Indicador | Valor |
|---|---|
| Duração total da migração (horas) | `<N>` |
| Tempo médio por contato migrado (s) | `<N>` |
| Tempo médio de remoção da tag `reenviar-material` (s) | `<N>` |
| Contatos QA (`qa+*@usefunnels.io`) criados e apagados | `<N>` / `<N>` |
| Materiais com mais downloads (top 5) | `<slug: N>` |
| Distribuição de `cargo` (quando preenchido) | `<tabela>` |

## 6. Pendências

- [ ] `<item>`
- [ ] Nenhum PIT de migração (`revhackers-migracao`, `revhackers-export-readonly`) ativo após a execução; revogar ambos.
- [ ] Contatos QA apagados em S7HE (V8).
