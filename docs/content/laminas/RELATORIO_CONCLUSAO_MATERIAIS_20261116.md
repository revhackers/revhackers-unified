# Relatório de conclusão — Materiais Ricos L01–L29 (16/11/2026)

- Worktree: `Materiais-Ricos` (`/Users/giullianoalves/orca/workspaces/revhackers/revhackers-unified/worktrees/canonical-main/Materiais-Ricos`)
- Branch: `giulliano-alves/Materiais-Ricos`
- HEAD: `6af8eb730f28c0011de51af34990554e798a4f0b` (inalterado; nenhum commit, push, deploy ou merge feito nesta sessão)
- Sessão: Muse Spark 1.3, continuidade da sessão OMP MTRL `01a1d7d1-4063-772b-b552-0466704c992c` (exit registrado 15/11 17:45; logs OMP contêm só eventos de infra, sem conteúdo de trabalho — estado recuperado dos arquivos da worktree)
- Documentos-base lidos: `~/Workspace/REVTECH/AGENTS.md`, `AGENTS.md` da worktree, `CONCILIACAO-INPUT.md`, `docs/_integracao/forms-authority-CONTRATO.md`, `docs/_integracao/MATERIAIS-OBRIGADO-RESPOSTA-GTM.md`, `docs/content/laminas/README.md`, `docs/content/laminas/publicacao.json`

## Decisão: HOLD (condicional)

- **GO** — conteúdo dos 29 materiais, site (captura/obrigado/acesso/índice), UTMs/handoff no frontend e estado publicado em produção: tudo verificado com prova independente nesta sessão.
- **HOLD** — homologação ponta a ponta de **submissão real de formulário + entrega por e-mail** continua aberta (nenhum contato criado, nenhum disparo, workflow em DRAFT — por ausência de autorização para writes em produção, não por defeito encontrado). E a **próxima publicação** precisa de decisão do dono sobre o destino do deploy (seção 6.1).

## FEITO

- Reconciliados 29 novos (L01–L29) + 22 anteriores = 51 cadastros em `src/data/materialsData.ts` (51 slugs únicos), `scripts/ghl/materials-registry.json` (51) e `docs/content/laminas/publicacao.json` (29 novos). Índice `/materiais` renderiza 51/51 cards.
- Verificado com prova independente que **produção já serve os 29**: bundle `index-NFdrNt8L.js` contém slugs novos + form `mJMtcwBd46xpqm9c2ABu` + `score-founder` + patch `iFrameResize`; hash idêntico ao build local desta worktree.
- Verificados 29/29 Notion (HTTP 200), 29/29 imagens byte-idênticas (prod == `publicacao.json` == local, MD5), 7/7 vídeos (thumbnail + oembed 200), 13/13 URLs de mapas (11 boards únicos — reconcilia com o README), 23/23 artigos de blog (200).
- QA em navegador real (Chrome headless via playwright-core do repo): captura desktop/mobile, iframe do form renderizado sem clipping (3 campos + consentimento + botão verde visíveis; altura 380→464px via resizer), obrigado com acesso + CTA Decisor Visible, redirect de acesso ao Notion correto, `/score-founder` renderizando questionário, guarda anti-spoof funcionando ao vivo.
- Resposta ao `CONCILIACAO-INPUT.md`: **opção A implementada e verificada** (CTA → `/score-founder?source=materiais:<slug>&material=<slug>&utm_*`, sem PII na URL; `ghl_contact_id` só quando fornecido).
- 3 correções mínimas aplicadas e retestadas (seção 7). Nenhum diff preexistente foi alterado.

## TESTADO

| Check | Comando | Resultado |
|---|---|---|
| Handoff (4 testes) | `npx vitest run tests/material-handoff.test.tsx` | 4 passed |
| Suite completa | `npm test` (+ `npm ci --prefix api`, passo do CI) | 27 arquivos, 406 passed |
| Typecheck (gate CI) | `npx tsc --noEmit` | exit 0 |
| Build (gate CI) | `npx vite build` (antes e depois da correção) | ✓ built (2x) |
| Typecheck API / build API | — | não rodados (nenhum arquivo `api/` tocado; falhas iniciais de `tests/api` eram `api/node_modules` ausente — ambiental, resolvido com o passo do CI) |
| Notion 29 páginas | GET com UA QA-readonly | 29× HTTP 200 |
| Imagens prod vs doc vs local | download + MD5 | 29/29 idênticas |
| Vídeos/Mapas/Artigos | thumbnail+oembed / GET | 7/7, 13/13, 23/23 |
| Navegador desktop+mobile | playwright-core + Chrome do sistema | captura/obrigado/acesso/score-founder OK, sem overflow (1440 e 390px), sem pageerrors |

