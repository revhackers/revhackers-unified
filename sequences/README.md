# Sequências de email e cadências — convenção

Todo conteúdo de email/cadência mora aqui, junto da oferta que ele vende.
Encanamento (workflows, campos, webhooks, IDs) fica na worktree Automações GHL.

## Estrutura

```
sequences/<oferta>/
  README.md        — oferta, público, promessa, CTA principal
  email-01.md      — …email-NN.md, na ordem de disparo
```

## Nome de arquivo

`email-NN-<gancho-curto>.md` — ex.: `email-02-caso-antes-depois.md`.
NN com zero à esquerda para ordenar no disco.

## Cabeçalho de cada email (front-matter)

```md
---
assunto: [assunto do email]
preheader: [pré-cabeçalho]
dia: D+2
gatilho: [abriu email-01 | clicou | todos]
cta: [url ou ação]
---
```

Corpo em markdown simples: uma ideia por email, um CTA.
Sem segredos, chaves ou IDs reais de contato — só placeholders.
