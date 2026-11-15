# Checklist de ativacao segura (GHL analytics e ciclo de lead)

Frente: rh-ghl-analytics. Nenhum item aqui cria contato real, dispara
automacao ou altera config GHL/agencia/subconta. Ativacao em producao exige
todos os itens marcados e revisao da frente G (dona de `public/api/ghl.php`).

## Pre-condicoes (ambiente)

- [ ] Branch `giulliano-alves/rh-ghl-analytics` com PR aberto e CI verde.
- [ ] `tests/ghl-analytics-events.test.ts` e `tests/ghl-lead-lifecycle.test.ts`
      verdes localmente (`npx vitest run tests/ghl-analytics-events.test.ts tests/ghl-lead-lifecycle.test.ts`).
- [ ] Nenhum `fetch` real executado pelos testes (cobrado por assercao
      `fetchSpy not.toHaveBeenCalled`).
- [ ] `public/api/ghl.php` intocado por esta frente (`git status` sem o arquivo).
- [ ] Sem segredos em codigo, logs ou docs (sem tokens, IDs de campo, hosts).

## Ativacao da camada analytics (somente apos pre-condicoes)

1. [ ] Chamar `configureAnalytics({ sink: new DataLayerSink() })` uma unica vez
      na entrada do app. Antes disso o sink e noop e nada sai do browser.
2. [ ] Confirmar no GTM preview que chegam apenas os 6 eventos:
      `diagnostic_started`, `diagnostic_step_completed`, `diagnostic_completed`,
      `diagnostic_result_viewed`, `lead_submitted`, `cta_clicked`.
3. [ ] Inspecionar cada evento no dataLayer e provar ausencia de PII
      (sem email, nome, telefone, CNPJ, texto livre). Amostragem minima: 1
      sessao completa de diagnostico por tipo (growth, revenue, founder, site).
4. [ ] Instrumentar os emissores nos forms (um PR por grupo, sem mudar o relay):
      inicio/passo/conclusao/resultado nos diagnosticos, `lead_submitted` nos
      8 forms, `cta_clicked` nos CTAs principais.
5. [ ] Revisao LGPD dos campos de texto livre (`message`): confirmar que seguem
      fora do analytics (contrato §5, risco 4).

## Ativacao do adapter de ciclo (`ghlLeadAdapter.ts`)

6. [ ] Migrar UM formulario por vez para `submitLeadLifecycleStage`, com
      `lgpdConsent` ligado a prova de consentimento visivel no form.
7. [ ] Ordem sugerida: newsletter > download > contato > diagnosticos > REI.
8. [ ] Cada migracao: teste manual em staging com sender de observacao
      (logar `eventType` + chaves do payload, nunca valores de PII) e
      confirmacao de que nenhuma automacao GHL disparou fora do esperado.
9. [ ] `ContactForm` e `download-form`: registrar prova de consentimento no
      payload (`lgpd_consent: true`) antes de liberar (contrato §5, riscos 1 e 2).
10. [ ] CNPJ continua fora do payload GHL (assegurado por `sanitizeLeadForGHL`
      e coberto por teste). Qualquer excecao exige revisao LGPD previa.

## Rollback

- [ ] Analytics: `resetAnalytics()` volta ao noop imediatamente, sem deploy
      de emergencia (nenhum dado sai do browser).
- [ ] Adapter: reverter o import do form ao `sendToGHL` direto restaura o
      comportamento anterior; o relay legado permanece intacto.
- [ ] Em caso de disparo indevido de automacao: pausar no painel GHL (frente G)
      e registrar incidente antes de reativar qualquer item acima.