## PENDENTE

1. **Homologação E2E de submissão real + e-mail** (gate exato, seção 8): submissão controlada → contato no GHL S7HE com `rh_material_slug` + tags → workflow publicado disparando template → e-mail recebido com link `/materiais/acesso/<slug>`. Requer autorização específica do dono.
2. **Decisão do dono: destino do deploy** — `npx wrangler deploy` (HEAD, commit do dono) vs `npx wrangler deploy --env production` (diff não commitado + README). Não tocar até decisão.
3. **FounderScore consumir a query do handoff** (`source/material/ghl_contact_id/utm_*`) e gravar `diagnostic_type='authority'` — dono: frente Site-e-Blog/GTM. Nesta worktree o componente ainda usa `rh_diagnostic_type: 'founder'` e não lê a query (verificado por leitura).
4. **Registry: 22 links antigos divergentes** (`bustling-lemon-68c` no registry vs `revtech.notion.site` no cadastro) — impacto baixo (entrega viva usa redirect `/materiais/acesso` → cadastro; registry alimenta só conciliação oFTw). Regenerar via `export-oftw-leads.mjs` somente com decisão do dono.
5. Ajustes fora do código, para o dono/GHL: acento "Politica→Política" no consentimento do form S7HE; investigar 404 `chat-widget/public/config/6699…` (widget funciona apesar disso).

## BLOQUEADO

- Nada bloqueado por defeito técnico. Os itens 1–4 de PENDENTE aguardam **decisão/autorização humana** (writes em produção, GHL, deploy). Nenhum contato, agendamento, e-mail real, workflow ativo, deploy, push, DNS, secret ou permissão foi tocado nesta sessão.

## 1. Contagem por material (URLs reais, verificadas)

Base: `publicacao.json` (29). Conferido: README == publicacao 29/29; registry contém os 29 slugs com os mesmos links; `materialsData.ts` contém os 29 com os mesmos links.

