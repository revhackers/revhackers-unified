# Contratos do ciclo lead > diagnostico > resultado > contato > oportunidade > follow-up (GHL)

Camada documental da frente rh-ghl-analytics. Nenhum contato real e criado a partir
deste documento. Valores literais de conta, IDs de campos customizados, tokens,
hosts e credenciais NUNCA aparecem aqui; o mapeamento usa nomes logicos.
A referencia tecnica dos IDs vive somente em `src/lib/ghlRelay.ts` (frente G).

## 1. Estagios e transicoes

| # | Estagio | Gatilho de entrada | Saida esperada |
|---|---------|--------------------|----------------|
| 1 | `lead` | Formulario capturado (qualquer um dos 8, ver §4) | Registro com nome, email, origem |
| 2 | `diagnostico` | Lead inicia um diagnostico (growth, revenue, founder, site) | Respostas parciais + `diagnosticoId` |
| 3 | `resultado` | Diagnostico concluido, score e maturidade calculados | Score, faixa de maturidade, URL de resultado |
| 4 | `contato` | Lead pede contato ou responde follow-up | Pedido de contato vinculado ao diagnostico |
| 5 | `oportunidade` | Lead qualificado (score/maturidade ou triagem manual) | Registro em `POST /v1/opportunities` (API GCP) |
| 6 | `follow_up` | Oportunidade sem resposta ou com proximo passo agendado | Evento de reengajamento, sem nova captura de dados |

Regra: estagios 2 a 6 exigem o `diagnosticoId` gerado no estagio 2, exceto leads
vindos de formularios nao diagnosticos (newsletter, contato direto), que entram
no estagio 1 e so avancam ao iniciar um diagnostico.

## 2. Contrato de dados por estagio

Campos marcados com (PII) exigem consentimento LGPD previo (§5). Nenhum campo
sensivel (CPF, CNPJ completo, dados de saude, opinioes protegidas) trafega
nesta camada; CNPJ, quando informado, vai apenas para a API GCP de
oportunidades, nunca para analytics (§3).

### 2.1 `lead`

