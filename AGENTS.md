# Repository Guidelines

RevHackers is a B2B revenue consulting platform (PT-BR). React + TypeScript SPA frontend with Supabase, backed by a separate GCP Cloud Run Node.js API. Deployed to Hostinger (production) and Cloud Run (staging).

## Architecture & Data Flow

```
Browser → Vite SPA (React 18, react-router-dom v6)
         ├── Supabase (auth, DB, storage, edge functions)
         └── GCP Cloud Run API (api/) → PostgreSQL via Cloud SQL Connector
```

**Dual-backend pattern:** The frontend queries Supabase directly for most CRUD and reads GCP API adapters (`src/api/adapters/*-gcp.ts`) for services migrated off Supabase (AI, intelligence, scraper, growthmap, clients). Migration is incremental — both backends coexist.

**Frontend layers (top → bottom):**

1. **Pages** (`src/pages/`) — ~50 lazy-loaded routes grouped by domain: public, auth, admin, client, REI, platform
2. **Components** (`src/components/`) — feature-organized by domain (home/, blog/, cases/, admin/, rei/, shared/, ui/)
3. **State** — React Context for auth (`AuthContext`) and AI chat (`AIContext`); TanStack Query for server state via custom hooks (`src/hooks/`)
4. **API layer** (`src/api/`) — direct Supabase queries + GCP adapter modules
5. **Services** (`src/services/`) — complex business logic (PipelineService, ReiScoringService, StrategicEnrichmentService)
6. **Domain engines** (`src/lib/`) — pure logic without React deps (scoring, enrichment, scraping, CNPJ, funnels)
7. **Types** (`src/types/`) — domain interfaces (pipeline.ts, growthmap.ts, rei.ts) with validation functions
8. **Config** (`src/config/`) — constants, routes dictionary, REI scoring config, knowledge base, onboarding templates

**API backend layers** (`api/src/`):

1. **HTTP routes** (`http/*-routes.ts`) — Native Node.js HTTP handlers (no framework). Factory pattern `createXxxRoutes({ repository, ...deps })` returns `async (request: Request) => Promise<Response | null>` — `null` = route not matched, chain continues to 404. Zod validation
2. **Domains** (`domains/`) — Domain logic per entity (rei, clients, finance, intelligence, opportunities, growthmap, strategic-plans)
3. **Services** (`services/`) — Cross-cutting orchestration (transcription, analysis, calendar, GHL, lifecycle hooks)
4. **Identity** (`identity/`) — Provider-agnostic `TokenVerifier` interface; concrete impl is Google OIDC (jose + JWKS, RS256, issuer/audience checks). PostgreSQL-backed identity repository with `findOrCreateUser`
5. **Authz** (`authz/`) — Policy-based authorization: RBAC matrix for tenant roles (owner/admin/operator/client-link) and global roles (super_admin/admin/user), returns decision + audit event
6. **DB** (`db/`) — Raw PostgreSQL via `pg` (no ORM) + Cloud SQL Connector, `withTenantTransaction` for RLS-scoped operations
7. **Contracts** (`contracts/`) — Shared types: `ApiError` class with typed codes (unauthenticated/forbidden/not_found/validation/conflict/rate_limited/internal), identity, tenant, resource, audit
8. **Context** (`context/`) — Request context, idempotency (tenant-scoped SHA256 keys, replay detection), secret redaction for structured logging

## Key Directories

| Directory | Purpose |
|---|---|
| `src/pages/` | Route components (Index, Blog, Cases, Diagnostico, REI*, admin/, client/, public/, auth/) |
| `src/components/ui/` | shadcn/ui primitives (Button, Toaster, CommandPalette, ~55 components) |
| `src/components/shared/` | Cross-cutting: SEO (Helmet + Schema.org), ErrorBoundary, ChatbotManager, LeadCaptureModal |
| `src/components/admin/` | Admin forms: ProposalForm (75KB), PostForm, CaseForm, MaterialForm |
| `src/components/rei/` | REI wizard system: ReiDashboard, LeadWarRoomSheet, REIWizard, steps/ |
| `src/api/adapters/` | GCP API client adapters (`*-gcp.ts`) with shared `_base.ts` fetch wrapper |
| `src/services/` | Business services: PipelineService, ReiScoringService, StrategicEnrichmentService |
| `src/lib/` | Domain engines: reiScoring, cnpjEnrichmentEngine, websiteScraperEngine, funnelsAutomationEngine |
| `src/hooks/` | TanStack Query hooks: useREI, useCases, useMaterials, useClientAccount, useOpportunityIntelligence |
| `src/data/` | Static data: blogData.ts (485KB), materialsData, reiFormData, cases/ |
| `src/integrations/supabase/` | Supabase client singleton + generated types (123KB `types.ts`) |
| `api/src/http/` | GCP API route handlers (auth, lifecycle, finance, intelligence, rei, clients, opportunities) |
| `api/src/domains/` | Domain logic modules per entity |
| `supabase/migrations/` | ~105 SQL migration files (Dec 2024 – Jul 2026) |
| `api/db/migrations/` | GCP API's own PostgreSQL schema (0001–0018): identity, idempotency, growthmap, rei, intelligence, finance, meetings, ghl_events |
| `supabase/functions/` | 30 Supabase edge functions (AI, GHL, webhooks, scraping, media) |
| `scripts/` | 29 utility scripts (deploy, seed, OG generation, audit, data fixes) |
| `tests/` | Vitest unit tests (`api/`, `*.test.mjs`) + Playwright E2E (`*.spec.ts`) |
| `docs/` | PT-BR strategic docs, security audits, architecture, department reports |