| Slide | Slug | Captura | Notion (200) | Acesso |
|---|---|---|---|---|
| L01 | conferencia-fatos-prospeccao-ia-guia-pratico | https://revhackers.com.br/materiais/conferencia-fatos-prospeccao-ia-guia-pratico | https://revtech.notion.site/43af7ed477a945cf85a1bf5e9fd65706 | https://revhackers.com.br/materiais/acesso/conferencia-fatos-prospeccao-ia-guia-pratico |
| L02 | prospeccao-sinais-icp-guia-pratico | https://revhackers.com.br/materiais/prospeccao-sinais-icp-guia-pratico | https://revtech.notion.site/36d78e4f0be34685b5a66d6b5bbd4b71 | https://revhackers.com.br/materiais/acesso/prospeccao-sinais-icp-guia-pratico |
| L03 | mensagem-4-pecas-guia-pratico | https://revhackers.com.br/materiais/mensagem-4-pecas-guia-pratico | https://revtech.notion.site/763de8d9d4ff471f867fc67cb650c911 | https://revhackers.com.br/materiais/acesso/mensagem-4-pecas-guia-pratico |
| L04 | cadencia-linkedin-guia-pratico | https://revhackers.com.br/materiais/cadencia-linkedin-guia-pratico | https://revtech.notion.site/3d27bb099d014f4998070f3be54b60e0 | https://revhackers.com.br/materiais/acesso/cadencia-linkedin-guia-pratico |
| L05 | mala-direta-prospeccao-por-sinal-guia-pratico | https://revhackers.com.br/materiais/mala-direta-prospeccao-por-sinal-guia-pratico | https://revtech.notion.site/396b4981cb5c4b918fcd56bb77db6a6f | https://revhackers.com.br/materiais/acesso/mala-direta-prospeccao-por-sinal-guia-pratico |
| L06 | persistencia-follow-up-sem-perseguicao-guia-pratico | https://revhackers.com.br/materiais/persistencia-follow-up-sem-perseguicao-guia-pratico | https://revtech.notion.site/54a2f79c3ffd4d4496d37f863d637442 | https://revhackers.com.br/materiais/acesso/persistencia-follow-up-sem-perseguicao-guia-pratico |
| L07 | precisao-de-fatos-antes-do-envio-guia-pratico | https://revhackers.com.br/materiais/precisao-de-fatos-antes-do-envio-guia-pratico | https://revtech.notion.site/8571f1133e1548a1b84f59f87a03fd89 | https://revhackers.com.br/materiais/acesso/precisao-de-fatos-antes-do-envio-guia-pratico |
| L08 | da-nota-a-call-convite-linkedin-guia-pratico | https://revhackers.com.br/materiais/da-nota-a-call-convite-linkedin-guia-pratico | https://revtech.notion.site/b1f31e08a33b42b5b152673d1ea22868 | https://revhackers.com.br/materiais/acesso/da-nota-a-call-convite-linkedin-guia-pratico |
| L09 | maquina-de-vendas-como-servico-guia-pratico | https://revhackers.com.br/materiais/maquina-de-vendas-como-servico-guia-pratico | https://revtech.notion.site/de655909bf0b4273bf05fc4c8731bb1b | https://revhackers.com.br/materiais/acesso/maquina-de-vendas-como-servico-guia-pratico |
| L10 | captura-demanda-post-crm-guia-pratico | https://revhackers.com.br/materiais/captura-demanda-post-crm-guia-pratico | https://revtech.notion.site/67f89b3b20e742ee84930f88f673ec8a | https://revhackers.com.br/materiais/acesso/captura-demanda-post-crm-guia-pratico |
| L11 | crm-no-centro-aprovacao-ia-guia-pratico | https://revhackers.com.br/materiais/crm-no-centro-aprovacao-ia-guia-pratico | https://revtech.notion.site/1a85aad861a14c22a63d9b537454138e | https://revhackers.com.br/materiais/acesso/crm-no-centro-aprovacao-ia-guia-pratico |
| L12 | venda-anuncio-google-ads-ciclo-fechado-guia-pratico | https://revhackers.com.br/materiais/venda-anuncio-google-ads-ciclo-fechado-guia-pratico | https://revtech.notion.site/eb1c6712c18c4dbbbdc60d235f074211 | https://revhackers.com.br/materiais/acesso/venda-anuncio-google-ads-ciclo-fechado-guia-pratico |
| L13 | do-sim-ao-crm-aprovacao-pronta-guia-pratico | https://revhackers.com.br/materiais/do-sim-ao-crm-aprovacao-pronta-guia-pratico | https://revtech.notion.site/95ad4c2b42a947358990b34cafcbaedf | https://revhackers.com.br/materiais/acesso/do-sim-ao-crm-aprovacao-pronta-guia-pratico |
| L14 | ferramentas-soltas-maquina-conectada-guia-pratico | https://revhackers.com.br/materiais/ferramentas-soltas-maquina-conectada-guia-pratico | https://revtech.notion.site/73819797fb0740ce8893cc0d665aa7ae | https://revhackers.com.br/materiais/acesso/ferramentas-soltas-maquina-conectada-guia-pratico |
| L15 | descarte-antes-do-toque-guia-pratico | https://revhackers.com.br/materiais/descarte-antes-do-toque-guia-pratico | https://revtech.notion.site/bffc6e1d067c4156b065294f04ad2a26 | https://revhackers.com.br/materiais/acesso/descarte-antes-do-toque-guia-pratico |
| L16 | pesos-sinais-prospeccao-guia-pratico | https://revhackers.com.br/materiais/pesos-sinais-prospeccao-guia-pratico | https://revtech.notion.site/7bda3e8bea094772bb06ae8185db4edb | https://revhackers.com.br/materiais/acesso/pesos-sinais-prospeccao-guia-pratico |
| L17 | icp-exclusoes-triagem-guia-pratico | https://revhackers.com.br/materiais/icp-exclusoes-triagem-guia-pratico | https://revtech.notion.site/38d68dccafe041b8a7f00bb452857091 | https://revhackers.com.br/materiais/acesso/icp-exclusoes-triagem-guia-pratico |
| L18 | pareto-alcance-linkedin-guia-pratico | https://revhackers.com.br/materiais/pareto-alcance-linkedin-guia-pratico | https://revtech.notion.site/023fdd0d0de44f08a9a83111f8e74367 | https://revhackers.com.br/materiais/acesso/pareto-alcance-linkedin-guia-pratico |
| L19 | feed-linkedin-o-que-le-guia-pratico | https://revhackers.com.br/materiais/feed-linkedin-o-que-le-guia-pratico | https://revtech.notion.site/ec78ad44cebb4ac08251f5a9c3410b24 | https://revhackers.com.br/materiais/acesso/feed-linkedin-o-que-le-guia-pratico |
| L20 | comentario-que-vira-conversa-guia-pratico | https://revhackers.com.br/materiais/comentario-que-vira-conversa-guia-pratico | https://revtech.notion.site/d61910feaedc4c46b06726a84314b976 | https://revhackers.com.br/materiais/acesso/comentario-que-vira-conversa-guia-pratico |
| L21 | filtro-comentarios-descarte-guia-pratico | https://revhackers.com.br/materiais/filtro-comentarios-descarte-guia-pratico | https://revtech.notion.site/74ce914378e84bc6bf75c7b7a5e40395 | https://revhackers.com.br/materiais/acesso/filtro-comentarios-descarte-guia-pratico |
| L22 | oferta-por-lead-cadencia-guia-pratico | https://revhackers.com.br/materiais/oferta-por-lead-cadencia-guia-pratico | https://revtech.notion.site/649332418b8b480b8e4a011ffa18f43c | https://revhackers.com.br/materiais/acesso/oferta-por-lead-cadencia-guia-pratico |
| L23 | limites-ritmo-seguro-cadencia-linkedin-guia-pratico | https://revhackers.com.br/materiais/limites-ritmo-seguro-cadencia-linkedin-guia-pratico | https://revtech.notion.site/aa8f437f2b894e78a24390476a885859 | https://revhackers.com.br/materiais/acesso/limites-ritmo-seguro-cadencia-linkedin-guia-pratico |
| L24 | dupla-revisao-fatos-mensagens-guia-pratico | https://revhackers.com.br/materiais/dupla-revisao-fatos-mensagens-guia-pratico | https://revtech.notion.site/0e99861aeee54918bab61c70bb934997 | https://revhackers.com.br/materiais/acesso/dupla-revisao-fatos-mensagens-guia-pratico |
| L25 | vaga-sinal-compra-fonte-guia-pratico | https://revhackers.com.br/materiais/vaga-sinal-compra-fonte-guia-pratico | https://revtech.notion.site/445e7c80c10549d8827fb03a8310cb4e | https://revhackers.com.br/materiais/acesso/vaga-sinal-compra-fonte-guia-pratico |
| L26 | origem-perdida-redirecionamento-rastreio-guia-pratico | https://revhackers.com.br/materiais/origem-perdida-redirecionamento-rastreio-guia-pratico | https://revtech.notion.site/2e0054f3327d4b2d84866156bac71df3 | https://revhackers.com.br/materiais/acesso/origem-perdida-redirecionamento-rastreio-guia-pratico |
| L27 | consentimento-medicao-google-ads-guia-pratico | https://revhackers.com.br/materiais/consentimento-medicao-google-ads-guia-pratico | https://revtech.notion.site/b738b3206af740e79e401d3932c6a1ac | https://revhackers.com.br/materiais/acesso/consentimento-medicao-google-ads-guia-pratico |
| L28 | revisao-diaria-google-ads-guia-pratico | https://revhackers.com.br/materiais/revisao-diaria-google-ads-guia-pratico | https://revtech.notion.site/043fc36543c04bebb29888dcb1af4cc8 | https://revhackers.com.br/materiais/acesso/revisao-diaria-google-ads-guia-pratico |
| L29 | painel-do-post-a-venda-guia-pratico | https://revhackers.com.br/materiais/painel-do-post-a-venda-guia-pratico | https://revtech.notion.site/634860a58a5d4fe9b226e289909ef753 | https://revhackers.com.br/materiais/acesso/painel-do-post-a-venda-guia-pratico |

