# Segurança, custo e observabilidade

## Classificação de evidência

- **Fato verificado:** derivado da base `5acc0ed`.
- **Inferência:** risco ou controle recomendado a partir do desenho estático.
- **Entrada não verificada:** exige medição ou decisão humana antes de dimensionar/contratar.

## Threat model resumido

| Ativo/fronteira | Ameaça | Evidência atual | Controle alvo |
|---|---|---|---|
| Sessão do navegador | roubo/replay de token, XSS, sessão de outro ambiente | sessão Supabase persiste em `localStorage` | CSP/XSS hardening, tokens curtos, issuer/audience por ambiente, revogação e não registrar tokens |
| API pública | spoofing, IDOR, mass assignment, abuso/DoS | frontend hoje acessa Supabase e funções diretamente | verificação de token, policy por endpoint, tenant server-side, schema validation, rate limit e quotas |
| Tenant boundary | leitura/escrita cross-tenant | modelo canônico não comprovado; políticas amplas existem no histórico | `tenant_id` obrigatório, membership, queries/RLS tenant-scoped e testes negativos |
| Banco | credencial vazada, SQL injection, abuso de função privilegiada | service role é amplamente usado; 17 ocorrências de `SECURITY DEFINER` | IAM/secret seguro, SQL parametrizado, papel sem owner/BYPASSRLS, revisão de functions/grants |
| Webhooks | falsificação, replay, duplicação | dois endpoints sem JWT validam segredo; ClickUp implementa HMAC | assinatura/segredo, timestamp/replay window, idempotência, limite de payload e audit |
| Storage | objeto privado público, overwrite/path traversal, malware | buckets misturam políticas públicas e autenticadas | privado por padrão, signed URL curta, prefixo tenant, checksum/MIME/tamanho, scanning conforme risco |
| Jobs/filas | replay, poison message, ação no tenant errado | funções encadeadas e cron existem | identity de workload, tenant obrigatório, idempotência, retry limitado e dead-letter |
| Terceiros | exfiltração, custo, rate limit, supply-chain | IA, Google, ClickUp e GHL no código ativo | allowlist, data minimization, timeout, egress control, budgets e contratos/sandbox |
| Logs/auditoria | segredo/PII em log ou ausência de prova | webhook registra payload; triggers de audit foram removidos | redaction, schemas de log, retenção, acesso mínimo e audit trail independente |
| Pipeline/deploy | ambiente errado, artifact tampering, deploy não aprovado | build consulta Supabase; `develop` arquivada em `archive/develop-a940b6c`, deploy por push em `main` | environments protegidos, provenance, approvals, vars por ambiente, artifact promotion |

## Segredos e credenciais

**Fatos verificados**

- Uma migração histórica contém um bearer token literal. O valor não é repetido.
- Edge Functions dependem de service role Supabase e de credenciais de IA, Google, ClickUp, GoHighLevel e webhooks.
- Pipeline/deploy depende de credenciais FTP e variáveis públicas Supabase.
- `.env` e chaves PEM são ignorados pelo Git; seus valores não foram lidos.

**Controles propostos**

- Tratar a credencial histórica como exposta até classificação e rotação aprovadas.
- Remover credenciais de SQL/histórico futuro sem reescrever Git nesta fase; preservar evidência e criar substituição segura.
- Secret Manager por ambiente, IAM de acesso mínimo, rotação e auditoria.
- Workload identity em vez de chaves estáticas quando o serviço suportar.
- Nunca colocar service credentials em `VITE_*`, imagem, log, erro, migration ou documentação.
- Scanner de secrets no CI com tratamento seguro do achado e plano para falsos positivos.
- Break-glass com prazo, justificativa, alerta e revisão.

**Checkpoint humano:** rotação, revogação, escrita em Secret Manager ou alteração de credencial real exige pedido com credencial-alvo (sem valor), impacto, dependências, rollback e validação.

## Menor privilégio

- Projeto e service accounts separados por ambiente e serviço.
- API, worker, migration e observability com papéis distintos.
- Banco: aplicação sem superuser, owner ou `BYPASSRLS`; migrations usam papel temporário controlado.
- Buckets separados ou policies claras por sensibilidade; nenhum wildcard cross-environment.
- Funções administrativas não expostas a qualquer usuário autenticado apenas porque o gateway validou JWT.
- Terceiros com credenciais de menor escopo e sandbox distinta.
- Revisão explícita de 39 `GRANT` históricos e introdução de `REVOKE`/default privileges conforme desenho aprovado.

## Logs e privacidade

**Fato verificado:** existe logging de payload de webhook e de diversos erros no código atual.

Política proposta:

