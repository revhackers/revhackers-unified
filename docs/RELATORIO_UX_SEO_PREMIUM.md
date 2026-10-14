# Relatório UX + SEO + GEO (antes/depois)

Branch: `giulliano-alves/rh-premium-ux-seo`. Base: `origin/main` do worktree. Escopo: melhorias pequenas e verificáveis, sem redesign, sem mudar identidade, sem tocar na lógica dos diagnósticos.

## 1. Método e limites da evidência

- Auditoria estática do código (rotas em `src/App.tsx`, `src/config/routes.ts`, componente `src/components/shared/SEO.tsx`, `index.html`, `public/robots.txt`, `public/sitemap.xml`, `public/.htaccess`, pipeline de build/deploy).
- Esta sessão não teve shell: nenhum comando (`npm ci`, `vitest`, `vite build`, Lighthouse, git commit/push) foi executado. Não há saída de Lighthouse, console ou verificador de links para anexar. Os comandos para gerar essas evidências estão na seção 6. Tudo abaixo marcado como "antes/depois" vem de leitura de código, não de medição.
- Os testes novos foram verificados apenas por conferência manual dos valores esperados contra o código (`tests/seo-policy.test.ts`); não foram executados.

## 2. Achados e correções (antes -> depois)

| # | Área | Antes (evidência em código) | Depois |
|---|------|-----------------------------|--------|
| 1 | Indexação de rotas privadas | Rotas sem `<SEO>` (painel, login, páginas por token, agradecimentos) herdavam title, canonical e `index` do `index.html`. `SEO.tsx` fixava `robots: index, follow` em todo uso. | `src/lib/seo.ts` define `isNoIndexPath` (fonte única, derivada de `src/config/routes.ts`). `SEO.tsx` emite `noindex, nofollow` nessas rotas e aceita prop `noindex`; `RouteSeo` (montado em `App.tsx`) cobre as rotas sem `<SEO>`. |
| 2 | Resultado de diagnóstico por lead | `/diagnostico/resultado/:id` e `/diagnostico/v2` usavam `<SEO>` sem canonical e com `index`: URL com nome de empresa elegível a indexação. | Cobertas por `isNoIndexPath`; também adicionadas ao `Disallow` do robots. Nenhum arquivo de lógica de diagnóstico alterado. |
| 3 | 404 | `NotFound` sem `<SEO>`, sem links úteis, `console.error` a cada acesso, título "404" sem contexto. O `.htaccess` devolve `index.html` com HTTP 200 para qualquer rota (soft 404). | `NotFound` com `<SEO noindex>`, h1 descritivo, links para home, booking, diagnósticos, serviços, metodologia e blog, sem `console.error`. O soft 404 de servidor continua (seção 5). |
| 4 | robots.txt | Três grupos (`Googlebot`, `Bingbot`, `*`) com listas diferentes. Um grupo por User-agent não herda o `*`, então Bingbot ficava sem vários bloqueios (por exemplo `/rei-dev`, `/signup`). Faltavam `/plan/`, `/success/`, `/p/`, `/public/`, `/upload-materiais/` etc. | Um único grupo `*` consolidado, mais `Twitterbot` e `facebookexternalhit` liberados para pré-visualização. Invariante testada: nenhuma URL do sitemap é bloqueada. |
| 5 | Diagnóstico -> resultado (trilha) | Cards da Central de Diagnósticos eram `div onClick={navigate}`: sem `<a href>`, não rastreáveis e inacessíveis por teclado. Os quatro diagnósticos não tinham link interno a partir do hub. | Cards viram `<Link>` com foco visível; títulos em `h2` (antes pulavam de `h1` para `h3`); breadcrumbs JSON-LD; link final para `/booking`. |
| 6 | Resultado -> CTA (trilha) | CTA "Agendar Diagnóstico" de `PublicDiagnosticResult` abria WhatsApp com número placeholder (`APP_CONFIG.WHATSAPP.DEFAULT_NUMBER` está marcado no código como placeholder). | CTA aponta para `/booking?company=<empresa>` (Booking já lê `company`); no resultado de demonstração vai para `/booking` sem empresa. Só o destino do botão mudou; cálculo e exibição do resultado intactos. |
| 7 | Title | Regra cortava em 57 caracteres + "..." no meio do texto e da marca. Títulos de blog com `<span>` embutido entravam crus no `<title>` e no `headline` do JSON-LD. | `buildSeoTitle`: remove HTML; mantém "Título \| RevHackers" se couber em 60; senão descarta a marca; só trunca em limite de palavra com "…". |
| 8 | Consistência home | `index.html` (e o H1 do hero) dizem "máquina de receita B2B com ABM e IA em 90 dias"; ao hidratar, `Index` sobrescrevia title/description/OG com outro posicionamento. | Title e description da home alinhados ao texto já existente no `index.html` e no hero. Nenhum texto novo inventado. |
| 9 | Open Graph / Twitter | Imagem padrão apontava para um JPEG externo de storage de terceiros. `index.html` sem `twitter:title`, `twitter:description` e `og:image:alt` (o script `generate-page-og-html.mjs` tenta substituir essas tags e não encontrava nada). | Imagem padrão `/og/home.png`; imagem dedicada por rota quando existe em `public/og/` (`resolveOgImage`); `og:image:alt` e tags twitter no shell e no componente. |
| 10 | Dados estruturados | `WebSite.potentialAction` (SearchAction) apontava para `/blog?q=`, parâmetro que `Blog.tsx` não lê. `BlogPosting.datePublished` caía em `new Date()` quando faltava data (data inventada). Autor "RevHackers" tipado como `Person`. | SearchAction removida; datas só quando existem; autor "RevHackers" vira `Organization`. |
| 11 | GEO: FAQ | `Index` enviava `FAQPage` JSON-LD com 3 perguntas que não apareciam na página (marcação sem conteúdo visível). `FAQSection` existia mas nunca era renderizada e continha afirmações numéricas sem fonte ("retorno médio de 5x", "30 a 45 dias"). | Fonte única `src/data/homeFaq.ts` alimenta o JSON-LD e o `FAQSection` visível (`<details>`, texto sempre no DOM). Afirmações numéricas sem fonte removidas do código morto. |
| 12 | GEO: crawlers sem JS | Shell sem conteúdo textual: crawler de IA sem JavaScript via página vazia. | `<noscript>` no `index.html` com h1, descrição existente e links para serviços, metodologia, diagnósticos, cases, blog, quem somos, booking. `public/llms.txt` com descrição e URLs (somente texto já presente no site). |
| 13 | Navegação / a11y | Botão do menu mobile sem `aria-label`/`aria-expanded`; `nav` sem rótulo; sem skip link; rodapé sem Metodologia, Blog, Materiais e "todos os diagnósticos"; texto do rodapé em `zinc-500`/`zinc-700` sobre preto (contraste abaixo de 4,5:1 para `zinc-700`). | `aria-label`, `aria-expanded`, `aria-controls`; `nav aria-label="Principal"`; skip link "Pular para o conteúdo" com `main#conteudo-principal`; links internos adicionados; texto do rodapé em `zinc-400`. |