22 anteriores preservados (slugs, ordem do cadastro): framework-ia-meta-ads, plano-acao-90-dias, guia-agent-builder, crm-estrategico, transforme-linkedin, guia-gtm, linkedin-outreach, timing-sales-playbook, contato-decisores, framework-clickup, servidor-ia-local, growth-score-guia-acao, site-score-guia-acao, founder-score-guia-acao, revenue-score-guia-acao, playbook-handoff-vendas-cs, matriz-compensacao-vendas-b2b, guia-precificacao-saas-b2b, framework-territorios-contas-b2b, framework-prime-o-playbook-definitivo-de-comentarios-de-autoridade-no-linkedin-b2b, matriz-roteamento-ia-qual-modelo-usar-em-cada-tarefa, prospeccao-ultra-segmentada-7-dados.

## 2. Evidências verificadas (produção e conteúdo)

- `curl https://revhackers.com.br/` → 200, `server: cloudflare`; HTML referencia `/assets/index-NFdrNt8L.js` — **mesmo hash do `npx vite build` local desta worktree** (determinístico a partir do mesmo fonte).
- Bundle de produção baixado: contém `conferencia-fatos-prospeccao-ia-guia-pratico`, `prospeccao-sinais-icp-guia-pratico`, `painel-do-post-a-venda-guia-pratico`, `revisao-diaria-google-ads-guia-pratico` (grep ≥1 cada), `mJMtcwBd46xpqm9c2ABu`, `score-founder` (2x) e código `iFrameResize/registerLateMountedIframe` → produção inclui os 29 + patch do embed.
- Staging `revhackers-site.revhackers.workers.dev` serve bundle diferente (`index-MydapNFA.js`, 214 bytes menor) que também contém os slugs novos.
- L01 exemplo triplo: MD5 do PNG em produção `d2af506fecd4712846de790d29d4f19e` == `publicacao.json/originalMd5` == arquivo local. Estendido às 29: 29/29.
- Notion: 29/29 HTTP 200 (GET direto). Vídeos: 7 IDs distintos, thumbnail `hqdefault.jpg` 200 + oembed 200 para os 7. Mapas: 13 URLs distintas, 13/13 HTTP 200 (11 boards únicos — 2 boards aparecem em 2 URL-slugs; reconcilia o "11 mapas" do README). Artigos: 23 URLs distintas, 23/23 HTTP 200.
- Imagens locais: 29/29 presentes em `public/uploads/laminas/` (269–433 KB cada).

