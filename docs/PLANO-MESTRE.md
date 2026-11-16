# Plano mestre — RevHackers (Decisor Visible + GTM Blueprint)

> **Nota de Atualização (Novembro 2026):** O modelo canônico de entrada é o Decisor Visible (`diagnostic_type='authority'`, rota `/score-founder`), acoplado ao motor de plano GTM Blueprint (`growthmap/*`). Os diagnósticos 360 e Growth Score estão obsoletos. O domínio `thegrowthhub.com.br` é utilizado estritamente como benchmark externo.

 Documento vivo de consolidação. Não duplica o conteúdo dos documentos detalhados,
 referencia-os. Atualizar o status aqui sempre que uma frente avançar.
## Como ler

- **Feito:** verificado no repositório (commit, arquivo ou teste apontado).
- **Em andamento:** existe trabalho parcial versionado.
- **Pendente:** nada foi implementado ainda.
- **Bloqueado em você:** decisão de negócio, orçamento ou autorização externa
  que nenhum agente pode tomar sozinho (ver `docs/departments/00-HIERARCHY.md`).

---

## Frente 1 — Migração Supabase → Google Cloud

Fonte completa: [`docs/architecture/gcp-migration/README.md`](./architecture/gcp-migration/README.md)
e [`09-migration-backlog.md`](./architecture/gcp-migration/09-migration-backlog.md).
Decisão final já aprovada: 100% Google Cloud, Supabase sai do runtime só depois
de substituto testado, incremental, navegador nunca acessa Cloud SQL direto.

### Status por épico

| Épico | Objetivo | Status |
|---|---|---|
| E0 | Governança, baseline, decisões bloqueantes | **Em andamento.** E0-T1, E0-T2 e o inventário técnico de E0-T6 estão documentados; E0-T3 está parcialmente definido como “o quanto antes”. Permanecem pendentes E0-T4 (RTO/RPO/LGPD), E0-T5 (custo real), a reconciliação formal do drift de migrations e E0-T7 (rotação da credencial histórica). |
| E1 | Tenant, autorização, identidade, contratos | **Em desenho.** O inventário e a proposta de tenant estão documentados; faltam aprovação do modelo `clients.id`, decisão login-vs-link para clientes e matriz de papéis. |
| E2 | Topologia, IAM, rede, CI/CD, DNS, custo | Pendente. Depende de E0-T2. |
| E3 | Schema/dados | Pendente. |
| E4 | Fundação local da API | Pendente, mas não espera provisioning cloud — pode começar em paralelo com E1/E3. |
| E5 | Staging + piloto | Pendente. |
| E6–E9 | Banco/API/RPC/Storage/Realtime/Functions/Identidade | Pendente, só avança após contratos + tenant + staging existirem. |
| E10–E12 | Rehearsals, cutover, decommission Supabase | Pendente. |

### Trabalho recente fora do backlog formal (achado hoje)

- Deploy antigo via FTP/Hostinger **desativado explicitamente** (`.agent/workflows/deploy_hostinger.md` virou bloqueio documentado) e substituído por gate local (`scripts/validate-deploy-artifact.mjs` + testes) em preparação para o pipeline GCP.
- 17 commits em `main` ainda não têm `git push` para `origin`; o push não dispara deploy automático, mas deve ocorrer depois da revisão de segredos e do CI.

### Próxima ação real (não bloqueada em você)

Preparar a fundação local da migração (E4): contratos de tenant, identidade e autorização
com dados sintéticos, sem provisionar GCP e sem alterar o runtime Supabase. O push para
`origin/main` fica como etapa de sincronização após a revisão de segredos.

1. Owner técnico/segurança/negócio/dados (E0-T2).
2. Prazo e critério de sucesso (E0-T3).
3. Se o primeiro domínio piloto é Auth, uma Edge Function isolada, ou o schema de um domínio específico.

Sem isso, nenhum agente pode avançar para E1/E2/E3 sem inventar prazo ou orçamento.

---

## Frente 2 — Roteamento de modelos de IA por crédito/custo/qualidade

Você pediu: os agentes de IA precisam ser roteados de acordo com disponibilidade
de créditos e economia vs. qualidade, **independente de qual modelo** acabe sendo
usado na tarefa. Isso ainda não existe como sistema — existe só um fallback fixo.

### Realidade atual (verificado no código, não em memória)

- `supabase/functions/generate-strategic-plan/index.ts:774-863` — roteador
  **hardcoded**: tenta Claude Opus 4.7 primeiro, cai para GPT-5.4 só se a
  chamada falhar ou vier vazia. Não considera custo, crédito restante nem
  qualidade exigida pela tarefa — é disponibilidade binária (funcionou/não funcionou).
- `supabase/functions/agent-chat/index.ts:251-266` — comentário no próprio
  código diz `"Unica API suportada: OpenAI"`. O modelo é escolhido pelo
  frontend ou por config do agente no banco (`dbAgent.model`), sem qualquer
  lógica de custo.
- **Não existe nenhuma tabela de uso, custo ou orçamento de IA no schema**
  (procurei em todas as 106 migrations — nenhuma tabela `ai_usage`,
  `ai_budget`, `token_usage` ou equivalente). Hoje ninguém sabe, a partir do
  banco, quanto foi gasto em qual provider.

### Tarefas propostas

| # | Tarefa | Depende de |
|---|---|---|
| R1 | Criar `ai_usage_log` (provider, model, edge function de origem, tokens in/out, custo estimado, latência, sucesso/erro, timestamp) e instrumentar toda chamada de IA existente a gravar nela | Nenhuma — **implementado localmente, ver checkpoint 2026-07-17 (R1) abaixo** |
| R2 | Criar `ai_budget_config` (provider, limite mensal, gasto atual, threshold de alerta) — mesmo que o limite inicial seja um número que você define manualmente | R1 |
| R3 | Extrair um client único `supabase/functions/_shared/ai-router.ts`: recebe `{ task_type, quality_requirement }`, decide provider/modelo com base em orçamento restante (de R2) e custo por 1k tokens, não em ordem fixa de fallback | R1, R2 |
| R4 | Migrar `generate-strategic-plan` e `agent-chat` para consumir o client único, removendo a lógica duplicada e o hardcode de provider único | R3 |
| R5 | Definir política explícita de degradação: quando o orçamento de um provider acabar, o sistema troca de modelo automaticamente ou pausa a feature e avisa? Isso é decisão sua, não técnica | R2 |
| R6 | Dashboard/alerta simples de consumo por provider (usar uma view própria do GrowthHub; não depender de `v_clickup_provisioning_status`) | R1 |

