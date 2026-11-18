# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Comandos Essenciais

```bash
npm run dev          # Servidor local Vite (porta 8080)
npm run build        # Build prod + OG HTML por rota
npm run lint         # ESLint
npm run test         # Vitest (run once)
npm run test:watch   # Vitest (watch mode)
npm run test:e2e     # Playwright E2E
```

Para rodar um teste especifico: `npx vitest run src/path/to/file.test.ts`

Deploy: workflow manual "Deploy Cloudflare Workers (Revhackers Site)" a partir da main (PUBLICAR + motivo). Merge não publica.

Testes unitarios (Vitest): `src/**/*.{test,spec}.{ts,tsx}` e `tests/**/*.test.{js,mjs,ts,tsx}` | Testes E2E (Playwright): `tests/*.spec.ts`

CI: `.github/workflows/ci.yml` - TypeScript check (`npx tsc --noEmit -p tsconfig.app.json`), testes, build e validação do artefato em push e PR para `main`

---

## Variaveis de Ambiente

O build de produção não define variáveis VITE_* de Supabase, Firebase nem GCP. Ver .env.example.

---

# RevHackers Site-e-Blog - Contexto do Projeto

## O que e este projeto

RevHackers Site-e-Blog é o site público da consultoria RevHackers (PT-BR): SPA React + TypeScript (Vite) publicada como assets estáticos em Cloudflare Workers. O site não tem backend próprio: **Supabase está descontinuado e foi removido; não existe painel admin, backoffice, REI nem login.** **Funnels é outra coisa, separada deste site:** é a ferramenta de inbound, CRM, automações e e-mail marketing usada pela RevHackers. O site apenas embute formulários e calendários do Funnels (`src/components/shared/GhlFormEmbed.tsx`, `src/config/ghl.ts`; "Ghl" nesses nomes é a infraestrutura técnica do Funnels, não uma marca) e entrega o lead; o que acontece depois do envio é configurado no Funnels, fora deste repositório. Não reintroduzir `@supabase/supabase-js`, `src/integrations/supabase`, nem rotas `/admin`, `/rei*`, `/login`.

**Stack:** React + Vite + TypeScript, Tailwind CSS, shadcn/ui, Lucide icons.

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

**Isso se aplica tambem a conteudo gerado por IA.** Qualquer prompt de IA deve incluir instrucao explicita para NAO usar em dashes na resposta.

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

## Convencoes de Codigo

- Imports de icones: sempre de `lucide-react`, nunca instalar outras libs de icones
- **NUNCA hardcodar URLs/caminhos - usar `src/config/routes.ts` (APP_ROUTES) que define as rotas nomeadas**
- **NUNCA usar o caractere em dash (\u2014) em codigo, strings, comentarios ou conteudo**

### Estrutura de Config

```
src/config/
  routes.ts           - dicionario central de rotas (APP_ROUTES) - NUNCA hardcodar URLs
  constants.ts        - dominios, IDs de widget, numero WhatsApp
```

---

## Estrutura de Paginas e Rotas

O `App.tsx` define todas as rotas. As areas principais sao:

| Area | Prefixo | Acesso | Descricao |
|---|---|---|---|
| Publica | `/`, `/blog`, `/servicos`, `/cases`... | Publico | Site institucional |
| Score/Lead | `/score`, `/score-site`, `/score-founder`, `/score-revenue` | Publico | Quiz de maturidade (lead gen) |
| REI | `/rei/wizard`, `/rei/resultado/:id` | ProtectedRoute | Formulario interno de kickoff |
| Admin (GrowthHub) | `/admin/*` | ProtectedRoute | Dashboard operacional completo |
| Pipeline | `/admin/pipeline` | ProtectedRoute | Cockpit comercial / Revenue Cockpit |
| Client | `/plan/:token`, `/success/:token`, `/hub/:id` | Publico com token | Apresentacao do plano ao cliente |
| Deal Room | `/p/:slug` | Publico com slug | Proposta comercial em slides |

**ProtectedRoute** (`src/components/auth/ProtectedRoute.tsx`) lida com os roles: `super_admin`, `admin`, `user` (via `useAuth()`).
