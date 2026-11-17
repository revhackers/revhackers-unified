Status: PROPOSTA — 2026-11-17. Nada criado no GHL, nada publicado. O Worker `revhackers-gtm-api` ainda não está em produção.

## 1. Pedido
Dono: Giulliano. Os números do lead passam a ser pedidos no formulário nativo do Funnels que libera a análise do diagnóstico de GTM e chegam ao Worker por webhook de workflow.

## 2. Fluxo
1. `/diagnostico-gtm` (formulário próprio): empresa, site, fase, ICP, concorrentes, CNPJ. O Worker cria o diagnóstico e coleta o site.
2. `/diagnostico-gtm/r/<id>`: com a coleta pronta, a página embute o form nativo novo. A query da página-mãe leva `rh_diagnostic_id=<id>`, `rh_diagnostic_type=gtm`, `rh_diagnostic_category=<fase>` e os cinco `utm_*`.
3. O lead envia o form. O workflow (gatilho: envio desse form) chama o Worker por Custom Webhook.
4. O Worker grava os números na entrada do diagnóstico, libera e inicia a análise. A página espera até 45 s pelo webhook; sem ele, libera a análise sem os números.

## 3. Lado GHL — location S7HE `S7HEFAz97UKuC8NLHMmI`

### 3.1 Campos personalizados de contato
| Chave | Tipo | Rótulo no form | No form |
|---|---|---|---|
| `rh_diagnostic_id` | texto | — | oculto |
| `rh_gtm_ticket_medio` | número | Ticket médio mensal (R$) | opcional |
| `rh_gtm_cac` | número | CAC estimado (R$) | opcional |
| `rh_gtm_churn_mensal` | número | Churn mensal (%) | opcional |
| `rh_gtm_ciclo_vendas_dias` | número | Ciclo de vendas (dias) | opcional |
| `rh_gtm_leads_mes` | número | Leads ou oportunidades novas por mês | opcional |
| `rh_gtm_taxa_fechamento` | número | Taxa de fechamento (% das propostas que viram cliente) | opcional |
| `rh_gtm_time_vendas` | número | Pessoas em vendas | opcional |

### 3.2 Form nativo `RH · Diagnóstico GTM`
- Contato e consentimento LGPD: os mesmos campos e textos do form `RH · Score` (`CDRZEJMYk68u6g4qIfJW`).
- Bloco "Seus números (opcional)": os sete campos numéricos acima, nenhum obrigatório.
- Ocultos: `rh_diagnostic_id`, `rh_diagnostic_type`, `rh_diagnostic_category`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`.
- Sem redirecionamento após o envio: a página detecta o envio pelo `postMessage` do widget.

### 3.3 Workflow
- Salvar em DRAFT. Publicar só com ordem do Giulliano, depois do Worker em produção.
- Gatilho: Form Submitted, filtro form = `RH · Diagnóstico GTM`.
- Replicar o que o envio do `RH · Score` faz hoje para diagnósticos (tags, etapa `leadDiagnostico` do pipeline `h5QPYbZlkVBgWhKc8O8C`). Conferir no painel antes.
- Ação Custom Webhook:
  - `POST https://revhackers.com.br/api/gtm/webhooks/ghl-form`
  - Header `X-RH-Webhook-Secret: <segredo>`
  - Corpo JSON, só ASCII:
    ```json
    {
      "diagnostic_id": "{{contact.rh_diagnostic_id}}",
      "ticket_medio_mensal": "{{contact.rh_gtm_ticket_medio}}",
      "cac": "{{contact.rh_gtm_cac}}",
      "churn_mensal_percent": "{{contact.rh_gtm_churn_mensal}}",
      "ciclo_vendas_dias": "{{contact.rh_gtm_ciclo_vendas_dias}}",
      "leads_mes": "{{contact.rh_gtm_leads_mes}}",
      "taxa_fechamento_percent": "{{contact.rh_gtm_taxa_fechamento}}",
      "time_vendas": "{{contact.rh_gtm_time_vendas}}"
    }
    ```
- Campo em branco pode ir vazio ou com a própria tag: o Worker ignora valor que não é número positivo. Se o lead deixar um campo em branco num segundo envio, o valor antigo do contato segue no webhook; aceito.

### 3.4 Respostas do Worker
| Status | Corpo | Quando |
|---|---|---|
| 200 | `{"ok":true,"applied":true}` | números gravados, análise iniciada |
| 200 | `{"ok":true,"applied":false}` | sem números válidos, ou análise já iniciada |
| 400 | `{"error":"entrada_invalida"}` | `diagnostic_id` ausente ou inválido |
| 401 | `{"error":"nao_autorizado"}` | segredo ausente ou errado |
| 404 | `{"error":"nao_encontrado"}` | diagnóstico inexistente |

## 4. Regras
- Nome, e-mail e telefone não vão ao Worker.
- O segredo é gerado e colado pelo Giulliano nos dois lados. Nunca em chat, arquivo ou log.
- Nenhum envio real de teste ao CRM sem ordem do Giulliano.

## 5. Devolver em `docs/_integracao/gtm-form-nativo-RESPOSTA.md`
1. Id do form novo.
2. Chaves dos campos confirmadas, ou as divergências.
3. Id do workflow e estado.
4. Custom Webhook está disponível na conta? Custo por execução.
5. O que o envio do `RH · Score` dispara hoje.
6. Qualquer ajuste pedido neste contrato.
