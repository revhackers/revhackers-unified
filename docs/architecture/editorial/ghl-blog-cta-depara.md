# Proposta De-Para: Blog CTAs, Analytics & GHL (Gate B1A) [PROPOSAL]

> **Status:** Documento de Proposta Arquitetural (PROPOSAL). Afirmações sobre comportamento GHL, automações, LGPD ponta a ponta, UTMs, DND e IDs de subconta são **NÃO CONFIRMADOS** por falta de evidência direta no código fonte deste repositório, exceto quando explicitamente mapeados em componentes específicos de UI.

## 1. Princípios de Governança: Política vs. Evidência em Código
- **Evidência em Código (`BlogPostContent.tsx`)**: O componente renderiza links para a rota canônica Decisor Visible (`/score-founder`, `diagnostic_type='authority'`) ou modais de material, sem chamadas API diretas de criação de contato na montagem da página.
 
 ## 2. Tabela De-Para: Mapeamento e Evidência Restrita
 | Página / Componente | Caminho em Código (`src/...`) | CTA / Ação | Destino / Destino GHL | Status de Evidência e Validação |
 | :--- | :--- | :--- | :--- | :--- |
| `BlogPost` / `BlogPostContent` | `components/blog/post/BlogPostContent.tsx` | "Agendar Diagnóstico" | Rota `/score-founder` (Decisor Visible) / Widget externo | **Evidência Parcial (UI)**: O link aponta para `/score-founder` (`diagnostic_type='authority'`). Rastreamento UTM end-to-end, IDs de calendário GHL e DND: **NÃO CONFIRMADO**. |
| `BlogPost` / `MaterialModal` | `components/shared/MaterialModal.tsx` | "Baixar Material / Framework" | Modal de captura local | **Evidência Parcial (UI)**: UI presente. Validação de checkbox obrigatório LGPD e tag `material-delivery` no backend GHL: **NÃO CONFIRMADO**. |
| `BlogHeader` / `Blog` | `pages/Blog.tsx` | "Buscar Artigos" / Filtros | Filtragem em memória (SPA) | **Evidenciado em Código**: Filtros locais implementados. |
| `BlogPostFooter` | `components/blog/post/BlogPostFooter.tsx:9-24,26-105` | Compartilhar / seguir redes | Links sociais | **Evidenciado em código**: compartilhamento e perfis sociais. Newsletter não foi encontrada neste componente; a afirmação anterior de widget foi incorreta. |

## 3. Conclusão de Auditoria
Qualquer afirmação sobre automações ativas, tagueamento de leads no GHL ou conformidade jurídica ponta a ponta permanece **NÃO CONFIRMADA** até auditoria específica na worktree/módulo de automações GHL.