Obrigatorios: `fullName` (PII), `email` (PII), `source`.
Opcionais: `company`, `phone` (PII), `role`, `segment`, `utm_source`,
`utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `tags`.

### 2.2 `diagnostico`

Obrigatorios: `diagnosticoId`, `diagnostic_type` (`growth`|`revenue`|`founder`|`site`),
`lead_ref` (email normalizado ou id interno, nunca nome solto).
Opcionais: `step_id`, `step_index`, `step_count`, `answers_partial`
(somente respostas nao identificadoras; sem texto livre com PII).

### 2.3 `resultado`

Obrigatorios: `diagnosticoId`, `score_band` (faixa, ex. `0-25`, `26-50`,
`51-75`, `76-100`; nunca score exato fora do CRM), `maturity_level`,
`result_url`.
Opcionais: `diagnostic_type`, `maturity_title`.

### 2.4 `contato`

Obrigatorios: `email` (PII), `form_kind` (`diagnosis`|`contact`|`material`),
`lgpd_consent` = true.
Opcionais: `fullName` (PII), `company`, `phone` (PII), `message`
(texto livre; nao versionado em analytics, apenas no CRM), `diagnosticoId`.

### 2.5 `oportunidade`

Obrigatorios: `name`, `email` (PII), `lead_source`, `official_project_type`
(`consulting`|`crm_ops`|`founder`|`site`).
Opcionais: `company`, `cnpj` (dado sensivel; somente API GCP, nunca GHL
via esta camada e nunca analytics), `score`, `maturity` (objeto completo),
`responses`, `diagnosticoId`.

### 2.6 `follow_up`

Obrigatorios: `diagnosticoId` ou `email` (PII), `follow_up_kind`
(`no_response`|`next_step`|`reengajamento`), `lgpd_consent` = true.
Proibido: recapturar senha, documentos ou qualquer dado novo sensivel.

## 3. Mapeamento de campos (nomes logicos)

| Campo do site | Campo logico GHL | Observacao |
|---------------|------------------|------------|
| `fullName`/`name` | `firstName` + `lastName` | Particao por espaco, ver `ghlRelay.ts` |
| `email`/`corporateEmail` | `email` | Normalizado em minusculas pelo adapter |
| `phone`/`whatsapp` | `phone` | Somente com consentimento |
| `company`/`companyName` | `companyName` | |
| `website` | `website` | |
| UTMs (`utm_source`, etc.) | campos customizados de UTM | Lidos da URL no envio |
| `role` | campo customizado `cargo` | |
| `segment`/`industry` | campo customizado `setor` | |
| `message`/`whyParticipate` | campo customizado `principal_dor` | Nao vai para analytics |
| `whatToBuild` | campo customizado `desafios_da_empresa` | |
| `crm` | campo customizado `crm_atual` | |
| `companySize` | campo customizado `tamanho_do_time` | |
| `materialTitle`/`material` | campo customizado `materiallink` | |
| `score`/`total_score` | campo customizado `diagnostic_score` | So CRM, nunca analytics exato |
| `maturity_level` | campo customizado `diagnostic_category` | |
| `diagnostic_type` | campo customizado `diagnostic_type` | |
| `linkedin` | campo customizado `linkedin` | |
| origem do lead | campo customizado `fonte_do_lead` + `source` | |

Tags automaticas: `revhackers`, nome do tipo de evento e, para materiais,
`materiais` + `download:<materialId>`.

## 4. Formularios de entrada (8) e eventos atuais

| Formulario | Arquivo | Tipo de evento GHL atual |
|------------|---------|--------------------------|
| Diagnostico publico | `src/api/publicDiagnostic.ts` | evento por tipo de diagnostico |
| ContactForm | `src/components/shared/ContactForm.tsx` | `contact_form` |
| NewsletterForm | `src/components/shared/NewsletterForm.tsx` | `newsletter` |
| DownloadForm | `src/components/shared/download-form/hooks/useDownloadForm.ts` | `download` + `email_material` |
| ReiForm | `src/components/shared/rei-form/ReiForm.tsx` | `rei_completed` |
| REIWizard | `src/components/rei/REIWizard.tsx` | `rei_completed` |
| Calculadoras LTV/ROAS | `src/components/blog/post/components/LTVCalculator.tsx`, `ROASCalculator.tsx` | `roi_calculator` |
| FounderVideoWidget | `src/components/shared/FounderVideoWidget.tsx` | `lead_capture` |

Entradas adicionais (mesmo contrato, fora da contagem de forms): pagina
`ClaudePartnerNetworkPage.tsx` (`claude_partner_network`), pagina
`REI-Founder.tsx` (`rei_completed`), motor `funnelsAutomationEngine.ts` e
motor `googleDriveTranscriptEngine.ts` (`call_transcript_enrichment`).

Fontes de diagnostico (campo `source`, validado em modo mock por
`src/lib/diagnosticLeadPayload.ts`, sem rede): `growth-diagnostic`,
`diagnostico_linkedin`. Tipos (`diagnostic_type`): `growth`, `linkedin`
(demais tipos legados: `revenue`, `founder`, `site`).

## 5. LGPD: riscos conhecidos e mitigacoes desta frente

1. `ContactForm.tsx` e `useDownloadForm.ts` enviam PII ao relay sem prova de
   consentimento registrada no payload. Mitigacao: o adapter
   (`src/lib/ghlLeadAdapter.ts`) exige `lgpd_consent = true` e recusa o envio
   sem ele; ver checklist de ativacao.
2. CNPJ coletado no diagnostico publico. Mitigacao: contrato §2.5 restringe
   CNPJ a API GCP; o adapter remove `cnpj`/`cpf` do payload GHL.
3. Analytics de produto hoje e GTM remoto sem camada propria e sem PostHog.
   Mitigacao: camada nova `src/lib/analyticsEvents.ts` sem PII por construcao
   (tipos sem campos identificadores + `scrubPII` em runtime).
4. Texto livre (`message`) pode conter PII excedente. Mitigacao: nunca copiado
   para analytics; no CRM, sujeito a politica de retencao da conta (fora do
   escopo desta frente; sem alteracao de config GHL/agencia/subconta).

## 6. Mapeamento estagio > evento GHL (implementado no adapter)

| Estagio | `form_kind` / contexto | Evento GHL enviado |
|---------|------------------------|--------------------|
| `lead` | newsletter | `newsletter` |
| `lead` | material/download | `download` |
| `lead` | demais | `lead_capture` |
| `diagnostico` | qualquer | `score_captured` |
| `resultado` | growth/revenue/founder/site | evento do tipo de diagnostico |
| `contato` | contact | `contact_form` |
| `contato` | material | `email_material` |
| `oportunidade` | diagnostico concluido | evento do tipo de diagnostico + `POST /v1/opportunities` |
| `follow_up` | qualquer | `lead_capture` com tag `follow-up` |

Implementacao: `submitLeadLifecycleStage` em `src/lib/ghlLeadAdapter.ts`.
Testes: `tests/ghl-lead-lifecycle.test.ts`. Ativacao: `docs/ghl-activation-checklist.md`.