## 3. Arquivos

Novos: `src/lib/seo.ts`, `src/components/shared/RouteSeo.tsx`, `src/data/homeFaq.ts`, `public/llms.txt`, `tests/seo-policy.test.ts`, este relatório.
Alterados: `index.html`, `public/robots.txt`, `src/App.tsx`, `src/components/shared/SEO.tsx`, `src/components/home/FAQSection.tsx`, `src/components/layout/{Header,Footer,PageLayout}.tsx`, `src/pages/{Index,Diagnostico,NotFound,PublicDiagnosticResult}.tsx`.
Não alterados: `public/sitemap.xml` (conferido por teste contra robots e noindex), qualquer lógica de score, análise, API ou Supabase.

## 4. Testes (affected)

`tests/seo-policy.test.ts` (Vitest): rotas privadas x públicas em `isNoIndexPath`, override de `getRobotsContent`, formato de `buildSeoTitle` (inclui truncamento em limite de palavra), `resolveOgImage`, e invariantes de artefato: nenhuma URL do `sitemap.xml` é `noindex` nem está bloqueada pelo grupo `*` do `robots.txt`. Nenhum teste existente foi removido. Status: escrito, não executado nesta sessão.

## 5. Riscos, pendências e itens que precisam de decisão do dono

- Soft 404: `public/.htaccess` serve `index.html` com HTTP 200 para qualquer caminho inexistente. O `noindex` da página 404 mitiga a indexação, mas o status HTTP correto exige lista de rotas válidas no servidor ou pré-render da 404. Não alterado (afeta o deploy).
- Sitemap estático: não lista `/blog/:slug`, `/cases/:slug`, `/materiais/:slug`. O gerador dinâmico existe em `scripts/prerender.js` (usa Supabase), mas o workflow de deploy roda só `vite build`. Gerar o sitemap com dados reais exige credenciais e decisão de pipeline. `lastmod` de todas as URLs é `2026-04-04` (estático).
- Build de produção: `npm run build` (com OG e HTML por rota) não é o comando usado nos workflows (`npx vite build`); logo `generate-page-og-html.mjs` não roda no deploy e o HTML por rota depende de Helmet após execução de JS.
- Afirmações institucionais sem evidência no repositório, mantidas sem alteração e para confirmação: "primeira consultoria de Revenue Operations do Brasil" (schema, Quem Somos), `priceRange: "$$$"`, `foundingDate`, `areaServed` com cidades, endereço e coordenadas no `LocalBusiness`, e resultados numéricos em `src/components/home/ServicesSection.tsx` ("3x mais respostas", "70% menos trabalho", prazos em dias). Dados estruturados e copy com números exigem fonte; recomenda-se validar ou remover.
- `index.html` tem `setInterval` de 200 ms mais `MutationObserver` global para remover widget de chat; custo de main thread contínuo. Não alterado por ser comportamento de proteção intencional.
- `og:image:width/height` fixos em 1200x630: conferir as dimensões reais dos PNGs em `public/og/`.
- Políticas de acesso de bots de IA no `robots.txt` (permitir/bloquear treinamento) é decisão do dono; hoje seguem o grupo `*` (permitido).

