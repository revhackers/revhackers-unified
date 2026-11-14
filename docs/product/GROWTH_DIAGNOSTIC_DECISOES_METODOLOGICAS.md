# Diagnóstico Growth — Decisões Metodológicas Pendentes

> Status do scoring: **DEMONSTRATIVO — NÃO VALIDADO**. Todo número ou rótulo
> produzido pelo motor em `src/lib/growth-diagnostic/scoring.ts` é exibido na
> UI e nos dados com o selo `DEMONSTRATIVO`, e nenhuma conclusão deve ser
> tratada como metodologia definitiva.

## 1. Fontes reaproveitadas

| Fonte | O que foi reaproveitado | Arquivo:linha |
|---|---|---|
| GrowthScore Q1 (varinha mágica) | Eixo `estrategia` + pergunta | src/pages/GrowthScore.tsx:19-29 |
| GrowthScore Q2 (CAC teto) | Eixo `maturidade` + pergunta | src/pages/GrowthScore.tsx:31-40 |
| GrowthScore Q3 (matriz de risco) | Eixo `aquisicao` + pergunta | src/pages/GrowthScore.tsx:42-51 |
| GrowthScore Q4 (dobrar leads) | Eixo `automacao` + pergunta | src/pages/GrowthScore.tsx:53-62 |
| GrowthScore Q5 (ICP) | Eixo `posicionamento` + pergunta | src/pages/GrowthScore.tsx:64-73 |
| GrowthScore resultado/log | Texto de recomendação (`estrategia`, `posicionamento`, `maturidade`) | src/pages/GrowthScore.tsx:28,72,39 |
| RevenueScore Q1 (CRM) | Eixo `crm` + pergunta | src/pages/RevenueScore.tsx:21-31 |
| RevenueScore Q3 (MQL→SQL) | Eixo `marketing` + pergunta | src/pages/RevenueScore.tsx:44-53 |
| RevenueScore Q4 (SLA) | Eixo `revops` + pergunta | src/pages/RevenueScore.tsx:55-64 |
| RevenueScore logs | Textos de recomendação (`vendas`, `revops`) | src/pages/RevenueScore.tsx:63,74 |
| REI onboarding (lead_generation) | Eixo `demanda` + pergunta | src/data/reiOnboardingQuestions.ts:90-100 |
| REI onboarding (sales_process) | Eixo `vendas` + pergunta | src/data/reiOnboardingQuestions.ts:101-111 |
| REI onboarding (growth_goal) | Eixo `retencao` + pergunta | src/data/reiOnboardingQuestions.ts:160-170 |
| Metodologia (4 pilares) | Recomendações (`aquisicao`, `marketing`, `automacao`, `crm`) | src/pages/Metodologia.tsx:68-103 |
| Metodologia (ciclo) | Recomendações (`estrategia`, `posicionamento`, `demanda`, `retencao`) | src/pages/Metodologia.tsx:130-152 |
| diagnosticMapping (faixas) | `maturityBand`: < 50 crítico, < 90 alerta, >= 90 otimizado | src/utils/diagnosticMapping.ts:10-14 |
| diagnosticMapping (growth) | Títulos de banda da UI de resultados | src/utils/diagnosticMapping.ts:37-56 |
| publicDiagnostic | Assinatura `submitPublicDiagnostic` usada no lead-capture | src/api/publicDiagnostic.ts:24-30 |

## 2. Por que o scoring é demonstrativo

1. **Sem pesos por eixo**: o resultado geral é média aritmética simples dos
   11 eixos. Não há evidência de que todos os eixos pesem igual.
2. **Sem validação estatística**: nenhuma amostra, correlação com receita ou
   teste A/B sustenta os cortes ou as recomendações.
3. **Faixas herdadas, não calibradas**: os cortes < 50 / < 90 / >= 90 vêm do
   mapeamento dos diagnósticos existentes, que também não documentam
   calibração.
4. **Perguntas adaptadas, não testadas**: as 11 questões foram adaptadas de
   instrumentos diferentes (GrowthScore usa escala 0–20; REI onboarding usa
   0–100) e nunca aplicadas juntas.
5. **Recomendações genéricas por eixo**: o texto por eixo não varia por faixa
   de score nem por segmento da empresa.

## 3. Decisões pendentes

1. **Pesos por eixo**: definir se algum eixo (ex.: aquisição, CRM) deve pesar
   mais na média, e com qual evidência.
2. **Validação estatística**: definir amostra mínima, correlação esperada com
   receita/churn e responsável pela análise.
3. **Faixas de maturidade**: confirmar se os cortes 50/90 fazem sentido para
   11 eixos ou se precisam de recalibração.
4. **Nomenclatura dos 11 eixos**: validar com produto se os rótulos
   (ex.: `demanda` vs. `aquisicao`, `revops` vs. `crm`) não se sobrepõem.
5. **Origem de cada pergunta**: cada questão cita a fonte em `spec.ts`; falta
   decidir quais perguntas manter, reescrever ou substituir após testes com
   usuários reais.
6. **Integração com opportunities/GHL**: hoje o lead-capture envia
   `diagnostic_type: 'growth'` via `submitPublicDiagnostic`; falta definir o
   mapeamento oficial do novo diagnóstico no pipeline (tipo de oportunidade,
   evento GHL, follow-up).

## 4. Especificação funcional resumida + modelo de dados

- `src/lib/growth-diagnostic/spec.ts`: tipos `GrowthAxisId` (união dos 11
  eixos), `GrowthAxis` (id, label, description, source), `GrowthOption`
  (label, score, max), `GrowthQuestion` (axisId, text, options, source);
  constantes `GROWTH_AXES` (11 itens) e `GROWTH_QUESTIONS` (11, uma por eixo).
- `src/lib/growth-diagnostic/scoring.ts`: funções puras `normalizeOptionScore`
  (bruto→0-100, divisão segura), `computeAxisScores` (normaliza por eixo),
  `computeOverall` (média aritmética arredondada), `maturityBand`
  (crítico/alerta/otimizado), `axisRecommendation` (título, texto, fonte),
  `buildResult` (agrega tudo); constante
  `SCORING_STATUS = 'DEMONSTRATIVO_NAO_VALIDADO'`.
- `src/data/growthDiagnosticDemo.ts`: respostas de exemplo variadas por eixo
  + resultado derivado de `buildResult`, rotulados `DEMONSTRATIVO`.
- `src/pages/GrowthDiagnostic.tsx`: fluxo questions → lead-capture → results,
  com selo demonstrativo permanente e listagem por eixo com recomendação e
  fonte; rota isolada `/diagnostico-growth` registrada em `src/App.tsx`.
- Extensibilidade: adicionar um eixo = acrescentar itens nos arrays do spec;
  nenhuma função do scoring precisa mudar (eixos extras passam intactos pela
  média).