### Quem é dono disso no organograma já existente

`docs/departments/00-HIERARCHY.md` já prevê um gerente **"Dados & IA"** —
qualidade/custo dos prompts e geração do Strategic Plan — reportando direto a
você. Esse backlog (R1–R6) é literalmente o mandato dele; ainda não tem
`docs/departments/dados-ia/` com achados, só a menção na hierarquia.

### Decisão bloqueada em você

- Limite de gasto mensal aceitável por provider (Anthropic/OpenAI).
- Política de degradação automática (trocar modelo vs. pausar feature) quando o crédito acabar.

---

## Frente 3 — Segurança (contexto para priorização, não nova)

Já auditado e documentado ontem/hoje pelo gerente de Segurança em
[`docs/departments/security/00-findings.md`](./departments/security/00-findings.md)
e [`01-backlog.md`](./departments/security/01-backlog.md). Repito aqui só o
resumo executivo porque interage com as duas frentes acima:

- **P0-01** — 3 credenciais JWT/bearer literais versionadas no histórico do
  git. **Bloqueado em você**: rotação/revogação é ação externa e o valor não
  pode ser lido nem reproduzido por agente algum. Isso é o mesmo achado do
  E0-T7 da migração.
- **P0-02** — magic links: qualquer anônimo lê/altera link pendente sem
  comparar token. Correção é local (nova policy + RPC), pode virar spec de
  Developer sem depender de você.
- **P0-03** — leitura anônima global da tabela `diagnostico` (nome, email,
  respostas de lead). Mesma situação: correção local, pronta para spec.
- P1/P2 detalhados no backlog: isolamento por tenant incompleto, 15 de 16
  `SECURITY DEFINER` sem `search_path` fixo, 26 Edge Functions com
  `service_role` sem o helper canônico, buckets públicos, trigger
  `on_auth_user_created` comentado (pode estar quebrado em produção agora).

---

## Sugestões adicionais (minhas, não pedidas explicitamente)

1. **P0-01 e E0-T7 são o mesmo achado visto por dois ângulos** — trate como
   uma única decisão sua (rotacionar credencial + decidir se reescreve
   histórico do git) em vez de duas tarefas separadas nos dois backlogs.
2. **R1 (tabela de uso de IA) resolve parte de E0-T5** (medir custo atual de
   Supabase/terceiros) — ao instrumentar uso de IA você ganha visibilidade de
   custo real por provider, que é insumo direto para o sizing da migração
   GCP. Vale sequenciar R1 antes de gastar tempo em E0-T5 manualmente.
3. Antes de mexer em qualquer RLS (P0-02/P0-03), rodar um scan de segredo
   local (`gitleaks` ou `trufflehog` contra o histórico completo) para
   confirmar que P0-01 são as únicas 3 credenciais expostas — o achado atual
   foi por busca textual manual, não por ferramenta dedicada.
4. `on_auth_user_created` comentado é o achado mais barato de confirmar: um
   teste local (criar usuário em ambiente descartável e checar se `profiles`
   populou) resolve a dúvida sem tocar produção. Sugiro isso antes de
   qualquer outra coisa da Frente 3, porque se o trigger realmente estiver
   quebrado em produção, novos usuários podem estar sem role hoje.
5. Nomear owners (E0-T2) é o item que mais bloqueia progresso — quase todo o
   resto do backlog GCP (E1, E2, grande parte de E0) espera por isso. Vale
   resolver antes de detalhar mais documentação.

---

## Próximos passos imediatos

1. **Você decide:** owners (E0-T2), prazo (E0-T3), limite de gasto por
   provider de IA (R5), e se autoriza investigar o trigger `on_auth_user_created`
   localmente (sugestão 4).
2. **Sem depender de você:** posso especificar e implementar localmente
   (sem push/deploy) uma spec para P0-03 (bloquear leitura anônima de
   `diagnostico`) ou R1 (tabela de uso de IA) — ambos são mudança de código/
   migration local, revisável antes de qualquer aplicação remota.
3. Depois de owners definidos, meto a mão em E1-T1 (unidade canônica de
   tenant) como primeiro documento de arquitetura da próxima fase.

---

## Checkpoint — 2026-07-17, fim do dia (atualizado)

**P0-03 implementado localmente, ainda não commitado nem aplicado no
ambiente remoto.** Antes de escrever qualquer código, a implementação
revelou uma divergência que o achado original de Segurança não tinha
mapeado: a migration `20251227000000_create_diagnostico_table.sql` cria
`public.diagnostico` (singular), mas o schema gerado
(`src/integrations/supabase/types.ts`) e todo o código de aplicação usam
`public.diagnosticos` (plural) + a view `diagnosticos_resumo` — tabela sem
nenhuma migration própria, existente só no ambiente remoto (drift, não
inventado: confirmado cruzando `types.ts`, `src/api/publicDiagnostic.ts`,
`src/services/PipelineService.ts` e `src/pages/PublicDiagnosticResult.tsx`).
O fix foi direcionado para a tabela real em uso, não para a do achado
original.

**O que mudou (diff local, revisável antes de commit):**

