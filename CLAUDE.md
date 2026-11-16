# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Comandos Essenciais

```bash
npm run dev          # Servidor local Vite (porta 5173)
npm run build        # Build prod + prerender SSR (scripts/prerender.js)
npm run lint         # ESLint
npm run test         # Vitest (run once)
npm run test:watch   # Vitest (watch mode)
npm run test:e2e     # Playwright E2E
```

Para rodar um teste especifico: `npx vitest run src/path/to/file.test.ts`

Deploy via FTP Hostinger: `npm run deploy` (requer `.env` com credenciais FTP)

Testes unitarios (Vitest): `src/__tests__/**/*.spec.{ts,tsx}` | Testes E2E (Playwright): `tests/` (chromium, firefox, webkit)

CI: `.github/workflows/ci.yml` - TypeScript check + build em push para `develop` e `main`

**Scripts operacionais ClickUp (ad-hoc, nao sao npm scripts):**
```bash
node scripts/setup-clickup-templates.js    # semeia clickup_template_map com folder IDs dos templates
node scripts/register-clickup-webhook.js   # registra endpoint do clickup-sync na API ClickUp
```

---

## Variaveis de Ambiente

**Frontend (VITE_*):**
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` - obrigatorias
- `VITE_GHL_CLIENT_ID` - OAuth GoHighLevel
- `VITE_GHL_SALES_BOT_ID` / `VITE_GHL_CONTENT_BOT_ID` - chatbots GHL

**Edge Functions (server-side, configuradas no Supabase Dashboard):**
- `OPENAI_API_KEY` - geracao de planos
- `PSI_API_KEY` - PageSpeed Insights (analyze-site)

---

# RevHackers Growth Hub - Contexto do Projeto

## O que e este projeto

Ferramenta interna de onboarding, diagnostico e geracao automatica de planejamento estrategico para agencias de crescimento. O fluxo central e:

1. Cliente preenche o **REI** (Reuniao Estrategica Inicial) - formulario de kickoff
2. Sistema coleta transcricao da call (via Notion), analisa site e concorrentes
3. Edge Function `generate-strategic-plan` usa GPT-5.4 para gerar um plano estrategico JSON
4. Admin revisa e cliente ve o plano na `StrategicPlanPresentation`

**Stack:** React + Vite + TypeScript, Supabase (DB + Edge Functions), Tailwind CSS, shadcn/ui, Lucide icons.

---

## Regra de Diagramacao - IMUTAVEL

### Proibicao Total do Em Dash (traco longo)

- ❌ **PROIBIDO: Uso do caractere em dash (`\u2014`) em QUALQUER lugar do projeto**
- ❌ PROIBIDO em: frontend, edge functions, prompts de IA, artigos, materiais, planos estrategicos
- ❌ PROIBIDO em: comentarios de codigo, strings, templates, dados estaticos
- ✅ Usar hifen simples (`-`) como separador universal
- ✅ Usar dois pontos (`:`) para rotulos e titulos (ex: `Fase 1: Setup`)
- ✅ Usar ponto (`.`) ou virgula (`,`) para separar frases em descricoes
- ✅ Usar pipe (`|`) para separadores visuais em UI (ex: `Onboarding | Etapa 1`)

**Isso se aplica tambem a conteudo gerado por IA.** Todos os prompts de Edge Functions devem incluir instrucao explicita para NAO usar em dashes na resposta.

---

## REIs Existentes

| Tipo | Arquivo de Config | Proposito |
|---|---|---|
| `consulting` | `src/config/rei/consultingQuestions.ts` | Funil 360 completo |
| `founder` | `src/config/rei/founderQuestions.ts` | LinkedIn / Personal branding |
| `dev` | `src/config/rei/devQuestions.ts` | Sites e landing pages |
| `crm_ops` | Componentes `src/components/rei/steps/StepCrmOps1-5.tsx` | RevOps / CRM |

> **CRITICO:** `crm_ops` NAO esta em `REI_CONFIGS` (`src/config/rei/index.ts`). Ele usa campos com prefixo `revops_` em snake_case. Os demais usam camelCase sem prefixo. Isso e um problema arquitetural conhecido - nao criar novos REIs com nomenclatura inconsistente.

---

## Design System - Regras Imutaveis

O projeto segue o estilo **Nobibecode** - minimalista, monocromatico, tipografia pesada como elemento visual principal.

### Paleta de Cores

```
Fundo escuro (Cover/Accent):  bg-zinc-950
Fundo claro (Conteudo):       bg-white
Texto primario:               text-zinc-900 / text-black
Texto secundario:             text-zinc-500
Texto terciario:              text-zinc-400
Texto desativado:             text-zinc-300
Bordas:                       border-zinc-200 (light) | border-zinc-800 (dark)
Accent (unico permitido):     #00CC6A  <- usado com extrema parcimonia
```

### Regras de Cor

- ✅ zinc scale para tudo
- ✅ `#00CC6A` apenas para: badges de fase, destaques de KR, icones de terceiro pilar, accents de linha
- ❌ PROIBIDO: cores vibrantes (azul, laranja, roxo, vermelho como cor principal)
- ❌ PROIBIDO: gradientes de qualquer tipo
- ❌ PROIBIDO: background colorido em cards (exceto `bg-zinc-50` ou `bg-zinc-950`)
- ❌ PROIBIDO: texto colorido alem de zinc + `#00CC6A`

