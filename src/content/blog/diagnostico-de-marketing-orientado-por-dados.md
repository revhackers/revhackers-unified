---
title: "Diagnóstico de Marketing: Orientado por dados"
description: "Um guia completo para extrair insights acionáveis dos dados da sua operação de marketing."
category: "Dados"
author: "equipe-revhackers"
date: "2024-02-15"
---

**Dados não tomam decisão**

Ter um dashboard lindo no PowerBI não resolve nada se ninguém sabe o que fazer com ele. A maioria das empresas sofre de "Paralisia por Análise". O objetivo dos dados é matar opiniões e acelerar decisões, não criar reuniões de 4 horas para discutir a cor do gráfico.

## Resumo

- **Garbage In, Garbage Out:** Se seus dados de entrada (input) estão sujos (UTMs erradas, CRM desatualizado), seus relatórios são ficção. Limpe a fonte antes de construir o dashboard.
- **Uma Métrica que Importa (OMTM):** Em cada fase da empresa, existe apenas UMA métrica que importa. Early stage? Retenção. Scale up? CAC/LTV. Foque tudo nela.
- **Contexto > Número:** Dizer 'Tivemos 100 leads' não diz nada. 'Tivemos 100 leads, 30% a mais que mês passado, com a mesma verba' é uma história.
- **Atribuição é Mito:** Não existe modelo de atribuição perfeito (Last click, First click, Linear). Escolha um, entenda suas falhas, e siga com ele. Consistência vence perfeição.

## Data-Driven Marketing

Tomar decisões baseadas em evidências quantitativas e qualitativas, não em intuição ou hierarquia (HiPPO - Highest Paid Person's Opinion).

**Visão Amadora:** "Olhar o Google Analytics todo dia."

**Visão Profissional:** "Rodar experimentos controlados, medir resultados com significância estatística e iterar."

## A Pirâmide de Métricas

### Métricas de Vaidade (O que Ignorar)

Likes, Pageviews, Número de leads (sem qualificação). Elas massageiam o ego mas não pagam boleto.

### Métricas de Saúde (O que Monitorar)

CAC, LTV, Churn, NPS. Elas dizem se a empresa vai morrer mês que vem.

### Métricas de Ação (Onde Focar)

Taxa de Conversão por Etapa, Custo por Oportunidade, Ciclo de Venda. Elas dizem onde você deve trabalhar hoje.

## Templates de Governança

### Audit de Tracking (GTM)

**Assunto:** Checklist de Higiene de Dados

```
1. UTMs Padronizadas:
[ ] Todas as campanhas usam utm_source, utm_medium e utm_campaign?
[ ] Nomenclatura consistente (ex: 'linkedin' sempre minúsculo)?
[ ] Se não, seus dados de atribuição são lixo.

2. Eventos de Conversão:
[ ] O evento 'Lead' dispara na visualização do form ou no sucesso do envio? (Deve ser no sucesso)
[ ] O evento 'Venda' bate com o CRM? (Margem de erro < 5%)

3. Exclusão de IPs Internos:
[ ] O tráfego dos funcionários está filtrado no GA4?
```

### Relatório Mensal de Performance

**Assunto:** Modelo para Diretoria

```
Resumo Executivo:
- Investimento Total: R$ [Valor]
- Receita Gerada (Atribuída): R$ [Valor]
- ROAS: [X]x

O que funcionou (Scale):
- Campanha [A] no LinkedIn (CPL R$ 20, Qualificação 40%)

O que não funcionou (Kill/Fix):
- Campanha [B] no Google (CPL R$ 80, Qualificação 10%)

Próximos Passos:
- Parar [B], Dobrar orçamento de [A].
- Testar nova Landing Page para reduzir CAC em 15%.
```

## Sinais de Analfabetismo de Dados

- Relatórios que só mostram 'O Quê' e não 'Porquê'. (Ex: O tráfego caiu. Por quê? Não sei.)
- Confundir Correlação com Causalidade. (Ex: 'Lançamos a feature nova e as vendas subiram'. Talvez tenha sido a Black Friday.)
- Ignorar a Sazonalidade. (Comparar Fevereiro com Março sem ajustar pelos dias úteis ou Carnaval).