- `supabase/migrations/20260717000000_secure_diagnosticos_public_access.sql`
  (novo): `CREATE TABLE IF NOT EXISTS public.diagnosticos` (guarda defensiva
  para ambientes locais/CI onde a tabela nunca foi versionada — no ambiente
  remoto real é no-op porque a tabela já existe), remove todas as policies
  existentes na tabela dinamicamente (nome delas no remoto não é
  verificável), recria só a policy de SELECT para `authenticated`, revoga
  todo privilégio de `anon` na tabela e na view `diagnosticos_resumo`, e cria
  duas RPCs `SECURITY DEFINER` com `search_path` fixo: `submit_diagnostico`
  (grava o lead) e `get_diagnostico_public_result` (devolve só `id`,
  `created_at`, `tipo`, `score` e `respostas` sem o bloco `lead_details` —
  nunca devolve `email`).
- `src/api/publicDiagnostic.ts`, `src/services/PipelineService.ts`: trocado
  `.from('diagnosticos').insert(...).select('id')` por
  `.rpc('submit_diagnostico', {...})` nos dois pontos que criam um
  diagnóstico público.
- `src/pages/PublicDiagnosticResult.tsx`: trocado
  `.from('diagnosticos').select('*').eq('id', id)` por
  `.rpc('get_diagnostico_public_result', { p_id: id })`.
- `src/integrations/supabase/types.ts`: adicionadas as duas funções novas em
  `Functions` (necessário para o client tipado, `npx tsc --noEmit` exige
  isso).
- `docs/architecture/gcp-migration/supabase-dependency-baseline.json`:
  baseline atualizado (`npm run audit:supabase:update`) para refletir a
  troca de `.from` para `.rpc` nos 3 call sites — diff conferido
  manualmente, só symbol/linha mudou, nenhuma contagem nova inesperada.

**Validação rodada localmente (sem rede, sem deploy):**

- `npx tsc --noEmit` — limpo.
- `npm run build` — bundle Vite gerado sem erro; a etapa de prerender falhou
  por falta de Chrome instalado para o Puppeteer neste ambiente
  (`Could not find Chrome ... /Users/giullianoalves/.cache/puppeteer`) —
  limitação do ambiente local, não relacionada a este diff.
- `npm test` — 41/41 testes passando.
- `npm run lint` — sem erros novos nos 3 arquivos tocados (só 1 warning
  pré-existente em `PublicDiagnosticResult.tsx`, import não usado, não
  relacionado); os 111 erros de lint do repositório são todos em outros
  arquivos e pré-existentes.
- `npm run audit:supabase` + `test:audit-supabase` — 6/6 passando após
  atualizar o baseline.

**Riscos residuais / não verificável localmente:**

- Não é possível confirmar, sem acesso ao ambiente remoto, quais policies
  exatamente existiam antes na tabela `diagnosticos` real — a migration
  remove por nome dinâmico exatamente por isso, mas o comportamento efetivo
  só se confirma aplicando num ambiente de teste/staging antes de produção.
- `dbAgent`/outros consumidores de `diagnosticos` que fazem apenas leitura
  autenticada (`useOpportunityIntelligence.ts`, `src/api/opportunities.ts`,
  `RevenueCockpit.tsx`) não foram tocados — continuam usando a policy
  `authenticated` que foi recriada idêntica à intenção original.
- `src/lib/reiSupabaseIntegration.ts` referencia um schema totalmente
  diferente de `diagnosticos` (colunas `rei_id`/`data`) e não é importado em
  nenhum outro lugar do código — confirmado morto, não tocado.

**Próximo passo:** revisar este diff, decidir se aplica a migration num
ambiente de staging/teste antes de produção (checkpoint humano, ver
`docs/departments/00-HIERARCHY.md`).

---

## Checkpoint — 2026-07-17, P0-02 implementado (local, não commitado)

Mesma sessão, mesmo padrão do P0-03. O achado original (`docs/departments/security/01-backlog.md#p0-02`)
descrevia bem o problema: as policies de `orqflow_magic_links` e
`orqflow_tasks` nunca comparam o token apresentado pelo visitante contra o
token da linha — só checam expiração/status. Isso permite a qualquer
anônimo, direto na API REST (não pelo frontend): listar todo magic link não
expirado de qualquer cliente/tarefa, aprovar ou rejeitar qualquer link
pendente sem nunca ter recebido o email, e ler o conteúdo de qualquer task
que tenha algum link ativo.

**O que mudou (diff local, revisável antes de commit):**

- `supabase/migrations/20260717000001_secure_magic_links_public_access.sql`
  (novo): remove as 3 policies ofensoras por nome exato (`Magic links read
  by token match`, `Magic links update only pending` em
  `orqflow_magic_links`; `Public can read tasks with active magic links` em
  `orqflow_tasks`), revoga privilégio de `anon` nas duas tabelas, e cria 2
  RPCs `SECURITY DEFINER` com `search_path` fixo: `get_magic_link_task`
  (junta magic link + task filtrando por token exato + não expirado numa
  query só) e `resolve_magic_link` (aprova/rejeita numa única instrução
  atômica `UPDATE ... WHERE token = ... AND status = 'pending' AND não
  expirado`, sem janela de corrida). O trigger que já sincroniza o status da
  task (`orqflow_magic_link_trigger`, já `SECURITY DEFINER` desde
  `20260321000001_magic_links_audit_columns.sql`) continua disparando
  automaticamente — não precisou ser duplicado na RPC.
- `src/pages/public/MagicApproval.tsx`: as 3 chamadas diretas à tabela
  (`select` do link, `select` da task, `update` do link) viraram 2 chamadas
  RPC. Removida também a segunda chamada manual de `update` em
  `orqflow_tasks` que o componente fazia depois de aprovar/rejeitar — ela já
  era redundante com o trigger (e, por não haver nenhuma policy de `UPDATE`
  para `anon` em `orqflow_tasks`, é bem provável que já fosse um no-op
  silencioso hoje, não uma regressão desta mudança).
- `src/integrations/supabase/types.ts`: adicionadas as duas funções novas.
- Baseline da auditoria Supabase atualizado: 3 operações `.from` viraram 2
  `.rpc`, então os totais gerais caem em 2 (`operation` 623→621, `entries`
  1389→1387) — conferido manualmente, é exatamente a consolidação esperada.