### Tipografia

```
Eyebrow labels:   text-[10px] uppercase tracking-[0.25em] font-black text-zinc-500
Titulos H1:       text-5xl md:text-7xl font-black tracking-tight leading-[1.05]
Titulos H2:       text-3xl md:text-[2.75rem] font-black tracking-tight leading-[1.05]
Titulos H3:       text-xl font-bold text-zinc-900
Body:             text-[15px] font-medium leading-relaxed text-zinc-500
Labels de dados:  text-xs font-black text-zinc-400 uppercase tracking-widest
Badges:           text-[10px] font-black uppercase tracking-widest
```

- ✅ `font-black` e o peso padrao para titulos - nao usar `font-bold` em H1/H2
- ✅ `tracking-tight` em titulos grandes
- ✅ `uppercase tracking-widest` apenas em labels/eyebrows
- ❌ PROIBIDO: font-size acima de `text-7xl`
- ❌ PROIBIDO: decoracoes de texto (underline colorido, text-shadow)
- ❌ PROIBIDO: misturar pesos diferentes no mesmo bloco sem hierarquia clara

### Espacamento Padrao

```
Padding de secao:   px-6 md:px-10 lg:px-14 py-8
Padding de conteudo: pb-14 pt-2 (apos header)
Gap entre cards:    gap-6 ou gap-8
```

### Componentes

**Cards light:**
```tsx
className="border border-zinc-200 rounded-2xl shadow-sm bg-white"
```

**Cards dark:**
```tsx
className="bg-zinc-950 rounded-2xl"
```

**Icones:**
```tsx
// Container
className="w-12 h-12 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-center"
// Icone dentro
className="w-5 h-5 text-zinc-900"
// Variante accent (ultimo pilar, destaque)
className="w-12 h-12 border border-[#00CC6A]/20 rounded-xl ... shadow-[0_0_15px_rgba(0,204,106,0.1)]"
```

**Badges de fase/ciclo:**
```tsx
className="text-[10px] font-black uppercase tracking-widest text-[#00CC6A] bg-[#00CC6A]/10 px-3 py-1.5 rounded-md inline-block"
```

**Divisores:**
```tsx
// Horizontal
className="w-[2px] h-10 bg-zinc-800"
// Linha decorativa
className="h-[3px] flex-1 bg-zinc-800 rounded-full"
```

**SectionHeader:** Sempre usar o componente `@/components/plan/SectionHeader` para cabecalhos de secao - nunca criar um novo. Props: `eyebrow`, `titleLine1`, `titleLine2?`, `description?`.

### O que nunca fazer em UI

