# Topologia de projetos Google Cloud

## Status e limites

Este documento especifica a topologia lógica aprovada para planejamento: três projetos isolados, `revhackers-dev`, `revhackers-staging` e `revhackers-prod`, dentro da organização Google Cloud já existente. A disponibilidade desses **project IDs** ainda não foi consultada; os nomes não provam que os IDs globais estejam livres e não autorizam criação, billing ou configuração.

A organização, conta de faturamento, folders, região, domínio, zonas DNS, grupos, service accounts, Workload Identity Pools e resource IDs reais são **entradas não verificadas**. Nenhum deles é inventado aqui. Qualquer ação externa continua sujeita ao checkpoint humano definido em [06-approved-direction.md](./06-approved-direction.md).

## Topologia lógica aprovada para detalhamento

```text
Organização Google Cloud existente (ID não verificado)
└── boundary RevHackers (folder existente ou novo: decisão pendente)
    ├── revhackers-dev
    │   └── dados sintéticos, integrações mock/sandbox e deploys de desenvolvimento
    ├── revhackers-staging
    │   └── rehearsal, dados sintéticos ou mascarados aprovados e integrações sandbox
    └── revhackers-prod
        └── dados reais, integrações reais e controles de produção

Supabase
└── origem e rollback temporários; fora da topologia final de runtime
```

Não é proposto um quarto projeto compartilhado nesta fase. Se artifact registry, observabilidade, DNS ou CI centralizados exigirem um projeto comum, isso será uma decisão arquitetural e de IAM separada, com análise de blast radius. Até lá, a regra segura é manter recursos dentro do projeto do próprio ambiente.

## Separação de ambientes e matriz de isolamento

| Boundary | `revhackers-dev` | `revhackers-staging` | `revhackers-prod` | Regra de isolamento |
|---|---|---|---|---|
| Dados | Sintéticos | Sintéticos; dados mascarados somente com aprovação | Reais | Nenhuma replicação de produção para ambiente inferior sem autorização e transformação comprovada |
| Banco | Instância/base própria | Instância/base própria | Instância/base própria | Sem credencial, usuário, endpoint ou conexão compartilhada |
| Storage | Buckets próprios | Buckets próprios | Buckets próprios | Sem bucket cross-environment; acesso público só por requisito explícito |
| Identidade de usuário | Tenant/issuer/client de dev | Tenant/issuer/client de staging | Tenant/issuer/client de prod | `issuer` e `audience` exclusivos; token de um ambiente falha nos demais |
| Workloads | Service accounts de dev | Service accounts de staging | Service accounts de prod | Nenhuma service account reutilizada entre projetos |
| Terceiros | Mock/sandbox | Sandbox | Credenciais/endpoints reais aprovados | Chaves, webhooks e OAuth redirects separados |
| Logs e auditoria | Retenção não produtiva aprovada | Evidência de rehearsal | Retenção de produção aprovada | Sem sink amplo cross-project por padrão |
| Entrega | Iteração controlada | Artefato rastreável | Aprovação explícita | Backend promove o mesmo digest; frontend usa runtime config ou builds por ambiente rastreados ao mesmo commit/provenance |
| Faturamento | Budget próprio | Budget próprio | Budget próprio | Alertas não são hard cap; nenhuma automação destrutiva em produção |

## IAM e identidade administrativa

### Princípios

- Conceder acesso a grupos corporativos aprovados, não a contas pessoais ad hoc, exceto break-glass documentado.
- Separar papéis de visualização, operação, deploy, segurança, billing e auditoria.
- Conceder no menor resource scope possível; evitar grants amplos na organização e no folder.
- Não conceder papéis básicos amplos (`Owner`, `Editor`, `Viewer`) como padrão operacional.
- Manter identidades de aplicação, migration, worker, scheduler, deploy e observabilidade distintas por projeto.
- Bloquear criação e uso rotineiro de chaves estáticas de service account; preferir federação e identidades anexadas ao workload.
- Auditar toda impersonation e todo uso break-glass; acesso emergencial precisa de prazo, justificativa, alerta e revisão posterior.

### Matriz candidata de acesso humano

Os nomes de grupos abaixo são **papéis lógicos**, não endereços ou grupos comprovadamente existentes.

