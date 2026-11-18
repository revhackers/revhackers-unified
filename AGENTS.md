# Repository Guidelines

RevHackers Site-e-Blog é o site público da consultoria RevHackers (PT-BR): SPA React + TypeScript (Vite) publicada como assets estáticos em Cloudflare Workers. O site não tem backend próprio: **Supabase está descontinuado e foi removido; não existe painel admin, backoffice, REI nem login.** **Funnels é outra coisa, separada deste site:** é a ferramenta de inbound, CRM, automações e e-mail marketing usada pela RevHackers. O site apenas embute formulários e calendários do Funnels (`src/components/shared/GhlFormEmbed.tsx`, `src/config/ghl.ts`; "Ghl" nesses nomes é a infraestrutura técnica do Funnels, não uma marca) e entrega o lead; o que acontece depois do envio é configurado no Funnels, fora deste repositório. Não reintroduzir `@supabase/supabase-js`, `src/integrations/supabase`, nem rotas `/admin`, `/rei*`, `/login`.

## Architecture & Data Flow

`Browser → SPA estática (Cloudflare Workers)`. Conteúdo (blog, cases, materiais) vem de arquivos do repositório. Formulários e calendários são iframes do Funnels; o site não guarda lead nem dispara automação. O diretório `api/` e os adapters `src/api/adapters/*-gcp.ts` são legado GCP: não fazem parte do runtime de produção (o build de deploy não define `VITE_GCP_*`).

**Camadas do frontend (de cima para baixo):**

1. **Pages** (`src/pages/`): só páginas públicas, todas lazy-loaded exceto a Home.
2. **Components** (`src/components/`): organizados por domínio (home/, blog/, cases/, scores/, shared/, ui/).
3. **State**: TanStack Query para estado de servidor; hooks em `src/hooks/`.
4. **API layer** (`src/api/`): leitura de dados locais (`cases.ts`) e adapters GCP inertes.
5. **Domain engines** (`src/lib/`): lógica pura sem React (CNPJ).
6. **Types** (`src/types/`): interfaces de domínio.
7. **Config** (`src/config/`): constantes, dicionário de rotas, IDs dos formulários do Funnels.

## Key Directories

| Directory | Purpose |
|---|---|
| `src/pages/` | Rotas públicas (Index, Blog, Cases, Materiais, Diagnostico, scores, Booking) |
| `src/components/ui/` | Primitivos shadcn/ui |
| `src/components/shared/` | Transversais: SEO (Helmet + Schema.org), ErrorBoundary, ChatbotManager, GhlFormEmbed |
| `src/api/adapters/` | Adapters GCP legados (`*-gcp.ts`) com wrapper `_base.ts` |
| `src/lib/` | Engines de domínio (cnpjEnrichmentEngine) |
| `src/hooks/` | Hooks (useAiInvoke, use-toast) |
| `src/data/` | Dados estáticos: blogData.ts, materialsData, cases/ |
| `api/` | API GCP legada (fora do runtime de produção) |
| `scripts/` | Utilitários de build, OG, validação de artefato |
| `tests/` | Testes Vitest (`api/`, `*.test.mjs`, `*.test.tsx`) + Playwright (`*.spec.ts`) |
| `docs/` | Docs estratégicos em PT-BR, auditorias, arquitetura |

## Development Commands

```bash
# Frontend
npm run dev              # Vite dev server on :8080
npm run build            # Production build (vite + OG image generation)
npm run build:offline    # Offline bundle (requires REVHACKERS_OFFLINE_* env vars)
npm run preview          # Preview production build

# API legada (separate package tree)
npm run build:api        # TypeScript compile api/src → api/dist
npm run typecheck:api    # Strict typecheck (tsc -p api/tsconfig.json)
npm run start:api        # Run compiled API (node api/dist/main.js)

# Testing
npm test                 # Vitest unit tests (run once)
npm run test:watch       # Vitest watch mode
npm run test:api         # API-specific tests (vitest run tests/api)
npm run test:e2e         # Playwright E2E (npx playwright test)

# Quality
npm run lint             # ESLint (typescript-eslint + react-hooks + react-refresh)
npx tsc --noEmit -p tsconfig.app.json   # Typecheck do frontend (o mesmo do CI)
```

## Code Conventions & Common Patterns

**Language:** PT-BR for all user-facing strings, test descriptions, doc comments, and documentation. Code identifiers remain in English. Texto visível sem travessão (U+2014) nem meia-risca (U+2013): `tests/sem-travessao.test.mjs` falha se aparecerem em `src/`.

**TypeScript:** Strict mode is OFF in `tsconfig.app.json` (relaxed for existing codebase). API uses stricter `tsconfig.build.json`. Path alias `@` → `./src` (configured in vite, tsconfig, and vitest).