**Validação local:** `npx tsc --noEmit` limpo, `npm run build` ok (mesma
falha de prerender por falta de Chrome no ambiente, não relacionada),
41/41 testes, lint sem erro novo (só 2 warnings pré-existentes e não
relacionados em `MagicApproval.tsx`), auditoria Supabase 6/6 passando após
atualizar baseline.

**Achado residual, fora do escopo deste fix:** `src/pages/client/ClientProjectHub.tsx`
(rota pública `/hub/:id`, sem autenticação) também lê `orqflow_tasks`
diretamente, filtrando por `project_id`. Não existe nenhuma policy de
`SELECT` para `anon` nessa tabela além da que acabei de remover (que só
liberava tasks com magic link ativo, e nunca por `project_id`) — ou seja,
essa tela provavelmente já está com a lista de tarefas ao vivo quebrada/vazia
para visitantes anônimos, independente da minha mudança. Não mexi nisso
(fora do escopo do P0-02 e do RACI de tenant ainda pendente em E1), só
registro para não perder o achado.

**Próximo passo:** revisar os dois diffs (P0-03 + P0-02) juntos, decidir se
aplica em staging antes de produção. Não há mais P0 aberto no backlog de
segurança que seja puramente local — o restante (P0-01, credencial
literal) depende de ação externa de Giulliano.

**Decisões que continuam só de Giulliano:** owners (E0-T2), prazo (E0-T3),
limite de gasto por provider de IA (R5), rotação da credencial do P0-01, e a
decisão de aplicar as migrations em produção.

---

## Checkpoint — 2026-07-17, R1 implementado (local, não commitado)

Primeira tarefa da Frente 2 (roteamento de IA por custo). R1 não dependia de
nenhuma decisão pendente de Giulliano, então foi implementada sem bloqueio.

**O que mudou (diff local, revisável antes de commit):**

- `supabase/migrations/20260717000002_create_ai_usage_log.sql` (novo):
  cria `public.ai_usage_log` (`edge_function`, `provider`, `model`, `success`,
  `error_message`, `input_tokens`, `output_tokens`, `latency_ms`, `metadata`
  jsonb, `created_at`), com RLS no mesmo padrão de
  `20260417000005_create_audit_logs.sql` (só `service_role` grava,
  `authenticated` só lê, nenhuma policy para `anon`). **Custo estimado não
  entrou nesta migration de propósito** — não existe tabela de precificação
  por modelo ainda (isso é o R2) e nenhum valor de custo deveria ser
  inventado para não violar a regra anti-alucinação do projeto.
- `supabase/functions/_shared/ai-usage-log.ts` (novo): helper
  `logAiUsage(supabaseAdmin, entry)` best-effort — uma falha ao gravar o log
  nunca derruba a resposta real da edge function, só loga o erro no console.
- `supabase/functions/generate-strategic-plan/index.ts`: instrumentado o
  roteador hardcoded (linhas originais 774-863, já citado na Frente 2) — loga
  sucesso/falha da chamada Claude Opus 4.7 (com `usage.input_tokens`/
  `output_tokens` de resposta da Anthropic) e da chamada de fallback GPT-5.4
  (com `usage.prompt_tokens`/`completion_tokens` da OpenAI), incluindo
  `projectId`/`jobId` em `metadata`. Nenhum comportamento existente mudou,
  só passou a gravar uma linha por tentativa.
- `supabase/functions/agent-chat/index.ts`: instrumentado nos dois caminhos
  de chamada OpenAI — `raw_mode` e o loop principal (`PROVIDERS['openai']`,
  que agora também retorna `usage` da resposta da OpenAI, além de
  `content`/`model` como já fazia). `agentId` incluído em `metadata`.

**Validação rodada localmente (sem rede, sem deploy):**

- `npx tsc --noEmit` — limpo (as Edge Functions em `supabase/functions/`
  não entram no `tsconfig.app.json`, que só inclui `src`; então este check
  cobre só o frontend, que não foi tocado nesta tarefa).
- `npm run build` — ok, mesma falha de prerender por falta de Chrome no
  ambiente, não relacionada.
- `npm test` — 41/41 testes passando (nenhum teste de frontend toca as
  edge functions).
- `npm run lint` — sem novo erro (lint também só cobre `src`, os 111 erros
  pré-existentes continuam nos mesmos arquivos de sempre).
- `npm run audit:supabase` + `test:audit-supabase` — 6/6 passando após
  `audit:supabase:update`. Diff do baseline conferido manualmente: só
  deslocamento de número de linha nos dois arquivos de edge function
  já rastreados pelo git (por causa do import novo). **Limitação conhecida
  do script** (`scripts/audit-supabase-dependencies.mjs` usa `git ls-files`
  para listar arquivos): a nova migration e o novo helper `_shared/ai-usage-log.ts`
  são arquivos não rastreados (`git status` mostra `??`), então o audit
  ainda não os vê — o mesmo já valia, sem ter sido registrado, para as duas
  migrations do P0-02/P0-03 no checkpoint anterior. Só passam a aparecer no
  baseline depois de um `git add`.

**Riscos residuais / não verificável localmente:**

- Sem acesso ao ambiente remoto não dá pra confirmar volume real de chamadas
  nem custo agregado — é só instrumentação, zero dado histórico.
- `estimated_cost_usd` não existe ainda; qualquer decisão de orçamento (R5)
  segue sem dado de custo até R2/R3 existirem.

**Próximo passo:** revisar este diff junto com os de P0-02/P0-03, decidir se
aplica em staging/produção. R2 (tabela `ai_budget_config`) é o próximo item
não bloqueado da Frente 2, mas R5 (política de degradação) precisa da sua
decisão antes de R3 fazer sentido como roteador de verdade.

**Decisões que continuam só de Giulliano:** owners (E0-T2), prazo (E0-T3),
limite de gasto por provider de IA (R5), rotação da credencial do P0-01, e a
decisão de aplicar as migrations em produção.

---