| Papel lógico | Dev | Staging | Produção |
|---|---|---|---|
| Desenvolvedor | Operar workloads de dev sem administrar IAM/billing | Leitura e execução de testes aprovada | Sem mutação por padrão |
| Release manager | Leitura | Promover/reverter release de staging | Promover/reverter somente com aprovação |
| Plataforma/SRE | Operação conforme função | Operação conforme função | Operação mínima, auditada e com on-call/runbook |
| Segurança/auditoria | Leitura de IAM, logs de auditoria e postura | Igual | Igual, sem acesso automático ao conteúdo de dados |
| Billing | Leitura/gestão de budget conforme autoridade | Igual | Igual; sem permissão de runtime por decorrência |
| Break-glass | Não necessário como caminho normal | Excepcional | Excepcional, temporário e alertado |

O mapeamento para papéis Google Cloud predefinidos/customizados depende do inventário da organização e de revisão independente. Este documento não concede papéis.

## Identidades de workload

Cada ambiente deve ter identidades separadas para, no mínimo:

- API pública: autentica usuários, aplica autorização e acessa somente os domínios de dados necessários;
- workers/jobs: consomem apenas suas filas/tópicos e tabelas de domínio;
- scheduler: apenas cria a invocação autenticada do job/endpoint permitido;
- migration: papel temporário, fora do runtime, sem uso pela aplicação;
- CI build: produz artefato e evidência, sem permissão de deploy em produção;
- CD deploy: promove artefato imutável somente no ambiente autorizado;
- observabilidade: escreve telemetria; leitores de telemetria são grupos distintos;
- backup/restore: permissões separadas e exercitadas em ambiente isolado.

Chamadas internas devem usar identidade de workload e `audience` específica. Credenciais de banco, tokens de terceiros e segredos de webhook nunca entram no navegador, artifact, migration, log ou variável `VITE_*`.

## Rede e borda

### Boundary por projeto

- VPC e sub-redes próprias por ambiente; CIDRs e região permanecem não verificados.
- Nenhum peering dev/staging/prod por padrão. Exceção exige fluxo documentado, regra mínima e revisão de exfiltração/lateral movement.
- Banco sem acesso direto do navegador e sem endpoint público por conveniência. A API/worker server-side é a única fronteira normal de acesso.
- Conexão ao banco por mecanismo privado/protegido compatível com o serviço escolhido, com pool e limites por workload.
- Egress de workloads limitado aos terceiros necessários; domínios e portas inventariados por função.
- Endpoints públicos separados em API de usuário, OAuth callbacks e webhooks. Webhook não reutiliza autenticação de usuário.
- Borda, load balancer, WAF, CDN e política de rate limit continuam decisões pendentes; sua ausência não autoriza exposição direta insegura.

### Fluxo permitido

```text
Internet
  ├── frontend estático
  ├── API autenticada ──> serviços privados ──> banco/storage do mesmo projeto
  ├── OAuth callback com state validado
  └── webhook com assinatura/segredo + replay guard ──> fila/tópico ──> worker

Dev ─X─> banco/storage/identidade de staging ou produção
Staging ─X─> banco/storage/identidade de produção
Browser ─X─> Cloud SQL
```

## CI/CD e supply chain

O repositório usa hoje GitHub Actions para CI/deploy e FTP para entrega estática. O mecanismo futuro ainda não foi aprovado. A topologia suporta GitHub Actions com Workload Identity Federation ou Cloud Build, desde que os controles abaixo sejam preservados.

1. Pull request executa typecheck, testes, build e scanners sem credencial de produção.
2. Backend e workers geram artifact imutável, SBOM/provenance e digest; staging e produção recebem promoção do mesmo digest. Para o frontend Vite/prerender, escolher antes entre configuração externa em runtime ou builds separados por ambiente, sempre rastreados ao mesmo commit, inputs publicados, SBOM/provenance e digest próprios.
3. Identidade de CI por ambiente restringe repositório, branch/tag e workflow; PR de fork não recebe credencial de deploy.
4. Dev pode ter deploy automático dentro de guardrails aprovados.
5. Staging exige gate de testes, schema compatibility, restore e aprovação definida.
6. Produção exige checkpoint humano, artifact candidato observado em staging — ou frontend equivalente do mesmo commit e inputs controlados —, mudança registrada, rollback e separação entre quem escreve e quem aprova quando a equipe permitir.
7. Migrations são etapa explícita, forward-compatible e separada do start da aplicação. O runtime não recebe papel de migration.
8. Secrets são referenciados no destino, nunca copiados para output do pipeline.
9. Build/prerender usa fonte de conteúdo própria do ambiente; não pode consultar produção por variável herdada.
10. A estratégia de IaC precisa definir ferramenta, bootstrap, state remoto, locking, import, drift detection, proteção contra destruição e procedimento break-glass antes do primeiro apply.

