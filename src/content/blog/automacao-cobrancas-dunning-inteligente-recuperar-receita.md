---
title: "Automação de Cobranças: Como Recuperar Receita Perdida com Dunning Inteligente"
description: "Involuntary churn representa 20-40% de todo churn em SaaS. Automação de cobranças (dunning) recupera até 70% dessa receita que seria perdida."
category: "Dados"
author: "giulliano-alves"
date: "2026-02-19"
---

Involuntary churn - quando o cliente sai porque o pagamento falhou, não porque quis cancelar - representa 20% a 40% de todo churn em SaaS (ProfitWell). É receita perdida por inércia operacional.

Dunning inteligente (automação de cobranças) recupera até 70% dessa receita, sem que o time de finança precise fazer nada manualmente.

---

## O Problema do Involuntary Churn

| Causa | Frequência | Solução |
|---|---|---|
| Cartão expirado | 45% | Aviso prévio + retry |
| Limite insuficiente | 25% | Retry em horário diferente |
| Dados incorretos | 15% | Email para atualizar dados |
| Banco bloqueou | 10% | Tentativa em outro método |
| Fraude | 5% | Verificação manual |

---

## Fluxo de Dunning Automatizado

| Dia | Ação | Canal |
|---|---|---|
| D-7 (antes vencimento) | Aviso: "Seu pagamento será cobrado em 7 dias" | Email |
| D0 (vencimento) | Cobrança automática | Gateway |
| D0 (falha) | Retry imediato | Gateway |
| D+1 | Email: "Houve um problema com seu pagamento" | Email |
| D+3 | Retry automático | Gateway |
| D+3 (falha) | SMS/WhatsApp: "Atualize seus dados de pagamento" | SMS |
| D+5 | Retry automático | Gateway |
| D+7 | Email: "Sua conta será suspensa em 3 dias" | Email |
| D+10 | Suspensão do acesso + email de recovery | Email |
| D+15 | Retry final | Gateway |
| D+30 | Cancelamento definitivo | Sistema |

---

## Estratégias Avançadas

| Estratégia | Resultado |
|---|---|
| Retry em horários diferentes (manhã vs noite) | +15% recovery |
| Retry no 1º dia do mês (mais saldo) | +20% recovery |
| Oferecer método alternativo (PIX, boleto) | +25% recovery |
| Email com 1-click update link | +30% engajamento |
| Downgrade automático ao invés de cancelar | +40% retenção |

---

## Implementação no CRM

No [Funnels](https://usefunnels.io), workflows de cobrança podem ser configurados com triggers de tag (ex: "pagamento_falhou") e automações de email + SMS em sequência.

---

## Métricas

| Métrica | Benchmark |
|---|---|
| Recovery rate (dunning) | 50% a 70% |
| Involuntary churn rate | < 3% ao mês |
| Revenue recovered/mês | 2% a 5% do MRR |
| Days to recovery | < 7 dias |
| Customer satisfaction após recovery | > 70% |

---

## Conclusão

Automação de cobranças é ROI garantido. Cada real investido em dunning inteligente retorna 5 a 10x em receita recuperada. Se você tem churn involuntário e não tem dunning, está queimando dinheiro.
