# RevHackers

Repositório principal da RevHackers. A aplicação atual reúne o site institucional,
blog, materiais, cases, administração, REI e o hub de clientes.

## Estado atual

- Frontend: React, TypeScript e Vite.
- Dados, autenticação e funções: Supabase (infraestrutura legada em migração futura).
- Produção atual: Hostinger.
- Google Cloud: planejado, ainda não implantado para este projeto.

## Formulários e CRM

- Formulários nativos GHL na subconta S7HE; IDs em `src/config/ghl.ts`.
- Leads do site recebem a tag `origem:revhackers`; o e-mail de material sai pelo workflow GHL `RH · Entrega de material`.
- Deploy do site: Cloudflare Workers via `deploy-cloudflare.yml` (manual, confirmação `PUBLICAR`).

## Estrutura

```text
src/                         aplicação web principal
supabase/                    migrations e edge functions legadas
public/                      assets públicos
scripts/                     build, prerender, deploy e manutenção
tests/                       testes automatizados
docs/                        documentação técnica e histórico
experiments/polemic-led-growth/
                             experimento de landing page, fora da produção
```

## Desenvolvimento

```bash
npm install
npm run dev
```

## Validação

```bash
npm run build
npm run lint
npm test
```

O build também executa o prerender das páginas públicas. Arquivos `.env` são
locais e nunca devem ser versionados.

## Regras de organização

- Código ativo permanece na raiz deste repositório.
- Experimentos ficam em `experiments/` e não participam do build principal.
- Documentos privados, contratos, certificados e vídeos brutos ficam fora do Git.
- Builds (`dist/`), dependências (`node_modules/`) e arquivos temporários são gerados.