## 3. QA em navegador (dev local `http://127.0.0.1:4192`, Chrome headless + playwright-core 1.62.1 do repo)

- Captura L01 desktop 1440px: H1 correto, iframe `Receber material` presente, `src` com formId + slug; após load, `window.iFrameResize` = function e iframe 380→464px (resizer ativo). Screenshot do iframe: 3 campos + checkbox de consentimento com link de privacidade + botão verde "Receber material" totalmente visível — **sem clipping**.
- Guarda anti-spoof ao vivo: `MessageEvent` sintético com origin GHL despachado da página **não** navegou (pathname permaneceu `/materiais/<slug>`) — mesma asserção dos testes unitários, agora no navegador real.
- Obrigado: H1 "Pronto. Seu material está liberado.", acesso `href=/materiais/acesso/<slug>`, CTA `/score-founder?source=materiais:<slug>&material=<slug>&utm_*` sem `email` na URL. Acesso: redirect real ao Notion correto da L01.
- `/score-founder?source=materiais:<slug>&material=<slug>&utm_source=qa`: H1 "Diagnóstico Founder & Autoridade", questionário "Etapa 1 de 4" renderizado; nenhuma análise remota executada (página disponível ≠ diagnóstico homologado).
- Mobile 390px: captura e obrigado sem overflow-x (390 vs 390), sem pageerrors. Desktop sem overflow (1440 vs 1440).
- Falhas de rede atribuídas (não são bugs do app): `ERR_CERT_AUTHORITY_INVALID` só no host de tracking `gtm.growthag.com.br` (interceptação TLS do ambiente de QA); 404 em `chat-widget/public/config/6699…` (widget de chat pré-existente, funciona apesar disso); 401 em `challenges.cloudflare.com` (desafio bot de terceiros).
- Screenshots em `/tmp/qa-shots/`: desktop-captura, desktop-form-iframe, desktop-obrigado, desktop-acesso, desktop-score-founder, desktop-indice, mobile-captura, mobile-obrigado. Scripts de QA em `/tmp/qa_*.mjs`, `/tmp/qa_*.py` (fora do repo, reexecutáveis).

