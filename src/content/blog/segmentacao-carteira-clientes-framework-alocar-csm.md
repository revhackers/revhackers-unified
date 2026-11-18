---
title: "Segmentação de Carteira: O Framework para Alocar CSMs por Valor e Risco"
description: "Tratar todos os clientes igual é injusto - para os clientes e para o time. Segmentação por valor e risco garante que cada conta receba o nível correto de atenção."
category: "Customer Success"
author: "giulliano-alves"
date: "2026-02-10"
---

Um CSM que trata uma conta de R$500/mês igual a uma de R$50.000/mês está queimando recurso. E uma conta de R$50.000/mês que não recebe atenção churn a um custo absurdo.

Segmentação resolve: cada conta recebe o nível correto de atenção, baseado em valor e risco.

---

## A Matriz de Segmentação

| Segmento | ACV | Modelo | Ratio |
|---|---|---|---|
| Enterprise | > R$100k/ano | High-touch dedicado | 1:15 |
| Mid-Market | R$20k-100k/ano | High-touch compartilhado | 1:40 |
| Growth | R$5k-20k/ano | Low-touch + digital | 1:200 |
| SMB | < R$5k/ano | Tech-touch (automação pura) | 1:1.000+ |

---

## Modelo de Atendimento por Segmento

| Ação | Enterprise | Mid-Market | Growth | SMB |
|---|---|---|---|---|
| Welcome call | 1h, personalizada | 30min, template | Gravação | Email |
| Check-ins | Semanal | Quinzenal | Mensal (auto) | Trimestral (auto) |
| EBR | Trimestral | Semestral | Anual (auto) | - |
| Training | 1-on-1 | Grupo | Webinar | Self-service |
| Support SLA | 2h | 4h | 24h | 48h |
| CSM dedicado | Sim | Sim | Pool | - |

---

## Implementação no CRM

No [Funnels](https://usefunnels.io), use tags de segmento para rotear automaticamente cada conta para o pipeline e workflow correto. Um único CSM pode gerenciar Growth + SMB enquanto outro foca em Enterprise.