**Component pattern:** shadcn/ui with `cva` (class-variance-authority) variants, `cn()` from `@/lib/utils` for class merging, `forwardRef` for DOM refs. Brand color: `#00CC6A` (go-green).

**Routing:** Flat `react-router-dom` v6 with `BrowserRouter`; todas as páginas, exceto a Home, carregam sob demanda. URLs desconhecidas caem em `NotFound`.

**Data fetching:** TanStack Query with 5-minute `staleTime`.

**Error handling:** `ErrorBoundary` wraps routes. `PageErrorBoundary` for individual pages. `main.tsx` has global crash prevention for chunk load failures (auto-reload with debounce).

**Tailwind:** Theme with CSS variables. Custom font sizes (4xs–reading), brand colors in `tailwind.config.ts`, `@tailwindcss/typography` for prose. Design tokens in `src/index.css`.

**Build chunking** (`vite.config.ts`): Manual chunks split vendor-react, vendor-ui, vendor-charts, vendor-motion.

## Important Files

| File | Purpose |
|---|---|
| `src/main.tsx` | Entry point: crash protection, SEOProvider wrapper, root mount |
| `src/App.tsx` | Routing hub: rotas públicas, QueryClient, BrowserRouter |
| `src/config/routes.ts` | Centralized route path dictionary (`APP_ROUTES`) |
| `src/config/constants.ts` | App config (`APP_CONFIG`: URLs, emails, widget IDs) |
| `src/config/ghl.ts` | IDs dos formulários e calendários embutidos do Funnels |
| `src/components/shared/GhlFormEmbed.tsx` | Iframe de formulário do Funnels |
| `src/components/shared/SEO.tsx` | Helmet-based SEO with Schema.org JSON-LD |
| `src/components/ui/button.tsx` | Button component with brand variants |
| `scripts/generate-page-og-html.mjs` | Gera HTML por rota com metadados OG, roda depois do build |
| `scripts/validate-deploy-artifact.mjs` | Valida o `dist/` (segredos, arquivos obrigatórios) antes do deploy |
| `vite.config.ts` | Vite config: SWC React, aliases, manual chunks, offline mode |
| `tailwind.config.ts` | Tailwind theme: custom colors, fonts, sizes, animations |
| `components.json` | shadcn/ui configuration (aliases, tailwind settings) |
| `.env.example` | Variáveis de ambiente (nenhuma é usada pelo build de produção) |

## Runtime/Tooling Preferences

- **Node:** 22 (LTS). Used by Vite dev server, CI and build.
- **Package manager:** npm (not yarn/pnpm). `package-lock.json` committed. Two separate trees: root (`npm ci`) and `api/` (`npm ci --prefix api`).
- **UI framework:** React 18 with SWC compiler (`@vitejs/plugin-react-swc`).
- **Component library:** shadcn/ui (Radix UI primitives + Tailwind). Do NOT install shadcn components from CLI, they are vendored in `src/components/ui/`.
- **No monorepo tooling** (no Turborepo/Nx/Lerna). Root and `api/` are independent npm projects.
- **Deployment:** somente pelo workflow manual "Deploy Cloudflare Workers (Revhackers Site)" (`.github/workflows/deploy-cloudflare.yml`, `workflow_dispatch` com `PUBLICAR` + motivo), sempre a partir da `main`. Merge não publica. O deploy substitui o site inteiro pela ref escolhida: trabalho que não está na `main` sai do ar no deploy seguinte.

## Testing & QA

**Two test frameworks:**

- **Vitest**: unit and integration tests. jsdom environment, `globals: true`. Covers `src/**/*.{test,spec}.{ts,tsx}` and `tests/**/*.test.{js,mjs,ts,tsx}`.
- **Playwright**: E2E browser tests. `tests/*.spec.ts`. Currently minimal (`tests/example.spec.ts`).

**Test naming conventions:**
- Unit/integration: `*.test.ts(x)` in `tests/` and next to the code in `src/`
- API legada: `*.test.ts` in `tests/api/`
- E2E: `*.spec.ts` in `tests/`
- Script tests: `*.test.mjs` in `tests/` (use `// @vitest-environment node`)

**CI pipeline** (`.github/workflows/ci.yml`): On push/PR to main: typecheck do frontend (`npx tsc --noEmit -p tsconfig.app.json`), typecheck e build da API legada, testes unitários, build do frontend e validação do artefato (`scripts/validate-deploy-artifact.mjs`). Node 22, `PUPPETEER_SKIP_DOWNLOAD=true`. Branch `develop` arquivada em `archive/develop-a940b6c` (OP-02 iii).
