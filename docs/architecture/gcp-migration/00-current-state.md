# Estado atual na base recuperada

## Escopo e legenda

Esta auditoria é exclusivamente estática e local. A referência examinada é o commit `5acc0ede44fd29f1806a9f0c5d4214db07725c88`, que era o `HEAD` limpo da branch de supervisão em 16 de julho de 2026. Nenhum ambiente de produção, segredo, serviço Google Cloud ou Supabase remoto foi consultado.

- **Fato verificado:** observado diretamente em arquivo versionado ou por contagem local na referência.
- **Inferência:** conclusão plausível a partir do código, ainda sem evidência operacional.
- **Pergunta aberta:** dado necessário que o repositório não comprova.

Contagens de SQL abaixo são ocorrências no histórico de migrações, não uma fotografia garantida do schema efetivo. Migrações posteriores podem substituir ou remover objetos anteriores.

## Runtime, build e entrega

**Fatos verificados**

- A aplicação principal fica na raiz e usa React 18.3, TypeScript 5.5, Vite 5.4 e Tailwind 3.4.
- O cliente é uma SPA com `BrowserRouter`. O build principal executa Vite e depois `scripts/prerender.js`.
- O prerender inicia um servidor HTTP local, usa Puppeteer, consulta `blog_posts`, `cases` e `materials` no Supabase para obter rotas dinâmicas e grava HTML no diretório de build. Portanto, o build pode acessar o backend apontado pelas variáveis fornecidas ao processo.
- `npm test` executa Vitest; `npm run test:e2e` executa Playwright. O repositório contém somente dois arquivos Playwright na pasta `tests`, com três casos básicos no total. Não há testes de isolamento de tenant inventariados.
- A automação de CI instala dependências, verifica TypeScript e executa o build em pushes e pull requests para `develop` e `main`. Ela não executa os testes definidos no `package.json`. Nota (2026-10-13, OP-02 iii): `develop` arquivada em `archive/develop-a940b6c`; CI agora vale para `main`.
- O workflow de deploy roda em pushes para `develop` e `main`, constrói a aplicação e envia o artefato por FTP. O README identifica Hostinger como produção atual; scripts locais também implementam deploy por FTP e o `.htaccess` fornece redirecionamento HTTPS, fallback da SPA e políticas de cache. Nota (2026-10-13, OP-02 iii): `develop` arquivada em `archive/develop-a940b6c`; deploy de produção por push em `main`, `deploy.yml` é `workflow_dispatch` sem deploy.
- `@vercel/analytics` é carregado pela aplicação, mas isso não prova hospedagem na Vercel.
- `experiments/polemic-led-growth` é um projeto Vite/React separado, não participa do build da raiz e deve permanecer fora do escopo da migração inicial.

**Inferências**

- Há risco de um build local ou de CI consultar o ambiente errado se as variáveis de prerender não forem segregadas por ambiente.
- Disparar o mesmo workflow de deploy em `develop` e `main` pode representar uma fronteira de ambientes fraca; o destino efetivo não foi inspecionado.

**Perguntas abertas**

- Quais destinos, domínios e aprovações correspondem hoje a `develop` e `main`?
- O prerender de CI usa dados de produção, staging ou uma base própria de conteúdo publicado?
- Existe CDN/WAF fora do repositório e quais são suas regras de cache e rollback?

## Superfície Supabase no frontend

**Fatos verificados**

- O navegador cria `@supabase/supabase-js` com URL e chave publicável recebidas por variáveis `VITE_*`, persiste a sessão em `localStorage`, renova tokens e detecta sessão na URL.
- Uma busca lexical encontrou 104 arquivos em `src` que importam ou referenciam o cliente Supabase, 344 ocorrências de `.from(`, oito de `.rpc(`, 41 invocações de Edge Functions, sete referências a Storage e seis canais Realtime. São ocorrências, não rotas únicas nem cobertura de execução.
- Chamadas RPC encontradas no cliente incluem conversão de oportunidade, geração de plano, consulta de proposta por slug, busca vetorial de conhecimento, reconciliação e atualização de estado REI.
- Os canais Realtime observados acompanham tarefas Orqflow, mensagens do hub, jobs de geração, avatar/perfil e kickoff.
- O frontend acessa dezenas de tabelas diretamente via PostgREST. Entre as mais recorrentes estão `rei_projects`, `strategic_plans`, `opportunities`, `proposals`, `profiles`, `agent_documents`, `materials`, `cases` e `clients`; tabelas ClickUp ficam apenas como histórico.

**Inferência**

- Uma troca direta do endpoint Supabase por Cloud SQL é inviável e insegura. A superfície de acesso do navegador precisa ser substituída gradualmente por uma API autenticada, ou mantida no Supabase durante a transição.

