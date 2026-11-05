# Checklist final — migração GHL S7HE e cutover Cloudflare

Template. Preencher data, responsável e evidência de cada item. Nenhum item fecha sem evidência observada.

## Fase 6 — erros e ambiguidades a fechar fora deste repositório

- [ ] `pages.usefunnels.io` sem DNS: criar o CNAME indicado em S7HE → Sites → Domains, ou trocar os embeds do usefunnels.io para `api.leadconnectorhq.com`. Evidência: `dig @1.1.1.1 pages.usefunnels.io` retorna registro. Hoje o form `jME4FK4zm8bkuVEux59g` e o calendário do usefunnels.io não carregam.
- [ ] Revogar o PIT `pit-9285…` em oFTw (está no histórico git público do repo). Evidência: `GET /contacts/` com esse token retorna 401.
- [ ] Decidir o destino de `app.revhackers.com.br`, `academy.`, `blog.` e `ftp.` (apontam para Hostinger; encerram com o cancelamento da Fase 3.7). Evidência: decisão registrada em `00-CONTROLE`.
- [ ] `lp.revhackers.com.br` e `materiais.revhackers.com.br` são funis GHL em oFTw (`sites.ludicrous.cloud`). `plano-acao-90-dias` entrega por `lp.revhackers.com.br/post/...`. Decidir: mover o funil para S7HE ou aceitar que fica em oFTw. Evidência: decisão registrada.
- [ ] Fechar PR #8 (parte relay superada; `auth-routes` cai com o PR #11), PR #6 (absorvido pelo `wrangler.toml` da Fase 3.1), PR #10 (integração obsoleta). Rebase do PR #4 se seguir. Evidência: `gh pr list` sem os PRs fechados.
- [ ] Verificar ao vivo os 22 `link_material` Notion (ver V6). Links mortos precisam de nova URL em `src/data/materialsData.ts` antes do deploy. Evidência: `runs/materials-links-<data>.md` sem entradas DEAD.

Observação de contagem: o plano cita 23 materiais. `src/data/materialsData.ts` tem 22 entradas (22 `slug` e 22 `link_material`, todas `published` e `is_active`). Confirmar com o dono se falta um material.

## Verificação V1–V8 (plano, seção Verificação)

- [ ] V1 (build/estático): `npx tsc -p tsconfig.app.json --noEmit && npx vite build && npx wrangler deploy --dry-run` sem erro; `grep -rn "sendToGHL\|ghlRelay\|ghl\.php" src public scripts` retorna zero linhas.
- [ ] V2 (prova GHL direta, Fase 1.9): form de materiais com query `material_slug=guia-gtm&material_title=…&material_link=…`, enviado com `qa+materiais@usefunnels.io`. Em S7HE: contato com `material_slug=guia-gtm`, tags `material-download` e `baixou:guia-gtm`, e-mail *Delivered* com link para o `link_material` de `guia-gtm`, oportunidade em `Lead material`.
- [ ] V3 (site local, Fase 2.11): `npm run dev` → `/materiais` → modal → envio, com o mesmo resultado de V2. Console mostra a mensagem `FORM_SUBMITTED`. Em `/diagnostico`, o resultado só aparece após o envio. `/booking` renderiza o calendário S7HE (`api.leadconnectorhq.com/widget/booking/<id>` com 200).
- [ ] V4 (workers.dev, Fase 3.3): os mesmos passos de V3 na URL `*.workers.dev`. `curl -sI` nos assets mostra `cache-control: public, max-age=31536000, immutable`.
- [ ] V5 (DNS, Fase 3.6): `dig +short NS revhackers.com.br` retorna Cloudflare; `curl -sI https://revhackers.com.br | grep -i server` retorna `cloudflare`; `curl -s https://revhackers.com.br/api/ghl.php | head -c 100` não contém `statusCode`; `dig +short MX revhackers.com.br` retorna `1 smtp.google.com.`; e-mail de teste chega em `contato@`.
- [ ] V6 (links dos materiais): Chrome headless sobre os 22 `link_material`, 23 s de espera por página, veredito DEAD se `title==="Notion" && body<500`. Relatório em `runs/materials-links-<data>.md`.
- [ ] V7 (migração, Fase 4): `node scripts/ghl/export-oftw-leads.mjs --limit 5` imprime 5 contatos com `email_entregue` coerente com a aba Conversations. `node scripts/ghl/migrate-to-s7he.mjs --input <oftw-contacts.json> --dry-run` mostra payloads sem chamadas. Execução real gera `migrated.json` com N entradas = contatos com e-mail. Um contato com `acao=reenviar` recebe o e-mail (Conversations em S7HE) e perde a tag `reenviar-material` em até 2 min.
- [ ] V8 (limpeza QA): todos os contatos `qa+*@usefunnels.io` apagados em S7HE. `git log -S 'pit-' --all` e `grep -r "pit-" .` sem tokens novos.

## Não recuperável

- [ ] Declarado no relatório: leads que submeteram o formulário após a revogação do token (upsert 401) não existem em nenhum sistema. Data estimada = primeira falha, obtida em Hostinger hPanel → Logs de erro (linhas `[ghl.php]`). Recuperáveis somente os contatos de oFTw com tag `materiais` sem e-mail entregue (Fase 4).