## 4. Clipping no GhlFormEmbed — hipótese encerrada

O diff não commitado em `src/components/shared/GhlFormEmbed.tsx` (registro tardio via `window.iFrameResize` + `scrolling="yes"`) foi avaliado contra a skill `ghl-funnel-iframe-debug`: é correção **do lado da página hospedeira** (handshake de altura cross-origin), sem tocar no widget interno — abordagem correta. É defensivo (no-op se o vendor ausente; `WeakSet` contra duplo registro) e o risco de reset das opções globais do vendor é baixo aqui (form e agenda nunca coexistem na mesma rota). Verificação ao vivo: iframe cresceu sozinho e o botão de submit está visível. **Patch considerado seguro; nenhum patch adicional aplicado.**

## 5. Divergências investigadas (documentação × produção × código)

1. **Destino do deploy (REQUER DECISÃO).** HEAD `6af8eb73` (dono, 14/11) fixou `npx wrangler deploy` (worker raiz) com motivo "env production ia para worker-sombra sem tráfego". O diff não commitado reverte para `npx wrangler deploy --env production` e o README afirma destino `revhackers-site-production` "confirmado pela API de Custom Domains". Evidência própria: produção serve o conteúdo novo (não identifica qual worker — sem acesso à API Cloudflare, sem tocar em secrets). **Não alterado; dono decide antes da próxima publicação.**
2. **Registry × cadastro (22 antigos).** `materialsData.ts` (HEAD) usa `revtech.notion.site/…`; `materials-registry.json` (HEAD) usa `bustling-lemon-68c…` (+1 `lp.revhackers.com.br`). Pré-existe no HEAD; o diff atual só acrescentou os 29. Impacto baixo: e-mails vivos usam `{{rh_site_base_url}}/materiais/acesso/{{rh_material_slug}}` (redirect → cadastro); o registry alimenta só a conciliação oFTw (`export-oftw-leads.mjs`, que por desenho regenera o registry a partir do cadastro). **Não regenerado sem decisão.**
3. **Contrato 14/11 ("não publicado") × README 15/11 ("publicado").** Resolvido por evidência: em 16/11 ~00:05 produção serve os 29 (bundle + imagens + rotas). O estado mudou após o contrato; o README estava certo quanto ao conteúdo live.
4. **Mapas 13 vs 11.** 13 URLs, 11 boards únicos (2 boards com 2 slugs). README correto em boards.
5. **`ghl_content_id`.** O contrato diz que o typo foi retirado da resposta GTM, mas o arquivo ainda o continha na linha 21 → corrigido (seção 6).
6. **Subheadline cortada no meio da palavra** ("…critérios de d") nas 29 landings → corrigido (seção 6).
7. **`FounderScore` não consome a query** (sem `useSearchParams`; `rh_diagnostic_type: 'founder'`) → pendência do dono Site-e-Blog/GTM, não desta frente.
8. **Skill ReachSales `reach-sales-pages-mock-audit` sugerida para o QA:** não aplicável — `handsup` não existe neste repo e ReachSales está fora do ecossistema REVTECH por regra do usuário. QA feito com o mecanismo real do repo (postMessage GHL).

## 6. Correções aplicadas nesta sessão (antes → depois)

1. `src/pages/MaterialLanding.tsx` — subheadline cortada no meio da palavra.
   - Antes: `foundMaterial.description.replace(/<[^>]*>/g, '').substring(0, 160)` → "…matriz de evidências, critérios de d".
   - Depois: helper `toSubheadline()` (limpa HTML, corta em fronteira de palavra, adiciona `…`) → "…matriz de evidências, critérios de…". Verificado no navegador após hot-reload.
