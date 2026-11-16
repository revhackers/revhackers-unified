> **ARQUIVADO (Novembro 2026):** Handoff contendo rotas e referências legadas. O padrão canônico atual é o Decisor Visible (`diagnostic_type='authority'`) + GTM Blueprint (`growthmap/*`).

 # Handoff B1A.4: Integração Editorial OS 0.5.2 (ChatGPT Nativizado) & Site RevHackers

## 1. Contexto e Decisão Arquitetural
- **Operação do Editorial OS**: Funciona nativamente no ChatGPT via skills e artefatos interativos na conversa, sem dependência de servidor MCP remoto, túnel, Google Drive ou Python no Mac para o usuário final.
- **Ausência de Contrato de Exportação**: O contrato final de exportação automática de artigos do ChatGPT para o site **ainda não existe**. 
- **Autoridade P5**: P3/P5 são aprovações humanas explícitas na conversa, mas **NÃO** geram atestado criptográfico autenticado P5 para o site. É terminantemente proibido inferir `APPROVED`, `claimsVerified = true` ou autorização de publicação a partir de textos, hashes ou artefatos gerados pelo ChatGPT sem verificação e gate humano independente no repositório.

## 2. Inventário de Fontes Reais de Artigos no Site
1. **Dados Estáticos Canônicos**: `src/data/blogData.ts` (armazém principal de artigos estruturados do blog).
2. **Componentes TSX Customizados**: 33 componentes estáticos localizados em `src/components/blog/post/articles/` (mapeados por slug estrito em `BlogPostContent.tsx`).
3. **Motor Markdown / Bloco Rico**: `src/components/blog/ArticleRenderer.tsx` (parser de blocos especiais `[TAKEAWAYS]`, `[BLUEPRINT]`, `[STACK]`, `[REDFLAGS]`, `[STEPS]`, `[INFO]`, com sanitização DOMPurify).
4. **Rotas e Páginas**:
   - Listagem: `/blog` (`src/pages/Blog.tsx`)
   - Detalhe: `/blog/:slug` (`src/pages/BlogPost.tsx`)
   - Componente de Conteúdo: `src/components/blog/post/BlogPostContent.tsx`
5. **CTAs e Conversão**:
   - Redirecionamentos para rotas de score (`/score`, `/score-revenue`, `/score-site`, `/score-founder`) e modais de materiais (`MaterialModal.tsx`).

## 3. Contrato Mínimo de Passagem Manual de Artefato (B1A.4)
Para a transição de um artigo gerado pelo ChatGPT para o repositório, aplica-se o seguinte **fluxo manual restrito**:
1. **Geração no ChatGPT**: O usuário exporta o artigo revisado (Markdown + frontmatter estrito).
2. **Submissão via Pull Request (GitHub)**: O artefato é inserido na branch do site para revisão estritamente humana (Gate E).
3. **Validação Fail-Closed**:
   - `published` deve ser explicitamente `true` (padrão `false`).
   - `editorialApprovalStatus` é fixado como `LEGACY_UNVERIFIED` ou `PENDING_REVIEW` por padrão até validação por PR.
   - `claimsVerified` é fixado como `false` por padrão.
   - Nenhuma chave de API, OAuth do Google ou automação de banco de dados é acionada.

## 4. GHL Handoff: Governança de Conversão
- **Clique $\neq$ Agendamento**: Um clique em CTA de agendamento (`/score`) gera evento analítico, mas não cria oportunidade comercial.
- **Download $\neq$ Oportunidade**: O download de material rico (`MaterialModal`) captura interesse (hand-raiser), mas não injeta lead qualificado sem consentimento LGPD verificado.
- **UTMs & DND**: Parâmetros de campanha e diretrizes de privacidade são preservados sem pressupor automações live não auditadas na worktree de automações.

## 5. Riscos e Integrações Proibidas (Até Nova Diretriz)
- **Proibido**: Conectar o site diretamente ao Google OAuth, Google Drive ou APIs de automação do Editorial OS.
- **Proibido**: Automatizar a publicação de artigos por webhooks sem revisão por Pull Request.
- **Proibido**: Atribuir status `APPROVED` ou claims automáticos a textos gerados por IA.