## Checkpoint — 2026-07-18: varredura completa de segurança aplicada em produção

Sessão separada da de 2026-07-17. Começou investigando por que `/hub/:id`
vinha vazia pra visitante anônimo e virou uma varredura sistemática de
`pg_policies` em busca do mesmo padrão de bug em toda a base: policy com
nome sugerindo restrição (`"... via token"`, `"Admins can ..."`) mas
predicado `qual`/`with_check` literalmente `true`, sem checar nada.

**Resultado: 7 migrations escritas, validadas localmente (tsc/build/testes/
lint/auditoria) e aplicadas em produção nesta sessão, com confirmação via
leitura pós-aplicação em cada uma:**

| # | Migration | Tabelas | Achado |
|---|---|---|---|
| 1 | `20260717000002_create_ai_usage_log.sql` | `ai_usage_log` (nova) | R1, sem risco |
| 2 | `20260717000000_secure_diagnosticos_public_access.sql` | `diagnosticos` | P0-03 (checkpoint 2026-07-17) |
| 3 | `20260717000001_secure_magic_links_public_access.sql` | `orqflow_magic_links`, `orqflow_tasks` | P0-02, com a 4ª policy encontrada só na inspeção ao vivo |
| 4 | `20260718000000_secure_hub_public_access.sql` | `rei_projects`, `rei_responses`, `knowledge_libraries`, `orqflow_sprints`/`tasks` | **O mais grave**: SELECT/INSERT/UPDATE anônimo irrestrito na tabela central de projeto de cliente |
| 5 | `20260718000001_secure_additional_public_findings.sql` | `project_sprints`/`project_tasks` (legado morto), `rei_materials` (página órfã), `cases` (DELETE solto), `organizations` (MRR exposto), `document_signatures` (assinatura forjável) | 5 achados adicionais |
| 6 | `20260718000002_secure_strategic_plans_proposals.sql` | `strategic_plans`, `proposals` | A frente de maior superfície (~20 arquivos; o fluxo de pagamento foi posteriormente removido) |
| 7 | `20260718000003_secure_client_meetings_reis.sql` | `client_meetings`, `reis` | Notas de reunião e gravação de vídeo expostas |

**Erro real corrigido durante a aplicação:** a migration 4 originalmente
referenciava `rei_responses.diagnostic_type`, coluna que não existe
(confirmado via `information_schema` após erro `42703` na primeira
tentativa de aplicar). O insert original de `HubNpsBlocker.tsx` já tentava
gravar esse campo inexistente antes desta sessão — o submit de NPS
provavelmente já falhava silenciosamente em produção. Corrigido para usar
`context = 'public'` como discriminador (valor nunca usado historicamente,
confirmado via `SELECT DISTINCT context`).

**Lição operacional:** o SQL Editor do Supabase Studio não processa de
forma confiável um script único com múltiplas migrations concatenadas
(> 800 linhas) - trava em erros de parsing (`syntax error at or near
"DECLARE"`) que não existem nos arquivos originais (delimitadores `$$`
todos balanceados, confirmado por contagem). Rodar uma migration por vez
resolveu. Cada migration falhada fica em transação implícita própria e
faz rollback completo - nenhuma aplicação parcial ocorreu.

**Varredura final pós-aplicação:** zero policy com `qual`/`with_check =
'true'` para `anon`/`public` restante, exceto 7 policies de `SELECT` em
tabelas de conteúdo institucional público intencional (`authors`,
`blog_posts`, `cases`, `materials`, `posts`, `roles`) - checado
individualmente contra uso legítimo antes de aceitar como está.

**Fora de escopo, registrado como pendente:** esta varredura só cobriu
policies com predicado literalmente `true`. Policies com condição errada
mas não óbvia (compara a coluna errada, por exemplo) não foram auditadas -
isso seria uma auditoria formal maior, ainda não feita.

## Checkpoint — 2026-07-18: E1-T1 (unidade canônica de tenant) avançado

Adicionado a `docs/architecture/gcp-migration/03-auth-and-tenant-isolation.md`
um achado verificado durante a varredura de segurança acima: nenhuma
página client-facing (`/hub/:id`, `/plan/:token`, `/plan/:token/sign`,
`/p/:slug`, certificado por hash) exige login - todo acesso hoje é por
link-capacidade (token opaco na URL comparado a uma coluna), não sessão
Supabase Auth. Fato verificado inspecionando as 6 páginas, não inferido.

Com base nisso, propus respostas às 5 perguntas em aberto do modelo de
tenant (quem é o tenant, se admin é global, etc.), todas marcadas
explicitamente como proposta aguardando aprovação de Giulliano - não
decisão tomada por nenhum agente. Ver a seção correspondente no documento
para o detalhe completo.

**Decisão real sem atalho, ainda pendente:** manter cliente sem login
(modelo atual, mais simples) ou migrar cliente para login de verdade no
GCP (mais seguro contra reencaminhamento de link, mais trabalho de
produto). Isso é E1-T3, depende da resposta a E1-T1 primeiro.

**Decisões que continuam só de Giulliano, atualizado:** owners (E0-T2),
prazo (E0-T3), RTO/RPO/LGPD (E0-T4), modelo de tenant e decisão
login-vs-link para clientes (E1-T1/T3), limite de gasto por provider de IA
(R5), rotação da credencial do P0-01. Nenhuma delas tem mais bloqueio
técnico esperando - são decisões de negócio puras.

## Checkpoint — 2026-07-20: desativação de 11 edge functions órfãs (ClickUp/InfinitePay/Fathom)

Sessão nova. Uma sessão anterior (Claude/Codex) já tinha removido do código
local (53 arquivos, ainda não commitados nesta sessão, working tree
preservado por instrução explícita de Giulliano) todo caller de ClickUp,
InfinitePay e Fathom, e documentou a decisão em
`docs/architecture/gcp-migration/13-integration-inventory.md`. Essa remoção
era só local — auditoria confirmou (`list_edge_functions`) que as 11
functions correspondentes continuavam `ACTIVE` em produção, sem nenhum
caller, incluindo `infinitepay-webhook` e `infinitepay-create-link` com
`verify_jwt: false` (endpoints públicos de pagamento).

