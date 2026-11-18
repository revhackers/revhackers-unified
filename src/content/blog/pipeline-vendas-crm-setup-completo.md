---
title: "Pipeline de Vendas no CRM: Setup Completo do Zero ao Forecast"
description: "Um pipeline mal configurado é pior que nenhum pipeline. Aprenda a definir estágios, critérios, probabilidades e automações para um CRM que realmente funciona."
category: "CRM e ferramentas"
author: "giulliano-alves"
date: "2026-03-11"
---

O pipeline de vendas é a espinha dorsal de qualquer operação comercial. É a representação visual de onde cada oportunidade está no processo de vendas, quanto vale e quando espera fechar.

Um pipeline bem configurado transforma o CRM de uma agenda de contatos em uma máquina de previsibilidade. Um pipeline mal configurado, por outro lado, gera dados falsos, forecast impreciso e decisões erradas.

Este artigo é o guia completo para configurar um pipeline do zero, com estágios, critérios, probabilidades e automações que funcionam.

---

## Por que a Maioria dos Pipelines Falha

| Problema | Consequência |
|---|---|
| Estágios demais (10+) | Vendedores não atualizam |
| Sem critérios claros | Deals ficam no estágio errado |
| Sem probabilidades | Forecast é chutômetro |
| Único pipeline para tudo | Mistura new business com renewal |
| Sem automação | Atualização depende de memória humana |
| Deals eternos | Pipeline inflado com deals mortos |

---

## O Pipeline Ideal: 5 a 6 Estágios

| # | Estágio | Critério de Entrada | Critério de Saída | Probabilidade |
|---|---|---|---|---|
| 1 | Lead Qualificado | ICP confirmado, dor identificada | Discovery agendado | 10% |
| 2 | Discovery Feito | SPICED completo (Situation, Pain, Impact, Critical Event, Decision) | Demo/proposta aceita | 20% |
| 3 | Proposta Enviada | Proposta formal enviada e recebida | Feedback do prospect | 40% |
| 4 | Negociação | Proposta sendo discutida, termos em revisão | Decisão final comunicada | 60% |
| 5 | Verbal Commit | Prospect disse "sim", contrato em revisão | Contrato assinado | 85% |
| 6 | Fechado (Won/Lost) | Contrato assinado ou deal declarado perdido | N/A | 100% / 0% |

### Por que 5 a 6 e Não 3 ou 10?

Poucos estágios demais não capturam as nuances do processo. Estágios demais criam atrito e os vendedores param de atualizar.

A regra: cada estágio deve representar uma ação verificável. Se o critério é subjetivo ("o prospect pareceu interessado"), não é um estágio real.

---

## Pipelines Separados por Tipo de Receita

Não misture tudo em um pipeline. Crie pipelines separados:

| Pipeline | Quando Usar | Estágios Típicos |
|---|---|---|
| **New Business** | Vendas para novos clientes | Lead → Discovery → Proposta → Negociação → Won/Lost |
| **Renewal** | Renovação de contratos existentes | 90 dias antes → Contato → Proposta → Renew/Churn |
| **Expansion** | Upsell/cross-sell para clientes | Oportunidade identificada → Qualificação → Proposta → Won/Lost |
| **Partner** | Vendas via canais/parceiros | Indicação → Qualificação → Co-sell → Won/Lost |

No [Funnels CRM](https://usefunnels.io), é possível criar múltiplos pipelines com estágios independentes e ver o pipeline value de cada um separadamente no dashboard.

---

## Configurando Automações no Pipeline

| Trigger | Ação | Benefício |
|---|---|---|
| Deal entra em "Proposta" | Criar task: follow-up em 3 dias | Não esquecer de cobrar resposta |
| Deal parado > 14 dias | Notificar manager | Deals mortos são identificados |
| Deal entra em "Won" | Criar onboarding task no CS | Handoff automático |
| Deal entra em "Lost" | Formulário: motivo da perda | Dados para melhorar processo |
| Deal value > R$50k | Notificar VP Sales | Deals estratégicos têm visibilidade |

---

## Pipeline Metrics: O que Medir

| Métrica | Fórmula | Benchmark |
|---|---|---|
| Pipeline Value | Soma de todos os deals ativos | > 3x a meta do período |
| Pipeline Coverage | Pipeline Value / Meta | 3x a 4x |
| Win Rate | Won / (Won + Lost) | 20% a 35% |
| Avg Deal Size | Revenue / # Deals Won | Por segmento |
| Sales Cycle | Dias do Lead Qualificado ao Won | 30 a 90 dias (mid-market) |
| Velocity | (# Deals × Win Rate × ACV) / Sales Cycle | Crescendo mês a mês |
| Conversion Rate por Estágio | % que avança para o próximo estágio | Varia por indústria |

---

## Limpeza de Pipeline: A Disciplina que Falta

Deals mortos inflam o pipeline e geram forecast falso. Regras de higiene:

| Regra | Ação |
|---|---|
| Deal sem atividade > 2x sales cycle | Mover para Lost |
| Deal sem next step definido | Cobrar AE na pipeline review |
| Deal sem champion identificado | Questionar se é real |
| Deal com data de fechamento vencida 3x | Mover para Lost |

A pipeline review semanal é onde essa higiene acontece. Sem ela, o pipeline se torna ficção.

---

## De Pipeline para Forecast

O pipeline alimenta o forecast. Mas não basta somar tudo:

| Categoria | Definição | Como Calcular |
|---|---|---|
| **Commit** | Deals com > 80% de chance | Soma dos deals em Verbal Commit |
| **Best Case** | Deals com 40% a 80% | Soma dos deals em Negociação |
| **Pipeline** | Deals com 10% a 40% | Soma dos deals em Discovery/Proposta |

Forecast = Commit + (% de Best Case baseado em histórico)

---

## Erros Comuns na Configuração do Pipeline

1. **Estágio "Interessado"**: não é verificável. Um contato "interessado" pode não ter dor real.
2. **Probabilidade igual para todos**: um deal de R$10k tem dinâmica diferente de um de R$200k.
3. **Não registrar Lost**: sem dados de perda, não há como melhorar.
4. **Pipeline único para todos os produtos**: cada produto pode ter ciclo e estágios diferentes.
5. **Sem date limite**: deals que ficam no pipeline para sempre destroem a previsibilidade.

---

## Conclusão

O pipeline é o coração do CRM. Um pipeline bem configurado, com 5 a 6 estágios, critérios claros, automações e métricas, transforma sua operação de vendas de um processo manual e imprevisível em uma máquina de previsibilidade.

Comece com um pipeline simples, meça tudo, limpe semanalmente e ajuste com base nos dados.