## Development Commands

```bash
# Frontend
npm run dev              # Vite dev server on :8080
npm run build            # Production build (vite + OG image generation)
npm run build:offline    # Offline bundle (requires REVHACKERS_OFFLINE_* env vars)
npm run preview          # Preview production build

# API (separate package tree)
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

# Audit
npm run audit:supabase   # Check Supabase dependency baseline
```

## Code Conventions & Common Patterns

**Language:** PT-BR for all user-facing strings, test descriptions, doc comments, and documentation. Code identifiers remain in English.

**TypeScript:** Strict mode is OFF in `tsconfig.app.json` (relaxed for existing codebase). API uses stricter `tsconfig.build.json`. Path alias `@` → `./src` (configured in vite, tsconfig, and vitest).

**Component pattern:** shadcn/ui with `cva` (class-variance-authority) variants, `cn()` from `@/lib/utils` for class merging, `forwardRef` for DOM refs. Brand color: `#00CC6A` (go-green).

**Routing:** Flat `react-router-dom` v6 with `BrowserRouter`. Critical pages (Index, Blog, BlogPost, NotFound) imported eagerly; everything else lazy-loaded. `ProtectedRoute` wraps admin/REI routes checking `AuthContext` role.

**Data fetching:** TanStack Query with 5-minute `staleTime`. Hooks in `src/hooks/` wrap `useQuery`/`useMutation`. Mutations invalidate caches via `queryClient.invalidateQueries`.

**API adapter pattern** (`src/api/adapters/`): Each `*-gcp.ts` module exports functions that call `_base.ts` fetch wrapper with `VITE_GCP_API_URL`. Used for services migrated off Supabase.

**Service pattern** (`src/services/`): Classes encapsulating multi-step business logic (validation → DB write → side effects). Imported directly — no DI container.

**Error handling:** `ErrorBoundary` wraps route groups. `PageErrorBoundary` for individual pages. `main.tsx` has global crash prevention for Supabase auth token errors and chunk load failures (auto-reload with debounce).

**State management:** React Context for cross-cutting state (auth session, AI sidebar). Server state via TanStack Query. Single zustand store (`src/store/useOrqflow.ts`) for the Orqflow engine. No Redux.

**Tailwind:** Dark-first theme with CSS variables. Custom font sizes (4xs–reading), brand colors in `tailwind.config.ts`, `@tailwindcss/typography` for prose. Design tokens in `src/index.css`.

**API route pattern** (`api/src/http/`): Factories `createXxxRoutes({ repository, ... })` return a handler `(request: Request) => Promise<Response | null>`; handlers are chained in `main.ts` and unmatched routes fall through to 404. Auth via `AuthMiddleware` checking Bearer tokens.

**API authz** (`api/src/authz/policy.ts`): Policy functions check role, tenant membership, and resource ownership before allowing operations.

**Build chunking** (`vite.config.ts`): Manual chunks split vendor-react, vendor-supabase, vendor-ui, vendor-charts, vendor-editor, vendor-motion.

## Important Files