## Auth e autorização atuais

**Fatos verificados**

- O fluxo usa Supabase Auth com senha, OTP por e-mail, recuperação de senha, atualização de senha, renovação de sessão e logout. Cadastro público está bloqueado no cliente; convites administrativos passam por uma Edge Function.
- O perfil da aplicação é lido de `profiles`. Os papéis usados no cliente são `super_admin`, `admin` e `user`.
- `ProtectedRoute` impede usuário não autenticado e redireciona `user`; é um controle de navegação, não uma fronteira de segurança de dados.
- As migrações contêm 69 referências a `auth.uid()`, 32 a `auth.role()` e nenhuma a `auth.jwt()`. Existe trigger para impedir autoelevação da coluna `profiles.role`, com bypass intencional para `service_role`.
- A função `handle_new_user` cria perfil com papel `user`, mas a criação do trigger em `auth.users` está comentada no histórico auditado. A existência efetiva desse trigger não está comprovada.
- O helper compartilhado de Edge Functions valida o token com `auth.getUser()`, busca o papel em `profiles` e permite bypass server-to-server com service role. Somente um subconjunto das funções usa esse helper.

**Inferências**

- O papel no estado React não deve ser reutilizado como decisão de autorização na arquitetura alvo; o backend precisa decidir acesso em cada operação.
- A correlação entre usuário, organização, cliente e projeto não está uniformemente expressa nas políticas versionadas.

## Migrações, RLS, funções e banco

**Fatos verificados**

- Há 106 arquivos SQL em `supabase/migrations`.
- O histórico contém 29 ocorrências de criação/substituição de função (21 nomes distintos detectados), 21 ocorrências de criação de trigger (16 nomes detectados, incluindo texto comentado), 179 ocorrências lexicais de `CREATE POLICY`, 71 ativações de RLS e 17 ocorrências de `SECURITY DEFINER`.
- Foram detectados 53 nomes válidos de tabelas criadas no histórico. O arquivo TypeScript gerado descreve 62 tabelas, três views e 22 funções. Há objetos presentes somente nos tipos e outros somente nas migrações, inclusive variações como `diagnostico`/`diagnosticos` e versões diferentes da RPC de conversão de oportunidade.
- O histórico usa extensões `vector`, `moddatetime`, `pgcrypto`, `pg_cron` e `pg_net`.
- Há quatro ocorrências de criação de views e aproximadamente 140 ocorrências de criação de índices.
- Um job `pg_cron` agenda, a cada 15 minutos, uma chamada HTTP para sincronização de reuniões.
- Uma tabela `ai_generation_jobs` é adicionada à publicação `supabase_realtime`.
- O histórico contém 61 ocorrências de `USING (true)` e 32 de `WITH CHECK (true)`. Algumas políticas posteriores endurecem acessos anteriores, mas outras ainda concedem acesso amplo a qualquer papel `authenticated` ou `service_role`.
- O histórico registra 39 concessões (`GRANT`) e nenhuma ocorrência de `REVOKE`.
- A tabela `audit_logs` é criada, porém migrações imediatamente posteriores removem triggers de auditoria em tabelas relevantes.

**Inferências**

- Migrações e tipos gerados sofreram drift. Nenhum dos dois deve ser tratado isoladamente como schema final para estimativa ou migração.
- Políticas para “qualquer autenticado” podem ser adequadas a uma operação interna, mas não demonstram isolamento entre tenants.
- Funções `SECURITY DEFINER` exigem revisão individual de proprietário, `search_path`, privilégios de execução, validação de argumentos e possibilidade de bypass de RLS.

**Perguntas abertas**

- Qual é o schema efetivo por ambiente, incluindo políticas, owners, grants, triggers, extensões e objetos não versionados?
- Qual é a unidade canônica de tenant: organização, conta de cliente, cliente, projeto ou outra?
- Quais RPCs e triggers são realmente chamados e quais são legado morto?
- Existem jobs agendados, webhooks ou extensões criados fora das migrações?

## Storage

**Fatos verificados**

- Migrações criam ou referenciam os buckets lógicos `profiles`, `blog-covers`, `revhackers-uploads`, `rei-materials`, `task-attachments` e `meet_videos`.
- Há 37 referências a `storage.objects` no histórico e políticas para leitura pública, escrita autenticada e escrita administrativa, dependendo do bucket e da migração.
- O frontend também referencia `lovable-uploads`, que não aparece entre as criações de bucket detectadas nas 106 migrações.
- Migrações posteriores endurecem escrita nos buckets de materiais e uploads de sistema, mas leitura pública permanece necessária em alguns fluxos.

**Perguntas abertas**