- ❌ Nao criar elementos com `bg-blue-*`, `bg-purple-*`, `bg-orange-*`, `bg-red-*` como cores primarias
- ❌ Nao usar `shadow-lg` ou `shadow-xl` - maximo `shadow-sm`
- ❌ Nao criar novos componentes de header de secao - usar `SectionHeader`
- ❌ Nao usar `rounded-full` em cards/containers (apenas em dots de timeline e avatars)
- ❌ Nao adicionar animacoes de entrada/saida (sem framer-motion em paginas de plano)
- ❌ Nao usar emojis em UI - usar Lucide icons
- ❌ Nao criar botoes coloridos em telas de apresentacao ao cliente (apenas zinc ou white)
- ❌ **Nao usar o caractere em dash (`\u2014`) em NENHUM lugar - usar hifen simples (`-`)**

### Anti-Vibecode - Fugir do "AI Slop"

LLMs (Claude incluido) convergem por padrao para escolhas genericas de frontend - o que o mercado chama de "AI slop": fontes batidas, gradiente roxo em fundo branco, layout prontinho de SaaS generico. O Nobibecode existe justamente para fugir disso. Ao gerar ou revisar qualquer UI neste projeto:

- ❌ PROIBIDO: `Inter`, `Roboto`, `Arial` ou qualquer fonte de sistema generica. Este projeto usa `Plus Jakarta Sans` (`font-sans`), `Outfit` (`font-display`) e `JetBrains Mono` (`font-mono`) - nunca adicionar Inter de volta ao font stack nem a nenhum `@import`, mesmo que pareca inofensivo.
- ❌ PROIBIDO: gradiente de qualquer tipo (regra ja existente acima) - isso ja e a principal defesa do projeto contra o cliche "gradiente roxo em fundo branco". Se precisar de atmosfera/profundidade num fundo escuro, usar textura (grid tecnico sutil, ruido, linhas), nunca cor.
- ❌ PROIBIDO: paleta fora de zinc + `#00CC6A` (isso inclui `indigo`, `violet`, `purple`, `blue`, `lime` e qualquer outra cor do Tailwind default) - mesmo em telas internas/admin. Se precisar diferenciar semanticamente (status, prioridade, categoria), variar peso/opacidade do zinc antes de recorrer a outra cor.
- ❌ PROIBIDO: icone Lucide dentro de container generico `w-12 h-12 bg-zinc-50 border rounded-xl` sem nenhuma variacao - isso e a mesma composicao usada por 90% dos SaaS gerados por IA. Usar essa base apenas quando fizer sentido, mas variar borda/sombra/proporcao para o card ter identidade propria.
- ✅ Motion deve ser orquestrado, nao espalhado: preferir um page-load bem coreografado com stagger (`transition={{ delay: i * 0.05 }}`, como em `ComparisonSection.tsx`) a varias microinteracoes soltas sem coerencia entre si.
- ✅ Ao adicionar qualquer webfont novo, remover imediatamente o anterior se ele deixar de ser usado (nao deixar `@import` ou entrada em `fontFamily` mortos - eles pesam no load e reintroduzem fontes genericas por acidente em copy-paste futuro).
- ❌ PROIBIDO: badge/pill "eyebrow" generico - caixa `rounded-md`/`rounded-full` com borda, fundo escuro e texto mono uppercase dentro (com ou sem icone) usado como label acima de titulo. E o mesmo componente que aparece em praticamente todo SaaS gerado por IA. No lugar, usar um label sem caixa: texto mono uppercase com uma borda lateral de accent (`border-l-2 border-[#00CC6A] pl-3`) ou so o texto solto com `tracking-[0.2em]`.
- ❌ PROIBIDO: duas secoes de fundo escuro (`bg-black`, `bg-zinc-950`, `bg-zinc-900`) uma direto apos a outra na mesma pagina. Sempre intercalar com uma secao clara (`bg-white` ou `bg-zinc-50`) entre elas - cards escuros podem (e devem) continuar aparecendo como "ilha de accent" dentro de uma secao clara (ver "Cards dark" acima).
- ❌ PROIBIDO: grid de cards identicos (icone quadrado + badge numerado + titulo + descricao, todos com a mesma composicao) sem nenhum elemento de assinatura. Nao trocar o modelo de grid em si, mas sempre adicionar um detalhe que quebre a genericidade: numeral fantasma grande no fundo do card, marcadores de canto tipo prancheta tecnica (ver `CaseHero.tsx`), ou variacao de proporcao entre os cards - nunca deixar N cards visualmente indistinguiveis um do outro alem do conteudo.

