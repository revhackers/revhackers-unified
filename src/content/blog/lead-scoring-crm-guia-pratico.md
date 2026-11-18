---
title: "Lead Scoring no CRM: Guia Prático para Priorizar os Leads Certos"
description: "Nem todo lead merece a mesma atenção. Lead Scoring separa os quentes dos frios de forma automática. Veja como construir um modelo que funciona."
category: "CRM e ferramentas"
author: "giulliano-alves"
date: "2026-03-06"
---

Sem Lead Scoring, vendedores tratam todos os leads como iguais. O resultado: gastam 67% do tempo com leads que nunca vão comprar (Gartner) e perdem os leads quentes que comprariam se recebessem atenção.

Lead Scoring é o sistema que atribui pontuação a cada lead com base em perfil e comportamento, permitindo que o time de vendas foque nos leads com maior probabilidade de conversão.

Este artigo mostra como construir um modelo de Lead Scoring no CRM, sem complexidade desnecessária.

---

## Os Dois Tipos de Score

| Tipo | O que Mede | Exemplos |
|---|---|---|
| **Fit Score** (perfil) | Quanto o lead se parece com o ICP | Cargo, tamanho da empresa, setor, localização |
| **Engagement Score** (comportamento) | Quanto o lead interage com a marca | Visitas ao site, emails abertos, downloads, reuniões |

A combinação dos dois gera o **Lead Score total**.

---

## Construindo o Fit Score

| Critério | Pontuação Sugerida | Justificativa |
|---|---|---|
| Cargo: C-Level/VP | +30 | Decision maker |
| Cargo: Manager | +20 | Influenciador forte |
| Cargo: Analista | +10 | Pesquisador |
| Empresa: 50 a 500 funcionários | +25 | Segmento ideal |
| Empresa: 10 a 50 | +15 | Potencial |
| Empresa: > 500 | +10 | Ciclo mais longo |
| Setor: SaaS/Tech | +20 | ICP primário |
| Setor: outros B2B | +10 | ICP secundário |
| Localização: Brasil | +10 | Mercado-alvo |

### Score Negativo (Desqualificação)

| Critério | Pontuação |
|---|---|
| Email pessoal (gmail/hotmail) | -20 |
| Estudante/estagiário | -30 |
| Empresa < 5 pessoas | -15 |
| Setor: governo/educação (se não for ICP) | -20 |
| Concorrente | -50 |

---

## Construindo o Engagement Score

| Comportamento | Pontuação | Decay |
|---|---|---|
| Visitou página de pricing | +25 | Reseta após 30 dias |
| Abriu 3+ emails na semana | +15 | Reseta após 14 dias |
| Baixou material (ebook, guia) | +20 | Reseta após 30 dias |
| Assistiu webinar/vídeo | +15 | Reseta após 30 dias |
| Pediu demo/contato | +40 | Não decai |
| Visitou 5+ páginas | +10 | Reseta após 14 dias |
| Abriu proposta | +30 | Não decai |
| Sem interação > 30 dias | -20 | N/A |

O **decay** (decaimento) é essencial. Um lead que visitou o site há 6 meses não é mais "quente".

---

## Classificação dos Leads

| Score Total | Classificação | Ação |
|---|---|---|
| 80+ | Hot (MQL) | Transferir para vendas imediatamente |
| 50 a 79 | Warm | Nurturing intensivo + SDR qualifica |
| 20 a 49 | Cool | Nurturing automático |
| < 20 | Cold | Manter em lista, não investir tempo |

---

## Implementação no CRM

| Passo | Ação | Ferramenta |
|---|---|---|
| 1 | Definir ICP (fit criteria) | Workshop com vendas + marketing |
| 2 | Mapear comportamentos (engagement criteria) | Analytics + CRM |
| 3 | Atribuir pontuações | Configuração no CRM |
| 4 | Definir thresholds (MQL, SQL) | Acordo marketing + vendas |
| 5 | Configurar automações de routing | CRM workflow |
| 6 | Calibrar mensalmente | Review de conversão |

No [Funnels CRM](https://usefunnels.io), o Lead Scoring é configurado com regras visuais, onde cada critério de fit e comportamento recebe uma pontuação. O score é atualizado automaticamente e alimenta workflows de routing.

---

## Erros Comuns no Lead Scoring

1. **Scoring baseado apenas em perfil**: Um VP que nunca interagiu não é mais valioso que um Manager que pediu demo
2. **Sem decaimento**: Scores que só sobem criam falsos positivos
3. **Thresholds fixos demais**: Calibre trimestralmente com base em dados de conversão real
4. **Scoring sem SLA**: Se marketing gera MQLs e vendas não aborda em 24h, o scoring perde o valor
5. **Complexidade demais**: 5 a 8 critérios de fit + 5 a 8 de engagement são suficientes para 80% das empresas

---

## Métricas de Sucesso do Lead Scoring

| Métrica | Benchmark |
|---|---|
| MQL to SQL rate | > 40% |
| SQL to Won rate | > 15% |
| Tempo MQL → primeiro contato | < 24 horas |
| False positive rate (MQL que nunca converte) | < 30% |
| Score accuracy (revisão trimestral) | Ajustar critérios com base em dados |

---

## Conclusão

Lead Scoring é a ponte entre marketing e vendas. Sem ele, marketing entrega leads de baixa qualidade e vendas reclama. Com ele, os leads certos chegam aos vendedores certos no momento certo.

Comece simples: 5 critérios de fit, 5 de engagement, 4 classificações. Calibre mensalmente. O modelo nunca estará perfeito, mas estará melhor que "tratar todo lead igual".
