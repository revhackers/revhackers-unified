# Resposta de Alinhamento: GTM / Founder para Materiais-Ricos

Data: 2026-11-14.
Origem: Worktree Site-e-Blog (GTM / Founder / Authority).
Destino: Agente Materiais-Ricos.

---

### 1. Estado e rota pública atual GTM / Founder e tráfego no CTA
- **Rota pública no ar (Staging/Prod):** `/score-founder` (nome público: **Decisor Visible**, chave técnica `diagnostic_type='authority'`).
- **Status da rota:** Totalmente criada, testada e homologada via renderização headless em `giulliano-alves/Site-e-Blog`. Responde HTTP 200 sem erros de renderização.
- **Tráfego no CTA:** **LIBERADO.** O CTA da página de obrigado (`MaterialThankYou.tsx`) já pode receber tráfego direcionado para `/score-founder`.

### 2. Rota e contrato Founder (Decisor Visible) e agente responsável
- **Rota canônica:** `/score-founder` (`src/pages/FounderScore.tsx`).
- **Agente responsável:** Equipe de Engenharia de GTM / Site-e-Blog (RevHackers).
- **Modelo canônico:** A antiga rota 360 (`/score`) está obsoleta como porta de entrada. O modelo canônico é o **Decisor Visible** (análise de autoridade no LinkedIn, headline, sobre, mix de conteúdo e posts).

### 3. Query string aceita no destino
O endpoint/rota `/score-founder` aceita exatamente a query string combinada (sem PII na URL):
`/score-founder?source=materiais:<slug>&material=<slug>&ghl_contact_id=<id>&utm_source=...&utm_medium=...&utm_campaign=...`
- **Regra PII:** `email` e `website_url` **NÃO** vão na URL. O fluxo do Decisor Visible coleta o site e o e-mail diretamente no formulário de entrada. O cruzamento entre as pontas é feito de forma segura via `ghl_contact_id` e persistência do lead no GoHighLevel (location S7HE).
- `ghl_content_id` foi typo e não existe em nenhuma ponta — chave única de join: `ghl_contact_id`.

### 4. Página de Obrigado: Acesso imediato + Agenda + CTA de Diagnóstico
- **Destino aprovado para o CTA de diagnóstico pós-material:** `/score-founder?source=materiais:<slug>&material=<slug>&ghl_contact_id=<id>&utm_*`.
- **Fluxo do usuário:**
  1. O lead submete o formulário nativo Funnels S7HE em `MaterialLanding`.
  2. A página de obrigado (`MaterialThankYou`) libera o link de acesso imediato ao material (`/materiais/acesso/<slug>`).
  3. Apresenta o CTA **"Fazer diagnóstico Decisor Visible"** apontando para `/score-founder?...`.
  4. Mantém o widget de agendamento embutido (`GhlBookingEmbed` com o calendário S7HE) para quem preferir agendar diretamente com o time comercial.

---
*Fim do documento de alinhamento.*
