---
title: "Customer Health Score: Como Prever Churn Antes que Aconteça"
description: "O churn não acontece no cancelamento. Acontece meses antes, quando o cliente para de ver valor. Aprenda a construir um Health Score que prevê e previne churn."
category: "Customer Success"
author: "giulliano-alves"
date: "2026-03-07"
---

O cancelamento de um cliente nunca é uma surpresa para quem está prestando atenção. O churn começa meses antes do email de cancelamento: quando o login frequency cai, quando o champion interno troca de emprego, quando o ticket de suporte fica sem resposta por semanas.

O Customer Health Score é a ferramenta que permite identificar esses sinais antecipadamente e agir antes que seja tarde. Este artigo detalha como construir, calibrar e operacionalizar um Health Score eficaz.

---

## Por que Churn é Sintoma, Não Doença

O cancelamento formal é o último ato de um relacionamento que se deteriorou ao longo de semanas ou meses. A doença real pode ser qualquer uma destas:

| Causa Raiz | Sinais Precoces | Tempo Até Churn |
|---|---|---|
| Nunca encontrou valor (bad fit ou onboarding falho) | Baixa ativação, poucos logins | 30 a 90 dias |
| Champion saiu da empresa | Engajamento cai, QBRs cancelados | 60 a 120 dias |
| Problema não resolvido pelo suporte | Tickets reabertos, escalações | 90 a 180 dias |
| Concorrente ofereceu alternativa | Pedidos de comparação, benchmark | 30 a 90 dias |
| Corte de orçamento | Pedido de downgrade, delay em renovação | 60 a 120 dias |

Um Health Score bem construído captura esses sinais antes que o cliente tome a decisão de cancelar.

---

## Os 4 Componentes do Health Score

O Health Score ideal combina quatro dimensões com pesos diferentes, calibrados para refletir a importância relativa de cada uma na previsão de retenção.

### Componente 1: Uso do Produto (40% do peso)

O uso do produto é o indicador mais forte de saúde porque reflete valor percebido. Se o cliente usa frequentemente e com profundidade, é muito provável que esteja obtendo valor.

| Indicador | Como Medir | Benchmark Saudável |
|---|---|---|
| Login frequency | Unique active users / semana | > 3x/semana |
| Feature adoption | % de features core usadas | > 60% |
| Depth of use | Ações por sessão | > 5 ações/sessão |
| Breadth of use | Departamentos ou times ativos | > 2 times |
| DAU/MAU ratio | Usuários diários / mensais | > 20% |

### Componente 2: Engajamento Humano (30% do peso)

O engajamento humano mede a qualidade do relacionamento entre a empresa e o cliente. Clientes que participam de QBRs, respondem emails e dão feedback estão engajados. Clientes que somem são um sinal de alerta.

| Indicador | Como Medir | Benchmark Saudável |
|---|---|---|
| Resposta a emails do CS | Tempo médio de resposta | < 24h |
| Participação em QBRs | % de QBRs que o sponsor participa | > 75% |
| NPS ou CSAT | Score mais recente | NPS > 40, CSAT > 4.0 |
| Engajamento com conteúdo | Webinars, eventos, comunidade | Pelo menos 1 interação/mês |
| Referral ou advocacy | Indicou outro cliente | Indicativo de saúde excelente |

### Componente 3: Saúde Financeira (20% do peso)

A saúde financeira do relacionamento indica se existe atrito comercial. Pagamentos atrasados, disputas de cobrança e pedidos de desconto são sinais de insatisfação latente.

| Indicador | Como Medir | Benchmark Saudável |
|---|---|---|
| Pagamento em dia | % de invoices pagas no prazo | > 95% |
| Disputas de cobrança | Número de disputas abertas | 0 |
| Pedidos de desconto na renovação | Frequência | 0 a 1 |
| Contrato (anual vs mensal) | Tipo de contrato | Anual |

### Componente 4: Suporte (10% do peso)

O volume e a qualidade das interações de suporte revelam se o produto está gerando fricção ou frustração.

| Indicador | Como Medir | Benchmark Saudável |
|---|---|---|
| Volume de tickets/mês | Número absoluto | < 2 tickets/mês |
| Tempo de resolução | Média de horas | < 24h |
| CSAT de suporte | Score de satisfação | > 4.0/5.0 |
| Tickets reabertos | % reabertos | < 10% |
| Escalações | Número de escalações | 0 |