**Verificação antes de agir (somente leitura):**
- `grep` em `src/`/`supabase/functions/`: zero referência ativa a
  clickup/infinitepay/fathom fora de `types.ts` (schema gerado) e 2 URLs de
  conteúdo estático do ClickUp Docs (não é chamada de API).
- `get_logs(edge-function)`: zero invocações de qualquer edge function nas
  últimas 24h.
- `cron.job`: vazio.
- `clickup_config.webhook_secret` existe (configurado em 2026-04-15) — pode
  haver um webhook ainda registrado do lado do ClickUp apontando para
  `clickup-sync`; não verificável sem acesso ao painel deles. Registrado
  como risco residual, sem impacto de execução após a desativação.

**Ação:** para cada uma das 11 functions, código-fonte original foi salvo em
`docs/architecture/gcp-migration/_disabled-functions-backup-2026-07-20/`
(um `.ts` por function + manifesto com a tabela de risco por function), e a
function foi redeployada com um stub que responde `410 Gone` a qualquer
requisição, preservando o `verify_jwt` original de cada uma. Nenhuma
migration, tabela, coluna ou dado histórico foi tocado. Testado ao vivo via
`curl` após o deploy: `infinitepay-webhook`, `fathom-webhook` e
`clickup-orchestrator` confirmados retornando `410`.

**Functions desativadas:** `infinitepay-webhook`, `infinitepay-create-link`,
`infinitepay-checkout`, `fathom-webhook`, `fathom-sync`,
`clickup-orchestrator`, `clickup-sprint-orchestrator`, `clickup-provision`,
`clickup-sync`, `clickup-update-docs-link`, `clickup-notetaker-sync`.

**Reversível:** redeploy do arquivo original salvo no backup, via
`deploy_edge_function`, a qualquer momento.

**Não feito nesta ação (fora do escopo, por instrução explícita):** `git
push`, deploy/migration no GCP, qualquer alteração destrutiva em dados ou
migrations do Supabase.

## Checkpoint — 2026-07-20: due diligence The Growth Hub, primeira observação real

Mesma sessão, depois da desativação de functions órfãs. Escrito
`docs/product/m-and-a-due-diligence.md` cobrindo as 12 seções pedidas.
Antes de qualquer commit, rodei varredura de segredos em
`_disabled-functions-backup-2026-07-20/` (grep por padrões de JWT/API
key/token/senha em todos os arquivos + verificação nominal de cada env var
sensível referenciada no código) — **limpo, nenhum segredo literal
versionado**, todas as referências são via `Deno.env.get(...)`.

Giulliano confirmou a distinção de escopo: `GrowthAG/revhackers-growth-hub`
é repositório interno RevHackers, **fora do escopo da diligência**; o alvo
real é `thegrowthhub.com.br`. Com autorização explícita, acessei a
interface pública e o dashboard autenticado (sessão já logada como
"Giulliano Alves", não criada nem contornada por mim) e documentei achados
reais: estrutura de navegação do produto, catálogo de 35 frameworks
estratégicos nomeados por pilar (Inteligência Estratégica, Concepção de
Valor, MVP e Validação Ágil, Escalabilidade), e uma tela de exemplo
("Industry Insights") gerada para um perfil de empresa terceiro ("Funnels")
já carregado na conta. Não interagi com nenhum botão de ação/geração
(havia uma geração de IA ativa em andamento na conta durante o acesso) e
não abri "SquadMatch"/"ExecutionLoop" nem inspecionei rede/backend —
permanece lacuna documentada para uma segunda rodada.

Achado que muda o enquadramento da diligência: a conta autenticada já
pertence a Giulliano/RevHackers — ou seja, já existe alguma relação de uso
prévia com o The Growth Hub, não é acesso concedido especificamente para
esta diligência. Isso ficou registrado como pergunta prioritária (seção 10,
item 18) porque muda quem está diligenciando quem.

**Não feito:** `git push`, deploy GCP, qualquer alteração remota adicional.

## Checkpoint — 2026-07-22 (madrugada): retomada, fix do GrowthMap e R2

Sessão autônoma noturna (Giulliano dormindo, autorizou trabalho seguro sem
push/produção). Ponto de partida: 4 commits locais não enviados, working
tree limpo, módulo GrowthMap recém-commitado (`2589611`).

**1. Regressão corrigida (`655bf8b`)** — o commit do GrowthMap adicionou a
edge function `generate-growthmap` mas não atualizou o baseline da auditoria
nem o teste `test:audit-supabase`, que fixava 31 deployable functions. `npm
test` estava vermelho. Regenerado o baseline (32 functions) e ajustada a
asserção do teste.

**2. Bug real no logging de IA do GrowthMap (`3bb6872`)** — a
`generate-growthmap` gravava em `ai_usage_log` com schema errado:
`function_name` em vez de `edge_function`, `project_id` (coluna inexistente),
e sem `provider`/`success` (ambos NOT NULL). **Toda gravação de log falhava
silenciosamente** (insert em try/catch non-blocking) — as gerações do
GrowthMap ficavam fora da instrumentação R1. Corrigido para usar o helper
canônico `logAiUsage` (`_shared/ai-usage-log.ts`), igual a
`generate-strategic-plan`/`agent-chat`, registrando sucesso (tokens +
latência) e também falha no caminho de erro da Anthropic. Alinhado também
`computeREIConnections` do servidor para incluir `usp` (o preview do client
já incluía).

**3. R2 implementado (`0e79c38`)** — tabela `ai_budget_config` (migration
`20260722000001`), próximo item não-bloqueado da Frente 2. Orçamento mensal
por provider, `monthly_limit_usd` nasce NULL (sem teto — nenhum valor
inventado; limite real é decisão R5). RLS igual à `ai_usage_log`. Seed
idempotente de anthropic+openai. **Não aplicada em produção.**