| File | Purpose |
|---|---|
| `src/main.tsx` | Entry point: crash protection, SEOProvider wrapper, root mount |
| `src/App.tsx` | Routing hub: ~50 routes, QueryClient, BrowserRouter |
| `src/contexts/AuthContext.tsx` | Auth state: Supabase session, user profile, role-based access (25KB) |
| `src/contexts/AIContext.tsx` | AI chat sidebar: agents, sessions, context-aware chat |
| `src/integrations/supabase/client.ts` | Supabase client singleton with typed schema |
| `src/integrations/supabase/types.ts` | Generated Supabase Database types (123KB) |
| `src/config/routes.ts` | Centralized route path dictionary (`APP_ROUTES`) |
| `src/config/constants.ts` | App config (`APP_CONFIG`: URLs, emails, widget IDs) |
| `src/api/adapters/_base.ts` | Shared fetch wrapper for GCP API calls |
| `src/components/shared/SEO.tsx` | Helmet-based SEO with Schema.org JSON-LD |
| `src/components/ui/button.tsx` | Button component with brand variants (accent, ghost-dark, outline-dark) |
| `api/src/main.ts` | API entry point: server bootstrap, route registration |
| `api/src/http/app.ts` | API app setup: middleware, route mounting |
| `api/src/authz/policy.ts` | Authorization policy engine |
| `api/src/identity/verifier.ts` | Provider-agnostic `TokenVerifier` interface + environment claim checks |
| `api/src/identity/google-identity-verifier.ts` | Google OIDC JWT verification (jose + JWKS) |
| `api/src/db/postgres.ts` | PostgreSQL connection pool (pg + Cloud SQL Connector), `withTenantTransaction` |
| `api/src/contracts/errors.ts` | `ApiError` class with typed codes → HTTP status mapping |
| `api/src/server.ts` | Node HTTP → Web Request/Response adapter, body parsing, graceful shutdown |
| `api/openapi.yaml` | OpenAPI 3.1 spec for GCP API contract |
| `supabase/config.toml` | Supabase local dev configuration |
| `vite.config.ts` | Vite config: SWC React, aliases, manual chunks, offline mode |
| `tailwind.config.ts` | Tailwind theme: custom colors, fonts, sizes, animations |
| `components.json` | shadcn/ui configuration (aliases, tailwind settings) |
| `.env.example` | Required env vars (Firebase Auth + GCP flags) |

## Runtime/Tooling Preferences

- **Node:** 22 (LTS). Used by Vite dev server, CI, Docker builds, and API runtime.
- **Package manager:** npm (not yarn/pnpm). `package-lock.json` committed. Two separate trees: root (`npm ci`) and `api/` (`npm ci --prefix api`).
- **Runtime:** Node.js for both frontend build tooling and API server. No Bun/Deno.
- **UI framework:** React 18 with SWC compiler (`@vitejs/plugin-react-swc`).
- **Component library:** shadcn/ui (Radix UI primitives + Tailwind). Do NOT install shadcn components from CLI — they are vendored in `src/components/ui/`.
- **No monorepo tooling** (no Turborepo/Nx/Lerna). Root and `api/` are independent npm projects.
- **Deployment:** Cloud Build → Docker → Cloud Run (staging). GitHub Actions → rsync over SSH to Hostinger (production, `.github/workflows/deploy-hostinger.yml`).

## Testing & QA

**Two test frameworks:**

- **Vitest** (v4.1.2) — unit and integration tests. jsdom environment, `globals: true`. Covers `src/**/*.{test,spec}.{ts,tsx}` and `tests/**/*.test.{js,mjs,ts,tsx}`.
- **Playwright** (v1.58.2) — E2E browser tests. `tests/*.spec.ts`. Chromium, Firefox, WebKit projects. Currently minimal (2 spec files).

**Test naming conventions:**
- Unit/integration: `*.test.ts` in `tests/api/`
- E2E: `*.spec.ts` in `tests/`
- Script tests: `*.test.mjs` in `tests/` (use `// @vitest-environment node`)

**API test pattern:** Route handlers tested directly with `new Request()` and mock repositories — no HTTP server spun up. Mock factories: `function createMockRepository()` returning `vi.fn()` objects.

```ts
// Example pattern from tests/api/ — the factory RETURN VALUE is the handler
const repo = createMockRepository();
const route = createREIRoutes({ repository: repo as any });
const response = await route(new Request('https://api.test/v1/rei/...', { method: 'GET' }));
expect(response?.status).toBe(200);
```

**Coverage:** Configured for `src/services/**`, `src/lib/**`, `src/utils/**`, `src/types/**` with text + json-summary reporters.

**CI pipeline** (`.github/workflows/ci.yml`): On push/PR to main: runs typecheck (frontend + API), unit tests, API build, frontend build. Node 22, `PUPPETEER_SKIP_DOWNLOAD=true`. Branch `develop` arquivada em `archive/develop-a940b6c` (OP-02 iii).