---

## Arquitetura de Geracao do Plano

```
REI Responses (form data)
        |
generate-strategic-plan (Supabase Edge Function)
        | busca transcript no Notion (via email/empresa)
GPT-5.4 com prompt estruturado
        |
JSON: { summary, context_mirror, signals, risks, decisions,
        pillars, methodology_steps, roadmap_phases, okrs, onboarding_data }
        |
Salvo em strategic_plans.diagnostic_data (jsonb)
        |
StrategicPlanPresentation -> renderiza sections
```

**CRITICO - Deteccao de tipo CRM:** A edge function detecta CRM por string matching fragil:
```ts
const isCrmOps = objective?.includes('CRM') || objective?.includes('RevOps') || objective?.includes('Operacoes');
```
Isso e um bug conhecido. Nao criar logica que dependa de string matching para deteccao de tipo.

---

## Convencoes de Codigo

- Componentes de secao do plano ficam em `src/pages/client/sections/` (24 componentes, padrao `[Nome]Section.tsx`)
- Props padrao: `{ plan: any, client?: any }` - tipar mais estritamente ao refatorar
- Dados do plano acessados via: `plan.diagnostic_data`, `plan.roadmap_data`, `plan.okr_data`, `plan.onboarding_data`
- Campos do cliente: `client.company`, `client.logo_url`, `client.email`
- Sempre usar `|| []` e `|| {}` para fallback de dados da IA - o JSON pode ter campos ausentes
- Imports de icones: sempre de `lucide-react`, nunca instalar outras libs de icones
- **NUNCA hardcodar URLs/caminhos - usar `src/config/routes.ts` (APP_ROUTES) que define ~70+ rotas nomeadas**
- **NUNCA usar o caractere em dash (\u2014) em codigo, strings, comentarios ou conteudo**

### Estrutura de Config

```
src/config/
  routes.ts           - dicionario central de rotas (APP_ROUTES) - NUNCA hardcodar URLs
  constants.ts        - dominios, IDs de widget, numero WhatsApp
  onboardingTemplates.ts - 4 templates de onboarding: fullConsulting, crmOps, funnels/site, founder
  rei/                - configs de perguntas REI (ver secao REIs Existentes)
```

---

## Estrutura de Paginas e Rotas

O `App.tsx` define todas as rotas. As areas principais sao:

| Area | Prefixo | Acesso | Descricao |
|---|---|---|---|
| Publica | `/`, `/blog`, `/servicos`, `/cases`... | Publico | Site institucional |
| Decisor Visible / Lead | `/score-founder` (diagnostic_type='authority') | Publico | Diagnóstico canônico Decisor Visible (substitui rotas legadas `/score`, `/score-site`, `/score-revenue`) + motor GTM Blueprint (`growthmap/*`) |
| REI | `/rei/wizard`, `/rei/resultado/:id` | ProtectedRoute | Formulario interno de kickoff |
| Admin (GrowthHub) | `/admin/*` | ProtectedRoute | Dashboard operacional completo |
| Pipeline | `/admin/pipeline` | ProtectedRoute | Cockpit comercial / Revenue Cockpit |
| Client | `/plan/:token`, `/success/:token`, `/hub/:id` | Publico com token | Apresentacao do plano ao cliente |
| Deal Room | `/p/:slug` | Publico com slug | Proposta comercial em slides |

**ProtectedRoute** (`src/components/auth/ProtectedRoute.tsx`) lida com os roles: `super_admin`, `admin`, `user` (via `useAuth()`).

---

## Autenticacao e Roles