**Validação de tudo:** `npx tsc --noEmit` limpo, 41/41 testes, auditoria
Supabase 6/6, 0 erros de lint (697 warnings pré-existentes, não tocados).

### Achados que precisam de decisão sua (não resolvi de propósito)

- **GrowthMap com REI inerte (produto):** `src/pages/GrowthMap.tsx`
  (`handleGenerate`) passa `rei_responses: {}` fixo. Todo o diferencial
  "REI × GrowthMap" (calibrar frameworks com dados reais do cliente) está
  desligado — os cards sempre geram sem contexto do REI e o painel
  "Diagnóstico Cruzado" fica vazio. Carregar os dados reais depende de saber
  a fonte/schema do REI do projeto; é decisão de produto, não adivinhei.
- **Tabela `growthmap_results` provavelmente NÃO existe em produção:** a
  migration `20260722000000` veio depois do commit "apply migrations to
  production" (`cad400f`). Sem ela, `/growthmap/:projectId` quebra ao salvar.
  Aplicar em produção precisa da sua autorização (não tenho acesso ao
  Supabase remoto nesta sessão).
- **7 commits locais aguardando `git push`** (2 batches de segurança, fix de
  migrations, GrowthMap, e os 3 desta madrugada). Push segue pendente de
  autorização + revisão de segredos, como nas sessões anteriores.
- **R5 (política de degradação de IA) e limites de gasto por provider**
  continuam só sua — a `ai_budget_config` já existe pra receber os números
  quando você decidir.

### Próximo item não-bloqueado (se autorizar continuar)

R3 (`_shared/ai-router.ts`): roteador único que escolhe provider/modelo por
orçamento restante (lê `ai_budget_config`) em vez de fallback fixo. Depende
de R2 (feito) — mas a política de degradação (R5) precisa da sua decisão pra
o roteador saber o que fazer quando o teto acabar (trocar modelo vs pausar).

## Checkpoint — 2026-07-22 (manhã): REI ligado no GrowthMap

Retomada da manhã. Resolvido o achado "GrowthMap com REI inerte" do
checkpoint da madrugada — **não precisou de decisão de negócio**, os dados
já existiam no código (`rei_responses.responses`, API `getLatestReiResponse`,
`rei_projects` para nome da empresa).

**Commit `ccd00bb`:** `GrowthMap.tsx` agora carrega, no mount por `projectId`,
o projeto + a resposta REI mais recente + o growthmap salvo (em paralelo), e
passa as `responses` reais na geração de cada framework (antes: `{}` fixo).
Isso liga o painel "Diagnóstico Cruzado" (REI × GrowthMap) e as conexões/ações
por framework, que estavam sempre vazias. Nome/descrição da empresa vêm de
`client_company`/`trade_name`/`client_name`; `maturity_percentage` vira o
`rei_score`. Validado: tsc limpo, 41/41 testes, 0 erros de lint.

**Status do GrowthMap agora:** funcionalmente completo no código local. Falta
só o ambiente: aplicar a migration `20260722000000_create_growthmap_results.sql`
(e `20260722000001_create_ai_budget_config.sql`, R2) em produção — ambas
pendentes de autorização de Giulliano, sem acesso remoto nesta sessão.

**Pendências inalteradas:** `git push` de 9 commits locais (autorização +
revisão de segredos), R3 (roteador de IA, não-bloqueado tecnicamente mas
espera R5), aplicar migrations em produção.

## Checkpoint — 2026-07-22: migração GCP E4 implementada e GrowthMap preparado para Cloud SQL

Direção formalmente corrigida e confirmada por Giulliano: a migração é
**integral**. Database/PostgREST, Auth, Edge Functions, Storage, Realtime, cron,
secrets, logs e hosting deixam o Supabase; identidade final é Google Identity
Platform/Firebase Auth com Sign in with Google. Supabase é somente origem
transitória para extração/reconciliação/rollback e será descontinuado.

**E4/Fase C entregue localmente em três commits:**

- `52ff241`: contratos TypeScript/OpenAPI, identidade provider-agnostic, motor
de autorização por tenant, capability links, idempotência, correlation id,
redaction e 27 testes negativos cross-tenant.
- `5b222b1`: runtime HTTP real (Fetch handler + Node adapter), health/readiness,
CORS allowlist, segurança, limite de payload, shutdown gracioso, build CommonJS,
Dockerfile Cloud Run non-root e 13 testes HTTP. Binário compilado validado em
porta real; Docker não existe neste Mac, então a imagem será validada no Cloud
Build staging.
- Piloto GrowthMap: contrato GET/PUT, domain service/repository tenant-scoped,
schema Cloud SQL `app.growthmap_results` com `tenant_id` obrigatório, UNIQUE
composto, constraints e FORCE RLS via contexto transacional. Testes provam que
o mesmo `projectId` em dois tenants retorna/escreve somente o tenant resolvido.

**Gate atual:** API strict/build, frontend tsc, OpenAPI válido, 88/88 testes,
zero erros de lint novos, auditoria Supabase reconciliada e scan de segredos
limpo.

**Bloqueio externo observado:** `gcloud` está configurado com
`giulliano@usefunnels.io`, mas o refresh token expirou e exige `gcloud auth
login` interativo. Sem isso não foi possível consultar nem criar Cloud SQL. Não
houve criação de recurso/custo nesta sessão.

**Próximo passo técnico:** adapter PostgreSQL com transação e `SET LOCAL
app.tenant_id`, rotas HTTP GrowthMap e verifier Google. Em paralelo, após o
login, validar projeto/billing/APIs e provisionar Cloud SQL staging sob gate de
custo/região/IAM.

## Checkpoint — 2026-07-22: Cloud SQL IAM + Google Identity prontos localmente

Continuação da Etapa C. Implementado o caminho de runtime definitivo sem senha
estática e sem dependência de Supabase:

- pool PostgreSQL via Cloud SQL Connector oficial com IAM DB Authentication;
- connection string direta proibida fora de dev/test;
- transação tenant-scoped com `set_config('app.tenant_id', $1, true)`
  parametrizado, COMMIT/ROLLBACK e release garantido;