- allowlist de campos em vez de serializar request/response integral;
- redact de authorization, cookies, tokens, secrets, e-mail, telefone, CPF, conteúdo de reunião e dados financeiros;
- `tenant_id` pseudonimizado quando suficiente;
- níveis de log por ambiente, sampling e limite de tamanho;
- retenção aprovada por classe de dado;
- acesso a logs com least privilege e audit;
- export/consulta de auditoria separado do log de debug.

LGPD, bases legais, DPA, residência e prazos de retenção são **entradas não verificadas**.

## Observabilidade e SLOs

### Métricas mínimas

- API: requests, taxa de erro por classe, p50/p95/p99, payload rejeitado, rate limit e auth failures.
- Cloud Run candidato: instâncias, concurrency, cold starts, CPU/memória e duração.
- PostgreSQL: CPU, memória, storage, IOPS, conexões/pool, locks, deadlocks, replication lag, queries lentas e autovacuum.
- Jobs: backlog, age, retries, dead-letter e duração.
- Webhooks: recebidos, inválidos, duplicados, processados e efeitos idempotentes.
- Storage: bytes, objetos, erros, signed URLs e acessos negados.
- Terceiros/IA: chamadas, tokens/unidades, latência, erro, rate limit e custo por domínio/tenant quando permitido.
- Migração: lag, throughput, divergências e tempo de reconciliação.

### Alertas candidatos

- erro/latência acima do SLO aprovado;
- falhas de auth ou acesso cross-tenant detectado;
- conexão de banco próxima ao limite;
- fila envelhecida/dead-letter;
- backup/restore check falho;
- aumento anormal de egress, logs ou custo de IA;
- mudança de IAM/secret/rede fora da janela;
- webhook com assinatura inválida em volume anormal.

SLO, SLA e thresholds permanecem **não verificados**. Alertas só devem ser ligados a limites aprovados e runbook/owner acionável.

## Backups, continuidade e recuperação

**Entradas não verificadas:** RTO, RPO, retenção, point-in-time recovery, necessidade de HA, réplica regional e tolerância a indisponibilidade de terceiros.

Antes de produção:

- definir RTO/RPO por domínio;
- configurar backups/PITR conforme objetivo;
- garantir que backup não compartilhe a mesma falha administrativa;
- testar restore completo e granular em ambiente isolado;
- documentar perda aceitável e replay de jobs/webhooks;
- validar recuperação de metadata e objetos do Storage;
- manter cópia/rollback Supabase durante estabilização;
- realizar game day e registrar tempo/evidência.

Backup existente sem restore testado não satisfaz o gate.

## Custo

### Drivers a medir

- Cloud SQL: tier, HA, storage, IOPS, backups/PITR, replicas e conexões.
- Cloud Run: requests, CPU/memória, duração, min instances, concurrency e egress.
- Storage/CDN: bytes, operações, versionamento, retenção e egress.
- Scheduler/Tasks/Pub/Sub: execuções, mensagens, retries e dead-letter.
- Logging/Monitoring/Trace: ingestão, retenção, métricas customizadas e sampling.
- Identity: usuários ativos e métodos de autenticação.
- Rede/WAF/LB/NAT: tráfego e regras.
- Terceiros: IA, scraping, ClickUp, GHL, pagamentos e APIs Google.
- Coexistência: custo duplicado de Supabase + GCP durante migração.

### Controles de orçamento

- budgets e alertas por projeto/ambiente, sem tratar alerta como hard cap;
- quotas e limites de scaling revisados;
- labels/tags de serviço, ambiente, owner e centro de custo;
- dashboards de custo por produto e anomalia diária;
- limite de retenção/sampling de logs;
- limite de tokens/chamadas de IA e rate limit por operação;
- desligamento automático apenas para recursos não produtivos e explicitamente aprovados;
- revisão de commitment/discount somente após baseline estável.

### Entradas não verificadas para estimativa

- custo atual Supabase/Hostinger/terceiros;
- usuários ativos e concorrência;
- requests, duração e CPU/memória por função;
- tamanho, crescimento, IOPS e conexões do banco;
- bytes/objetos/egress de Storage;
- volume de Realtime e jobs;
- região e HA;
- retenção de logs/backups;
- orçamento e margem aceitáveis.

Sem esses dados, nenhum preço ou tier deve aparecer como compromisso.

## Gates de segurança, custo e operação

- Threat model e modelo de tenant aprovados.
- Nenhum secret literal novo; achado histórico classificado.
- IAM e papéis de banco revisados por outra pessoa.
- Testes negativos e de elevação automatizados.
- Observabilidade presente antes do tráfego.
- Restore e rollback ensaiados.
- Budget, quotas e owners configurados antes de recurso pago em produção.
- Retenção/PII/LGPD aprovadas.
- Custos estimados com dados medidos e margem explícita.
- Nenhuma infraestrutura ou deploy sem checkpoint humano.
