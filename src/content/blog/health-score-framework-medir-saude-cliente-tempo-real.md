---
title: "Health Score Framework: Como Medir a Saúde do Cliente em Tempo Real"
description: "Health Score é o GPS do Customer Success. Sem ele, você dirige às cegas. Com ele, sabe exatamente quais clientes precisam de atenção e quais estão prontos para upsell."
category: "Customer Success"
author: "giulliano-alves"
date: "2026-02-16"
---

Você sabe quais dos seus clientes estão prestes a cancelar? E quais estão prontos para expandir? Sem Health Score, a resposta é feeling. Com Health Score, é dado.

Este framework combina 6 dimensões de saúde do cliente para criar um score que prevê churn e identifica oportunidades de expansão, em tempo real.

---

## As 6 Dimensões do Health Score

### 1. Product Usage (Peso: 30%)

| Indicador | Cálculo | Score |
|---|---|---|
| Login frequency | Logins/semana vs baseline | 0-100 |
| Feature adoption | Features core usadas/total | 0-100 |
| Data volume | Registros criados/mês | 0-100 |
| Session duration | Tempo médio por sessão | 0-100 |

### 2. Engagement (Peso: 20%)

| Indicador | Cálculo | Score |
|---|---|---|
| Emails abertos | Open rate últimos 30 dias | 0-100 |
| Calls atendidas | Calls com CSM realizadas | 0-100 |
| Events participados | Webinars, treinamentos | 0-100 |
| NPS/CSAT responses | Respondeu pesquisa? | 0-100 |

### 3. Support (Peso: 15%)

| Indicador | Cálculo | Score |
|---|---|---|
| Ticket volume | Tickets/mês (invertido) | 0-100 |
| Ticket severity | % críticos (invertido) | 0-100 |
| Resolution time | Tempo médio resolução | 0-100 |
| CSAT suporte | Satisfação com suporte | 0-100 |

### 4. Satisfaction (Peso: 15%)

| Indicador | Cálculo | Score |
|---|---|---|
| NPS | Último NPS do contato | 0-100 |
| CSAT | Último CSAT | 0-100 |
| Feedback qualitativo | Sentimento nas calls | 0-100 |

### 5. Contract (Peso: 10%)

| Indicador | Cálculo | Score |
|---|---|---|
| Renewal proximity | Dias até renovação | 0-100 |
| Expansion history | Upgrades anteriores | 0-100 |
| Contract value trend | Valor crescendo ou caindo | 0-100 |

### 6. Payment (Peso: 10%)

| Indicador | Cálculo | Score |
|---|---|---|
| Payment history | Pagamentos em dia? | 0-100 |
| Outstanding invoices | Faturas pendentes | 0-100 |

---

## Classificação e Ações

| Score | Status | Cor | Ação |
|---|---|---|---|
| 80-100 | Healthy | Verde | Upsell/referral |
| 60-79 | Neutral | Amarelo | Monitorar, check-in |
| 40-59 | At Risk | Laranja | CSM ativo, plano de ação |
| 0-39 | Critical | Vermelho | Escalation imediata |

---

## Implementação

No [Funnels](https://usefunnels.io), Health Score pode ser implementado via tags e custom fields, com automações que alertam o CSM quando o score muda de classificação.