2. `docs/content/laminas/L02–L29/material.json` (28 arquivos, untracked) — backfill de `notionId` + `link_material` a partir de `publicacao.json`, com assert de slug+título. Antes: só L01 tinha; depois: 29/29 completos (re-auditoria mecânica).
3. `docs/_integracao/MATERIAIS-OBRIGADO-RESPOSTA-GTM.md:21` — removido `ghl_content_id=<id>&` da query de exemplo, alinhando ao contrato forms-authority.
4. Reteste após as correções: handoff 4/4, `tsc --noEmit` exit 0, `npx vite build` ✓. Nenhum dos 4 diffs preexistentes foi tocado.

## 7. Separação exigida: simulado × real × workflow × caixa de destino

| Camada | Estado | Prova |
|---|---|---|
| Frontend simulado (navegação pós-submit, UTMs, e-mail privado, acesso, agenda) | VERIFICADO | `tests/material-handoff.test.tsx` 4/4 + navegador ao vivo (spoof rejeitado, redirect ao Notion) |
| Submissão real comprovada (contato criado no GHL S7HE) | NÃO FEITO (sem autorização) | nenhum teste de escrita executado |
| Workflow configurado e habilitado (`17af07f4-…`, trigger materiais, tags, template "[RH] \| Entrega de materiais") | DRAFT, não publicado (registro do contrato 14/11; sem acesso de escrita para revalidar, sem alteração) |
| Recebimento efetivo na caixa de destino | NÃO FEITO (sem autorização) | nenhum e-mail enviado |

**Gate exato de homologação restante:** 1 contato de teste controlado submetendo 1 material → contato visível no S7HE com `rh_material_slug` + tags `origem:revhackers`/`material-download` → workflow publicado dispara → e-mail recebido com link `/materiais/acesso/<slug>` funcional → ( Authority, dono GTM) `diagnostic_type='authority'` + laudo. **Plano mínimo:** dono autoriza por escrito (a) 1 endereço de teste, (b) publicar o workflow OU disparo manual único, (c) janela de teste; executor cria 1 contato, captura 3 provas (print GHL, e-mail recebido com headers, acesso via link do e-mail) e remove/anonimiza o contato de teste em seguida.

## 8. Git final (nada commitado, nada perdido)

- `git rev-parse HEAD` → `6af8eb730f28c0011de51af34990554e798a4f0b`; branch `giulliano-alves/Materiais-Ricos`.
- Tracked modificados (6): `.github/workflows/deploy-cloudflare.yml`, `docs/_integracao/MATERIAIS-OBRIGADO-RESPOSTA-GTM.md` (novo, correção §6), `scripts/ghl/materials-registry.json`, `src/components/shared/GhlFormEmbed.tsx`, `src/data/materialsData.ts`, `src/pages/MaterialLanding.tsx` (novo, correção §6).
- Untracked preservados: `CONCILIACAO-INPUT.md`, `docs/content/` (29 pastas L01–L29 + README + publicacao.json + este relatório), `public/uploads/laminas/` (31 PNGs: 29 originais + 2 da L01).
- Proibições respeitadas: sem reset/clean/rebase, sem sobrescrever/apagar, sem push/merge/deploy, sem outra worktree, sem tocar em outras frentes/clientes/agentes.

## 9. Próximos passos precisos (revisão 16/11)

1. Dono decide destino do deploy (§5.1) e autoriza (ou não) o teste controlado de e-mail (§7).
2. Se autorizado: executar o plano mínimo §7 e anexar as 3 provas a este relatório.
3. Frente Site-e-Blog/GTM: consumir query do handoff no `FounderScore` e gravar `diagnostic_type='authority'`.
4. Dono decide regeneração do registry para os 22 antigos (§5.2) e ajustes GHL ("Política", chat-widget 404).
5. Commitar em blocos separados quando o dono aprovar: (a) correções §6, (b) cadastro+registry dos 29, (c) patch GhlFormEmbed, (d) decisão de deploy — nunca `git add -A` cego.
