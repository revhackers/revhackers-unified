---
title: "Email Deliverability: O Guia Técnico para Seus Emails Chegarem na Caixa de Entrada"
description: "21% dos emails legítimos não chegam na inbox. Deliverability não é sobre conteúdo, é sobre infraestrutura técnica. SPF, DKIM, DMARC e domain warming são essenciais."
category: "Automação e IA"
author: "giulliano-alves"
date: "2026-01-20"
---

21% dos emails legítimos não chegam na inbox (ReturnPath). O problema não é o conteúdo - é a infraestrutura. Sem SPF, DKIM e DMARC configurados corretamente, seus emails vão para spam.

---

## Os 3 Pilares Técnicos

| Protocolo | O que Faz | Prioridade |
|---|---|---|
| SPF | Autoriza servidores a enviar em seu nome | Obrigatório |
| DKIM | Assina digitalmente o email | Obrigatório |
| DMARC | Define política para falhas de SPF/DKIM | Obrigatório |

---

## Checklist de Deliverability

| Item | Status Ideal |
|---|---|
| SPF configurado | Pass |
| DKIM configurado | Pass |
| DMARC policy | p=quarantine ou p=reject |
| Domain age | > 30 dias |
| Domain warming | 2-4 semanas |
| Bounce rate | < 2% |
| Spam complaint rate | < 0.1% |
| Unsubscribe rate | < 0.5% |
| HTML/Text ratio | 60/40 |
| Links/email | < 3 |
| Image/text ratio | < 40% imagem |

---

## Domain Warming Schedule

| Dia | Emails/dia | Target |
|---|---|---|
| D1-3 | 10-20 | Contatos que abrem |
| D4-7 | 30-50 | Contatos engajados |
| D8-14 | 50-100 | Expandir lista |
| D15-21 | 100-200 | Lista completa |
| D22-30 | 200-500 | Volume normal |
| D30+ | Volume final | Manter consistência |

---

## Spam Words para Evitar

| Categoria | Exemplos |
|---|---|
| Urgência falsa | "Urgente", "Última chance", "Agora" |
| Promessa exagerada | "Garantido", "100% free", "Sem risco" |
| Financeiro | "Desconto", "Promoção", "Oferta" |
| ALL CAPS | Qualquer palavra em maiúscula |

---

## Implementação

O [Funnels](https://usefunnels.io) tem guia nativo de configuração de SPF, DKIM e DMARC, e ferramentas de domain warming integradas para garantir deliverability máxima.