- adapter PostgreSQL GrowthMap consultando sempre `(tenant_id, project_id)`;
- schema piloto inclui registry projeto/tenant, FK composta e FORCE RLS;
- verifier Google Identity Platform por JOSE/JWKS oficial, somente RS256,
  issuer/audience do projeto, exp/nbf e limite de tamanho;
- Firebase Admin foi testado e removido antes de commit por trazer dependências
  desnecessárias e 6 vulnerabilidades moderadas transitivas; `jose` deixou o
  `npm audit --omit=dev` da API em zero vulnerabilidades.

Gate: strict/build/frontend tsc, 102/102 testes, 0 erros lint, scan de segredos
limpo e auditoria reconciliada.

Bloqueio para cloud real: refresh token do `gcloud` expirado. Necessário executar
interativamente `gcloud auth login giulliano@usefunnels.io` e selecionar
`revhackers-staging`. Só depois serão consultados billing/APIs e proposto o
sizing/custo antes de criar Cloud SQL.

## Checkpoint - 2026-07-22: imagem e API Cloud Run staging publicadas

Retomada após a interrupção por limite/contexto do agente anterior. O ponto exato
era o commit `bf7c909`, que reconciliou o lockfile depois de dois Cloud Builds
falhos. O gate local foi repetido e aprovado antes de qualquer ação remota.

- Cloud Build `db690c97-07ed-4957-a6aa-f7533960f777`: **SUCCESS**.
- Imagem imutável publicada no Artifact Registry com digest
  `sha256:fb7cf4d01e5bdc19ffe5f9161bed2cd2caf36adccd91ce25ab929e76f0ed17ae`.
- Serviço privado `revhackers-api-staging` criado no Cloud Run.
- Revisão `revhackers-api-staging-00001-2cq`: **Ready**, 100% do tráfego.
- Runtime usa a service account dedicada `revhackers-api-staging`, Cloud SQL IAM,
  sem senha/chave JSON, 512 MiB, escala 0-2 e concorrência 20.
- O serviço não foi tornado público. A organização bloqueou corretamente a
  tentativa temporária de binding `allUsers` por domain restriction.

### Gate de invocação pendente

O container inicia e registra `server_started`, mas a invocação privada pela URL
`run.app` retorna 404 na borda Google e não produz log HTTP da aplicação. O proxy
do `gcloud` reproduz o mesmo comportamento para a API, enquanto o serviço smoke
responde 200. Portanto o problema está no gate IAM/ingress da API, não no handler
Node nem no Cloud SQL. A política privada foi preservada; nenhuma abertura pública
foi mantida apenas para facilitar o teste.

### Próximo passo sem atalho inseguro

As rotas GrowthMap não podem aceitar tenant de header/body. Antes de ligá-las ao
runtime é necessário criar no Cloud SQL o registry de identidade e autorização:
`identity(issuer, subject) -> internal_user -> membership(tenant, role, status)` e
a resolução server-side de `project_id -> tenant_id`. Depois disso o verifier
Google, o service e o repository já existentes podem ser compostos no handler.

## Checkpoint - 2026-07-22: primeiro fluxo 100% GCP aprovado em staging

O piloto GrowthMap completou o primeiro fluxo real sem Supabase:

- Identity Platform inicializado no `revhackers-staging`;
- identidade sintética emitida por custom token assinado via IAM Credentials,
  sem chave privada/JSON;
- `issuer + subject` resolvidos para usuário interno e membership no Cloud SQL;
- tenant do projeto resolvido server-side, sem header/body controlado pelo browser;
- `GET /v1/growthmaps/{projectId}` retornou `null` antes da primeira gravação;
- `PUT` persistiu fixture 100% sintética no Cloud SQL com FORCE RLS;
- repetição da mesma `Idempotency-Key` devolveu replay da resposta persistida;
- imagem `sha256:056c991ca299da183436c15bc86cd1706b8f75a13defe8aa80bcc20a2ebc7fdc`;
- revisão `revhackers-api-staging-00004-549`, Ready, 100% do tráfego staging.

### Diagnóstico de borda

O caminho `/healthz` é interceptado pela borda Google neste ambiente e retorna
404 antes do container. A raiz `/` foi adicionada como identificação saudável e
`/readyz` valida o PostgreSQL; ambos respondem 200. A comparação controlada com
hello-world, duas service accounts, duas URLs, IPv4/IPv6 e serviço descartável
isolou o comportamento ao path. Serviços e tags diagnósticos foram removidos.

### Gate alcançado

Cloud Run + Google Identity Platform + usuário/membership internos + Cloud SQL IAM
+ FORCE RLS + idempotência persistente funcionam ponta a ponta. O próximo passo é
configurar o provedor Google OAuth real e trocar o adapter GrowthMap do frontend
por feature flag no staging.

## Checkpoint - 2026-07-22: Google OAuth habilitado no Identity Platform staging

Com autorização de Giulliano, a configuração foi criada diretamente no GCP:

- OAuth consent brand interno: `RevHackers Staging`;
- support email corporativo configurado;
- OAuth Client Web criado no projeto, sem valor versionado;
- `google.com` criado e habilitado em
  `projects/254666331430/defaultSupportedIdpConfigs/google.com`;
- client ID e secret transferidos diretamente da resposta administrativa para o
  Identity Platform; arquivos temporários foram apagados;
- nenhum secret foi exibido na conversa, gravado no repositório ou colocado em
  variável frontend;
- teste negativo com token do Google Cloud SDK foi corretamente rejeitado por
  audience diferente, provando que o projeto não aceita ID tokens de clients não
  autorizados.

O consentimento é interno à organização no staging. O próximo teste positivo deve
ser feito pelo Firebase Auth client com o OAuth Client RevHackers, não com o token
do `gcloud`. Depois do primeiro login, o subject Google deve ser provisionado na
fonte interna antes de receber membership/role; email/claim não concede acesso.