Branch, tag e environment protections reais precisam ser inventariados. `main` não é assumida automaticamente como dev/staging/prod. `develop` foi arquivada na tag `archive/develop-a940b6c` (OP-02 iii, 2026-10-13) e não é ambiente ativo.

## Budgets, quotas e custo

Cada projeto terá budget e alertas próprios depois de billing e valores serem aprovados. Valores monetários, thresholds e conta de faturamento permanecem **não verificados**.

Controles obrigatórios:

- labels/tags de `environment`, `service`, `owner` e centro de custo;
- dashboards e alertas de anomalia por projeto e produto;
- quotas de scaling, jobs, filas, APIs de IA e egress compatíveis com carga medida;
- retenção e sampling de logs definidos por ambiente;
- previsão explícita do custo de coexistência Supabase + GCP;
- destinatários e runbook para cada alerta;
- nenhuma automação de desligamento ou deleção em produção;
- desligamento automático em não produção somente com aprovação e lista de recursos recuperáveis.

Budget alerta; não bloqueia consumo. Hard caps podem causar indisponibilidade e precisam de decisão de risco própria.

## DNS, certificados e nomes de ambiente

- A zona e o provedor DNS atuais não foram verificados. Nenhuma transferência para Cloud DNS é pressuposta.
- Nomes públicos de dev, staging, API, OAuth e webhooks permanecem pendentes; nenhum hostname é criado neste documento.
- Produção mantém DNS atual até o cutover aprovado. Alteração de registro, certificado, domínio, TTL ou redirect URI é checkpoint humano separado.
- Dev e staging não usam cookies, issuer, callback ou domínio de produção.
- Webhooks e OAuth callbacks são atualizados por ambiente somente após endpoint, autenticação, observabilidade e rollback serem testados.
- O decommission exige varredura de DNS, código, configuração de terceiros, redirects OAuth, CSP/CORS e URLs persistidas para eliminar endpoints Supabase.

## Gates de aceitação da topologia

- Disponibilidade dos três project IDs validada sem assumir resultado.
- Organização, folder e billing target identificados e aprovados.
- Região, residência, RTO/RPO, disponibilidade e orçamento aprovados com evidência.
- Matriz IAM revisada por pessoa diferente do autor; nenhum grant cross-environment implícito.
- Emissores, audiences, service accounts, secrets, bancos e buckets separados por ambiente.
- Diagrama de rede e egress allowlist revisados; browser sem caminho ao banco.
- Pipeline promove o mesmo digest de backend/worker; para frontend, prova runtime config imutável ou equivalência rastreável de commit, inputs e provenance entre builds por ambiente.
- Token de dev falha em staging/prod; workload de dev falha ao acessar recursos dos demais projetos.
- Budgets, quotas, owners, logs, alertas, backup e restore definidos antes de tráfego pago.
- DNS/certificados/callbacks têm plano de mudança e rollback aprovado.

## Perguntas abertas bloqueantes

1. Os project IDs solicitados estão disponíveis e atendem à convenção da organização?
2. Qual folder e conta de faturamento devem conter os projetos?
3. Quais grupos corporativos e owners existem de fato?
4. Qual região atende residência, latência, disponibilidade e custo medidos?
5. Qual provedor de identidade e quais issuer/audience serão usados por ambiente?
6. GitHub Actions será mantido ou Cloud Build será adotado, e quais protections existem hoje?
7. Onde DNS, certificados, frontend estático e borda ficarão?
8. Quais budgets, quotas, retenções e destinatários de alerta são aprovados?
