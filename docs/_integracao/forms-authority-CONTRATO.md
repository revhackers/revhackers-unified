Status: CAPTURA E OBRIGADO TESTADOS LOCALMENTE — 2026-11-14. Alinhamento com o dono Founder/GTM registrado; diagnóstico NÃO homologado ponta a ponta e alterações NÃO publicadas.

## Atualização factual — 2026-11-14 (prevalece sobre estados históricos abaixo)

- Giulliano autorizou atualizar todos os materiais ricos para o formulário nativo atual, condicionado ao alinhamento da página de obrigado com os agentes de Founder/GTM.
- O domínio oficial `revhackers.com.br` ainda entrega a aplicação antiga de seis campos por uma borda HTTP `hcdn`; isso não comprova sozinho a origem da hospedagem. O Worker `revhackers-site` existe no Cloudflare e o staging `revhackers-site.revhackers.workers.dev` já mostra o formulário nativo `mJMtcwBd46xpqm9c2ABu`. Registro do domínio, DNS, CDN e origem são camadas distintas.
- A rota `/score-founder` existe na Site-e-Blog desde o commit `ca5857fd72c2afd0dc613d35845afadd4a0bdfbc`. A integração mínima dessa rota foi aplicada também nesta frente; isso comprova somente a disponibilidade da página, não o funcionamento dos serviços de diagnóstico.
- A resposta revisada do agente Site-e-Blog/GTM está em `Site-e-Blog/docs/_integracao/MATERIAIS-OBRIGADO-RESPOSTA-GTM.md`: ele confirmou ser dono de Founder/motor e reconheceu que `FounderScore.tsx` ainda usa `diagnostic_type: 'founder'` e `source: 'founder-score'` sem ler a query prometida. O typo `ghl_content_id` foi retirado da resposta. `/score-founder` é o destino alinhado; integração CRM/diagnóstico continua pendente do dono.
- Contrato de saída da captura: `/materiais/obrigado?m=<slug>` com somente os UTMs permitidos (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`). E-mail fica no estado privado da navegação para pré-preencher a agenda; não vai na URL.
- Obrigado: acesso imediato a `/materiais/acesso/<slug>`, próximo CTA `/score-founder` com `source=materiais:<slug>`, `material=<slug>` e os mesmos UTMs; agenda como alternativa acessível. Não afirmar que o e-mail foi entregue sem prova de envio.
- `ghl_contact_id` só pode ser encaminhado quando realmente disponível no fluxo. Não inferir um ID a partir de campos arbitrários do evento do widget; não inventar conciliação CRM. A identidade recebida por URL não comprova propriedade do contato.
- O workflow `17af07f4-c0f8-49c1-9c5c-c6ce69c6c9b6` foi salvo em DRAFT com o gatilho de materiais, tags `origem:revhackers` e `material-download` e o modelo pessoal `[RH] | Entrega de materiais`. Não houve publicação nem disparo real.
- Não foi feita publicação nem mudança de DNS. O fluxo Hostinger/FTP continua formalmente retirado e não foi reativado. A autorização de materiais não será interpretada como autorização para uma migração global: primeiro é necessário identificar com segurança o caminho atual entre domínio/CDN/origem e preservar o conteúdo já publicado no Worker compartilhado.
- As seções seguintes são registro da proposta de 13/11. Não usar estados antigos como prova atual de runtime, deploy ou homologação.

## Provas locais da atualização — 2026-11-14

- Worktree `Materiais-Ricos`, branch `giulliano-alves/Materiais-Ricos`, HEAD inicial `12495e68d2c738b08eea44e2edd7cefe6dca44b9`; mudanças desta atualização ainda sem commit.
- `npx vitest run tests/material-handoff.test.tsx`: 4 testes passaram. Cobrem origem maliciosa, mensagem de outro frame, navegação real da landing e do modal, e-mail privado no estado da navegação, UTMs, acesso ao material e agenda preenchida.
- Uma regressão falhou antes da correção: a limpeza do `GhlFormEmbed` retirava UTMs do destino após navegar. A limpeza agora só altera a URL da página original. O mesmo teste passou após a correção.
- `npx vite build`: concluído com sucesso. Isso não inclui os geradores adicionais de OG do comando `npm run build` nem comprova deploy ou envio de e-mail.
- Navegador Aside em `http://127.0.0.1:4192`: as 22 rotas do cadastro carregaram o mesmo formulário nativo, cada uma com `rh_material_slug` e `rh_material_title` correspondentes.
- Navegação no browser com evento sintético emitido pelo iframe real: destino `/materiais/obrigado`, cinco UTMs preservados, nenhum e-mail na URL, acesso ao material correto e CTA `/score-founder` com `source=materiais:<slug>`. A página de Founder renderizou o questionário; nenhuma análise remota foi executada.
- Não houve submissão real ao CRM, novo contato, agendamento, disparo, publicação de workflow, alteração de domínio ou reativação de backend.
- Inspeção somente leitura do apontamento: DNS público retorna `ns1.dns-parking.com`/`ns2.dns-parking.com` e `www` usa `cdn.hstgr.net`; a API Cloudflare consultada confirmou o Worker, mas não retornou uma zona/custom domain `revhackers.com.br` acessível. O painel Hostinger exigiu login. Origem atrás da borda: NÃO CONFIRMADA; não concluir que o domínio precisa ser migrado só por esses dados.
- Confirmação posterior no painel autenticado do Cloudflare, conta RevHackers → Worker `revhackers-site` → Domínios: URL `revhackers-site.revhackers.workers.dev` ativa, prévias ativas e tabela de domínios personalizados/rotas vazia (`Nenhum domínio personalizado`). A versão implantada exibida é `7fe88dce`. Isso confirma publicação do site no Worker, mas ausência de vínculo direto do domínio oficial nesse Worker. O registro do domínio pode permanecer na Hostinger; não é necessária transferência de registrador. Nenhuma configuração foi alterada.

## 0. Divergências encontradas na auditoria (leia primeiro)
- `FounderScore` existe como componente mas **não tem `<Route>` no `App.tsx`** da Site-e-Blog (`/score-founder` cai em `NotFound`). Rota será criada (Fase 0) — não aponte CTA para ela até a Fase 0 estar verde.
- `GhlFormEmbed`, `GHL_FORMS`, `MaterialThankYou`, `GhlBookingEmbed` existem **nesta worktree (Materiais-Ricos)**, não na Site-e-Blog. A ponte entre as worktrees será construída na Fase 5.
- `POST /v1/opportunities` descarta campos desconhecidos no topo do body (Zod sem `.strict`) — `diagnostic_type`, `source`, `website_url`, `linkedin`, `utm_*` precisam ir dentro de `responses` ou entrar no schema (Fase 1).
- `analyze-diagnostic` só aceita `growth|revenue|founder` — `authority` ainda é rejeitado (Fase 1).

## 1. Nomes oficiais (decisão 2026-11-13)

- Modelo LinkedIn (ex-"Authority"): nome público **Decisor Visible**. Chave técnica continua `diagnostic_type='authority'` (não trocar código agora; rename de schema entra nas Fases).
- Motor de plano (ex-"GrowthMap"/"thegrowthmap", vetado): nome público **GTM Blueprint**. Domínio `growthmap/*` continua interno até o rename.
- Proibido no público: "Authority", "Authority Engine", "thegrowthhub", "thegrowthmap", "GrowthHub", "360" como entrada.

## 2. Tipo canônico

- `diagnostic_type = 'authority'` (único aceito na integração; rótulo público: Decisor Visible).
- Proibido na entrada nova: `'growth'`, `'360'`, `'consulting-360'`.
- Rota Decisor Visible: `/score-founder` (`src/pages/FounderScore.tsx` da Site-e-Blog) — Fase 0 cria a rota.
- Rota obsoleta (não usar em CTA novo): `/score` 360 (`src/pages/GrowthScore.tsx`).

## 3. Mapa output → input (sem ruído)

Output forms (A — `MaterialLanding` → GHL location S7HE). Form enxuto com 3 campos: `full_name`, `email`, `company_name`. Sem `phone`, sem `website_url`, sem `linkedin_url` (site e LinkedIn são coletados no Authority).

| Output A | Input B (`submitPublicDiagnostic`) | Regra |
|---|---|---|
| `full_name` | `name` | obrigatório |
| `email` | `email` | chave 1 de conciliação (lowercase). NÃO vai na URL (PII); Authority pede de novo; join por `ghl_contact_id` + match |
| `company_name` | `company` | nome da empresa (o form usa `company_name`) |
| — | `website_url` | coletado NO Authority; normalizado via `normalizeWebsiteUrl`; chave 2 de conciliação |
| — | `linkedin_url` | coletado NO Authority; alimenta `analyzeFounderProfileAI` |
| `utm_source/medium/campaign` | `utm_*` | persistidos da sessão (commit `05f09b4`); repassados na query do CTA |
| `rh_material_slug` + origem `RH · Materiais Ricos` | `source='materiais:<slug>'` | origem rastreável; no GHL é campo `rh_material_slug` (+ `rh_material_title`), tags `origem:revhackers` + `material-download`. NÃO existe tag `source=materiais:<slug>` |
| `ghl_contact_id` | `ghl_contact_id` | passado na query do CTA; chave de join entre as pontas |
| `consent_at` | `consent_at` | LGPD |

Escrita Authority → GHL (lado B, após scoring): upsert no S7HE com `rh_diagnostic_type='authority'`, `rh_diagnostic_score` (número), `rh_diagnostic_category` (texto), join por `email`/`ghl_contact_id`.

Enriquecimento B após submit: `scrapeCompanyWebsite(website_url)` + `fetchCNPJData` + `analyzeFounderProfileAI` → `ReiDashboard` + `/success/:token` ou `/hub/:id`.

## 4. CTA pós-material (A → B)

`MaterialThankYou.tsx`: CTA **implementado e no ar no staging** (verificado 2026-11-13: `MaterialThankYou.tsx:82` aponta `Link to /score-founder?source=materiais:<slug>&material=<slug>`, rótulo público "Decisor Visible"; staging `revhackers-site.revhackers.workers.dev/score-founder` responde 200). **Pendente Fase 1:** acrescentar `&ghl_contact_id=<id>&utm_*` na query (hoje ausentes) para o join ponta a ponta. SEM `email`, SEM `website_url` na URL (PII). Destino final: `/score-founder?source=materiais:<slug>&material=<slug>&ghl_contact_id=<id>&utm_source/medium/campaign`.

## 5. Momento exato de conciliação (homologação)

Etapa homologada quando, para o mesmo contato:
1. (parte A) contato existe no GHL S7HE com campo `rh_material_slug=<slug>` + tags `origem:revhackers`, `material-download`;
2. (parte B) existe linha em `rei_responses` com `diagnostic_type='authority'` + contato no GHL com `rh_diagnostic_type='authority'` preenchido;
3. (parte B) `/success/:token` (ou `/hub/:id`) renderiza score + auditoria específica do site (pixels, UVP, social, gaps).

Prova: (1) print do contato GHL com `rh_material_slug`, (2) row da query + contato com `rh_diagnostic_*`, (3) screenshot do laudo. Sem os três, não homologa.

## 6. Mensagem ao outro agente (A)

Não mudar nomes de campo sem atualizar esta tabela. Não apontar CTA para `/score` (360). Qualquer divergência: falar nesta linguagem (`diagnostic_type`, `source`, `ghl_contact_id`) e travar o envio até conciliar.