## 6. Como reproduzir a evidência (a executar por quem tem shell)

```bash
npm ci
npx vitest run tests/seo-policy.test.ts          # testes afetados
npx tsc -p tsconfig.app.json --noEmit             # tipos
npx eslint src/lib/seo.ts src/components/shared src/pages/NotFound.tsx src/pages/Diagnostico.tsx src/components/home/FAQSection.tsx
npx vite build && npx vite preview --port 4173 &
npx lighthouse http://localhost:4173/ --only-categories=seo,accessibility,best-practices,performance --output=json --output-path=./lh-home.json
npx lighthouse http://localhost:4173/diagnostico --only-categories=seo,accessibility --output=json --output-path=./lh-diagnostico.json
```

Console: abrir `/`, `/diagnostico`, `/score`, `/booking`, uma rota inexistente e conferir ausência de erros. Links: validar os `href` do rodapé, do hub de diagnósticos e do `noscript` do `index.html` (todos usam rotas existentes em `src/config/routes.ts`).

## 7. Aceite

- [x] Titles, meta, canonical, OG, robots, headings, links internos, dados estruturados e 404 revisados e corrigidos onde havia evidência.
- [x] Trilha site -> diagnóstico -> resultado -> CTA com links rastreáveis e CTA final para `/booking`.
- [x] Sem redesign, sem identidade nova, sem cases, depoimentos ou números inventados; nenhuma lógica de diagnóstico alterada.
- [ ] Evidência de Lighthouse, console e verificação de links: pendente de execução (seção 6).
- [ ] Testes executados, commit, push e PR: pendentes (sem shell nesta sessão).