`src/contexts/AuthContext.tsx` e o provedor central. Suporta:
- OTP via email (`signIn`)
- Email + senha (`signInWithPassword`)
- Invite flow: usuario com `user_metadata.invited === true` e redirecionado para criar senha no primeiro acesso

Roles lidos da tabela `profiles` no Supabase (campo `role`).

**Importante:** `QueryClient` em `App.tsx` tem `refetchOnWindowFocus: false` e `refetchOnReconnect: false` para evitar perda de estado em formularios ao trocar de aba.

---

## Camadas de Dados

```
src/api/          -> Chamadas diretas ao Supabase (CRUD simples)
src/services/     -> Logica de negocio + orquestracao (ex: ReiScoringService, PipelineService)
supabase/functions/ -> Edge Functions Deno (AI, webhooks, integrações externas)
```

Hooks (`src/hooks/`) encapsulam react-query + chamadas de API. Ex: `useReiProjects`, `useReiResponses`.

Estado global: **Zustand** - unico store: `useOrqflow` (`src/store/useOrqflow.ts`) - gerencia tarefas com statuses `backlog | todo | doing | review | done | archived` e TimeLog. **React Query** para cache de servidor.

---

## Edge Functions

Todas compartilham CORS em `supabase/functions/_shared/cors.ts`.

| Grupo | Funcoes |
|---|---|
| AI / Geracao | `generate-strategic-plan`, `generate-success-plan`, `generate-playbook`, `generate-image`, `generate-project-tasks`, `enrich-strategic-data` |
| Analise | `analyze-site`, `analyze-meeting-transcript`, `analyze-diagnostic`, `research-intelligence`, `market-intelligence`, `inspect-website`, `crux-benchmark` |
| Reunioes | `transcribe-meeting`, `process-meeting-audio`, `google-meetings` |
| ClickUp | `clickup-orchestrator`, `clickup-sprint-orchestrator`, `clickup-provision`, `clickup-sync` |
| GoHighLevel | `ghl-webhook-handoff`, `ghl-outbound-relay`, `ghl-oauth-callback`, `ghl-oauth-refresh`, `ghl-create-location`, `ghl-deploy-strategy`, `ghl-inspect` |
| Pagamentos | `infinitepay-webhook`, `infinitepay-create-link` |
| Agentes AI | `agent-chat`, `agent-documents` |
| Enriquecimento | `trigger-post-rei-enrichment`, `auto-enrich-project`, `scrape-profile`, `fetch-cnpj` |
| Usuarios | `invite-member`, `delete-user` |

Observacao: `ghl-inspect` e uma ferramenta temporaria de introspecao manual do GHL (reconstrucao do fluxo em andamento).

---

## Integracao ClickUp (abril/2026)

Quando um projeto REI e provisionado, a edge function `clickup-provision` aplica uma state machine por cima do `rei_projects`:

```
idle -> pending -> folder_created -> metadata_set -> sprint_folder_created
     -> sprints_created -> tasks_created -> doc_created -> done  (ou failed)
```

Cada transicao e gravada em `clickup_provisioning_log` (auditoria, payload e erro). Em caso de falha, o projeto fica em `failed` com a mensagem em `rei_projects.provisioning_error`.

**Entrada de dados:**
- `rei_projects.type` define qual template usar (lookup em `clickup_template_map`).
- `rei_projects.duration_days` e um enum restrito: 30, 60, 90, 180 ou 360 dias (CHECK constraint). Determina quantidade de sprints.
- `rei_projects.tier` e derivado: `free` quando `type = 'consulting'` AND `duration_days <= 60` (add-on do plano anual); `paid` nos demais casos.

**Saida no ClickUp:**
- Folder por cliente em Space `90175101115` (RevHackers), ID salvo em `rei_projects.clickup_folder_id`.
- Sprint folder com N sprints em `clickup_sprints` (sprint_index, sprint_name, clickup_list_id, start_date, end_date).
- Doc de onboarding em `rei_projects.clickup_doc_id`.

