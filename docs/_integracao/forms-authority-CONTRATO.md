Status: PROPOSTA — corrigido após auditoria 2026-11-13. NÃO homologado, NÃO ativo.

## 0. Divergências encontradas na auditoria (leia primeiro)
- `FounderScore` existe como componente mas **não tem `<Route>` no `App.tsx`** (`/score-founder` cai em `NotFound`). Rota precisa ser criada (Fase 0).
- `GhlFormEmbed`, `GHL_FORMS`, `MaterialThankYou`, `GhlBookingEmbed` **não existem nesta worktree** — pertencem à worktree Materiais-Ricos. O fluxo desta worktree usa `DownloadForm`. A ponte entre as duas ainda será construída (Fase 5).
- `POST /v1/opportunities` usa Zod `.object` sem `.strict()`: campos `diagnostic_type`, `source`, `website_url`, `linkedin`, `utm_*` **no topo do body são descartados** — precisam ir dentro de `responses` ou entrar no schema (Fase 1).
- `analyze-diagnostic` só aceita `type: growth|revenue|founder` — `authority` é rejeitado (Fase 1). `publicDiagnostic.ts` não tem chave `authority` (cai em `consulting`).
- `analyzeFounderProfileAI` retorna **mock em caso de erro** — nunca apresentar como laudo real (Fase 3).
- `impactBrl` e `Founder Index (n=184)` são números sem fonte — proibido usar como prova.

## 1. Nomes oficiais (decisão 2026-11-13)

- Modelo LinkedIn (ex-"Authority"): nome público **Decisor Visible**. Chave técnica continua `diagnostic_type='authority'` (não trocar código agora; rename de schema entra nas Fases).
- Motor de plano (ex-"GrowthMap"/"thegrowthmap", vetado): nome público **GTM Blueprint**. Domínio `growthmap/*` continua interno até o rename.
- Proibido no público: "Authority", "Authority Engine", "thegrowthmap", "GrowthHub", "360" como entrada.

## 2. Tipo canônico

- `diagnostic_type = 'authority'` (único aceito na integração; rótulo público: Decisor Visible).
- Proibido na entrada nova: `'growth'`, `'360'`, `'consulting-360'`.
- Rota Decisor Visible: `/score-founder` (`src/pages/FounderScore.tsx`) — Fase 0 cria a rota.
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

`MaterialThankYou.tsx` ("Agendar diagnóstico" via `GhlBookingEmbed`): quando a Fase 0 estiver verde, destino = `/score-founder?source=materiais:<slug>&material=<slug>&ghl_contact_id=<id>&utm_source/medium/campaign`. SEM `email`, SEM `website_url` na URL (PII). Até o aviso de Fase 0 verde, CTA não é tocado (resposta A condicionada).

## 5. Momento exato de conciliação (homologação)

Etapa homologada quando, para o mesmo contato:
1. (parte A) contato existe no GHL S7HE com campo `rh_material_slug=<slug>` + tags `origem:revhackers`, `material-download`;
2. (parte B) existe linha em `rei_responses` com `diagnostic_type='authority'` + contato no GHL com `rh_diagnostic_type='authority'` preenchido;
3. (parte B) `/success/:token` (ou `/hub/:id`) renderiza score + auditoria específica do site (pixels, UVP, social, gaps).

Prova: (1) print do contato GHL com `rh_material_slug`, (2) row da query + contato com `rh_diagnostic_*`, (3) screenshot do laudo. Sem os três, não homologa.

## 6. Mensagem ao outro agente (A)

Não mudar nomes de campo sem atualizar esta tabela. Não apontar CTA para `/score` (360). Qualquer divergência: falar nesta linguagem (`diagnostic_type`, `source`, `ghl_contact_id`) e travar o envio até conciliar.