- Quais buckets existem de fato, seus tamanhos, contagens, regiões, MIME types, limites, versionamento e políticas efetivas?
- Quais URLs públicas ou assinadas são persistidas em linhas do banco?
- Quais objetos são públicos por requisito de negócio e quais o são apenas por legado?

## Edge Functions e integrações

**Fatos verificados**

- Existem 32 diretórios ativos em `supabase/functions`: 31 funções implantáveis e `_shared`. Funções legadas observadas remotamente são reconciliadas separadamente.
- Inventário completo por domínio:

| Domínio | Funções versionadas |
|---|---|
| IA, análise e conteúdo | `agent-chat`, `agent-documents`, `analyze-diagnostic`, `analyze-meeting-transcript`, `analyze-site`, `auto-enrich-project`, `crux-benchmark`, `enrich-strategic-data`, `fetch-cnpj`, `generate-image`, `generate-playbook`, `generate-project-tasks`, `generate-strategic-plan`, `generate-success-plan`, `inspect-website`, `market-intelligence`, `process-meeting-audio`, `research-intelligence`, `scrape-profile`, `transcribe-meeting`, `trigger-post-rei-enrichment` |
| ClickUp | Removido do código ativo; tabelas/histórico preservados |
| GoHighLevel | `ghl-create-location`, `ghl-deploy-strategy`, `ghl-inspect`, `ghl-oauth-callback`, `ghl-oauth-refresh`, `ghl-outbound-relay`, `ghl-webhook-handoff` |
| Reuniões Google | `google-meetings` |
| Pagamentos | Removido do código ativo; novo fluxo ainda não definido |
| Administração de usuários | `delete-user`, `invite-member` |

- `supabase/config.toml` tem 30 seções: 27 com `verify_jwt=true` e três com `false`. Uma seção sem JWT aponta para uma função cujo diretório não existe. Dez diretórios implantáveis não têm seção explícita, logo sua configuração efetiva de deploy não está versionada de forma inequívoca.
- Os dois webhooks existentes explicitamente sem JWT validam segredo próprio em código. `clickup-sync`, sem seção explícita, implementa HMAC e contém uma exceção de desenvolvimento controlada por variável.
- Muitas funções criam cliente com `SUPABASE_SERVICE_ROLE_KEY`. Parte valida usuário via `getUser`; seis funções usam o helper compartilhado de autenticação, e cinco delas exigem papel administrativo em pelo menos uma operação.
- Existem encadeamentos entre funções, inclusive uma referência a `fill-rei-from-transcript`, cujo diretório não existe no inventário.
- Integrações detectadas incluem OpenAI, Anthropic, Google APIs/OAuth/PageSpeed e GoHighLevel. InfinitePay e ClickUp foram removidos do código ativo.

**Inferências**

- A migração das funções não é apenas conversão de runtime Deno para Cloud Run: envolve autenticação, idempotência, timeouts, retries, assinaturas de webhook, service role, chamadas entre funções e limites/custos de terceiros.
- Funções que elevam para service role sem autorização interna explícita dependem fortemente do gateway/configuração de deploy. Essa dependência deve ser provada, não presumida.

## Segurança e dados sensíveis observados

**Fatos verificados**

- Uma migração histórica contém um bearer token literal. O valor não é reproduzido nesta documentação.
- Código de webhook registra payload recebido, o que pode levar dados pessoais ou financeiros aos logs.
- Variáveis versionadas por nome abrangem chaves de IA, OAuth Google, GoHighLevel, webhooks, Supabase e credenciais FTP. Os valores não foram lidos.
- Arquivos `.env` e `*.pem` estão ignorados pelo Git.

**Inferências**

- O token embutido deve ser considerado exposto até que sua natureza, validade e rotação sejam verificadas por uma pessoa autorizada.
- Política de redação e retenção de logs é requisito de migração, não melhoria opcional.

## Limites de evidência

**Perguntas abertas prioritárias**

1. Quantos tenants, usuários, linhas e objetos existem por ambiente e qual o crescimento mensal?
2. Qual o tamanho do banco, working set, taxa de transações, conexões, consultas lentas e picos de concorrência?
3. Quais são SLA, RTO, RPO, retenção, residência de dados e requisitos LGPD/contratuais?
4. Quais recursos Supabase estão ativos fora do Git: Auth providers/templates/hooks, Realtime, Vault, cron, webhooks, backups e configurações de Storage?
5. Quais integrações têm ambientes sandbox e como se comportam em retries e duplicatas?
6. Qual é o custo atual e qual orçamento/limite aceitável para GCP e serviços terceiros?

Não foram verificados números de clientes pagantes, volume de linhas, tamanho de produção, concorrência, NPS ou SLA. Eles não podem ser usados em dimensionamento até haver fonte autorizada.