**Webhook inverso:**
- `clickup-sync` recebe eventos do ClickUp (`taskStatusUpdated`, `taskCreated`, `folderDeleted`) e sincroniza de volta para o Hub. O secret do webhook fica em `clickup_config` (chave `webhook_secret`), mesmo valor do secret do Supabase.

**Seeds iniciais** (em `clickup_template_map`): `consulting`, `crm_ops`, `dev`, `founder` ja tem `folder_id_created` apontando para os folders template criados manualmente via ClickUp UI. Os campos `folder_template_id` e `sprint_template_id` precisam ser preenchidos apos o usuario salvar as pastas como template no ClickUp.

**Monitoria:**
- View `v_clickup_provisioning_status` agrega `rei_projects` + `clickup_sprints` + `strategic_plans` para dashboards (filtra `provisioning_state != 'idle'`).
- Componente `src/components/admin/ClickUpStatusWidget.tsx` assina Realtime em `rei_projects` e exibe o estado atual de provisionamento no admin.

---

## Tabelas Novas (abril/2026)

Referencia rapida das migracoes `20260415*` a `20260417*`.

**`client_accounts`** (`20260417*`): visao unificada do cliente entre GHL RevHackers e GHL Funnels.
- Chave: `client_email` (UNIQUE).
- Mapeamentos GHL: `revhackers_contact_id`, `revhackers_opportunity_id`, `funnels_contact_id`, `funnels_opportunity_id`.
- Flags e valores: `has_consulting`, `has_software`, `consulting_value`, `software_value`.
- Ciclo de vida: `consulting_start_date`, `consulting_end_date`, `software_activation_date`, `software_renewal_date`.
- Status: `consulting_status` (pending/active/completed), `software_status` (pending/onboarding/active/churn).
- Status atual: tabela criada, **sem integracao no frontend ainda** (ver Problema #6).

**`clickup_sprints`** (`20260416*`): uma linha por sprint criada no ClickUp. Chave composta `(rei_project_id, sprint_index)`.

**`clickup_provisioning_log`** (`20260416*`): audit trail da state machine. Campos: `from_state`, `to_state`, `payload` (jsonb), `error`, `duration_ms`.

**`clickup_template_map`** (`20260416*`): PK `rei_type`. Define `space_id`, `folder_template_id`, `sprint_template_id`, `folder_id_created` por tipo de REI.

**`clickup_config`** (`20260416*`): key-value global. Chaves conhecidas: `workspace_id`, `space_id_revhackers`, `space_id_funnels_cs`, `sprint_folder_template_id`, `webhook_secret`.

**Colunas novas em `rei_projects`** (`20260416*`): `duration_days`, `tier`, `clickup_space_id`, `clickup_folder_id`, `clickup_sprint_folder_id`, `clickup_doc_id`, `provisioning_state`, `clickup_provisioned_at`, `provisioning_error`.

---

## Problemas Arquiteturais Conhecidos (nao "corrigir" sem planejamento)

1. `crm_ops` fora do sistema `REIConfig` - campos com padrao diferente dos demais REIs.
   - Nota: existe um alias cosmetico em `src/config/rei/index.ts` (`crm_ops: consultingConfig`) apenas para satisfazer o typing de `REIType`. O wizard real de CRM continua usando `StepCrmOps1-5.tsx` standalone com campos `revops_*` em snake_case. O problema estrutural persiste.
2. `reiScoring.ts` usa `WizardData` desconectada dos REIs reais - scores no DB podem ser incorretos
3. Sem bloco universal de identificacao entre REIs - cada um tem campos de empresa/email diferentes
4. Schema de plano gerado e unico para todos os tipos - nao ha prompt especifico por REI type
5. `site` e `funnel` tem tipo em `REIType` mas sem config de perguntas dedicada
6. `client_accounts` existe no DB mas nao esta plugada no frontend. O fluxo de matching GHL RevHackers <-> GHL Funnels ainda nao foi implementado; a tabela serve hoje apenas como destino futuro para `ghl-webhook-handoff` / `ghl-outbound-relay`.