---

## Escala do Health Score e Zonas de Ação

O Health Score final é a soma ponderada dos 4 componentes, normalizada para uma escala de 0 a 100.

| Zona | Score | Classificação | Ação Principal | Responsável | SLA |
|---|---|---|---|---|---|
| Verde | 80 a 100 | Saudável | Identificar oportunidade de expansão | Account Manager | Revisão mensal |
| Amarelo | 60 a 79 | Atenção | Agendar call de value review | CSM | Ação em < 48h |
| Vermelho | < 60 | Risco | Escalação + plano de recuperação | CS Manager + CSM | Ação em < 24h |

---

## Playbook por Zona

### Zona Verde (80 a 100): Expansão

Clientes na zona verde são candidatos naturais para expansão. O foco deve ser identificar e capturar oportunidades de upsell, cross-sell e seat expansion.

1. Agendar QBR de valor com foco em ROI documentado
2. Apresentar novas features ou módulos relevantes
3. Solicitar referral ou depoimento
4. Envolver Account Manager para discutir expansão

### Zona Amarela (60 a 79): Prevenção

Clientes na zona amarela precisam de atenção proativa antes de escorregarem para o vermelho.

1. CSM agenda call de value review em até 48 horas
2. Identificar qual componente do Health Score está baixo
3. Criar plano de ação com 3 a 5 iniciativas específicas
4. Implementar check-in semanal até o score voltar ao verde

### Zona Vermelha (< 60): Recuperação

Clientes no vermelho estão em risco iminente de churn. A resposta deve ser imediata e envolver liderança.

1. CS Manager é notificado em < 1h
2. Call de emergência com sponsor do cliente em < 24h
3. Plano de recuperação em 30 dias com milestones semanais
4. Envolver produto/engineering se o problema for técnico
5. Escalação para VP de CS se necessário

---

## Como Calibrar os Pesos

Os pesos padrão (40% produto, 30% engajamento, 20% financeiro, 10% suporte) são um bom ponto de partida, mas devem ser calibrados com dados reais.

O processo de calibração:

1. **Colete dados de churn**: liste todos os clientes que cancelaram nos últimos 12 meses
2. **Analise os indicadores pré-churn**: quais indicadores estavam baixos nos 90 dias antes do cancelamento?
3. **Ajuste os pesos**: se 70% dos churning customers tinham uso baixo, aumente o peso de produto
4. **Valide a cada trimestre**: recalibre os pesos com novos dados a cada 3 meses

---

## Implementação Técnica

| Stack | Ferramenta | Como Usar |
|---|---|---|
| **CS Platform** | Gainsight, Totango, ChurnZero | Cálculo automático do Health Score |
| **CRM** | HubSpot, Salesforce | Dados de engajamento e financeiro |
| **Product Analytics** | Mixpanel, Amplitude, Pendo | Dados de uso do produto |
| **Suporte** | Zendesk, Intercom | Dados de tickets e CSAT |
| **Dashboard** | Metabase, Looker | Visualização unificada |

Se não tiver uma plataforma de CS, comece com uma planilha. O Health Score mais simples do mundo é:

1. O cliente logou esta semana? (Sim/Não)
2. O champion respondeu o último email? (Sim/Não)
3. Pagou em dia no último mês? (Sim/Não)

Se todas as respostas são "Sim", o cliente provavelmente está saudável. Se alguma é "Não", investigue.

---

## Erros Comuns na Implementação

1. **Health Score baseado apenas em NPS**: NPS é uma foto pontual. Health Score deve ser contínuo.
2. **Pesos arbitrários que nunca são recalibrados**: os pesos devem refletir a realidade dos seus dados de churn.
3. **Criar o score mas não agir**: o score só tem valor se existem playbooks claros para cada zona.
4. **Não incluir dados de produto**: muitas empresas usam apenas engagement humano. Dados de uso do produto são o melhor preditor de churn.

---

## Conclusão

O Customer Health Score é a ferramenta mais poderosa da operação de Customer Success. Quando bem construído e operacionalizado, permite identificar riscos de churn com 60 a 90 dias de antecedência e agir antes que o cliente tome a decisão de cancelar.

Comece simples: 4 componentes, 3 zonas, 3 playbooks. Refine com dados reais ao longo do tempo.
