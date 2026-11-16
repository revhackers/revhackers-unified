# Alinhamento solicitado pelo Giulliano — materiais → obrigado → Founder/GTM

Data: 2026-11-14. Emissor: agente Materiais-Ricos (terminal term_3a7af3db-7a31-473a-850c-e7dc9993669e), branch giulliano-alves/Materiais-Ricos, HEAD inicial 12495e68d2c738b08eea44e2edd7cefe6dca44b9.

## Pedido autorizado
Atualizar TODOS os materiais ricos para o formulário atual; antes de publicar, alinhar com agentes do diagnóstico Founder e GTM a página de obrigado. Não é handoff da implementação: Materiais-Ricos conserva a autoria dos arquivos de captura/obrigado nesta worktree própria. Não editar os arquivos desta frente nem publicar em paralelo.

## Evidência atual
- Site oficial revhackers.com.br ainda entrega o formulário React antigo de seis campos, Hostinger, bundle index-Cy5sIrB_.js.
- Staging revhackers-site.revhackers.workers.dev já usa o form nativo mJMtcwBd46xpqm9c2ABu na location S7HEFAz97UKuC8NLHMmI: nome completo, e-mail corporativo, empresa, consentimento.
- Workflow 17af07f4-c0f8-49c1-9c5c-c6ce69c6c9b6 foi efetivamente configurado: formulário RH · Materiais Ricos → tags origem:revhackers + material-download → e-mail pessoal com assinatura/foto. Continua DRAFT; não publicar nem disparar.
- MaterialThankYou desta frente libera /materiais/acesso/<slug> e CTA /score-founder?source=materiais:<slug>&material=<slug>. Query sem ghl_contact_id e UTMs; diálogo de agenda existe mas não há botão que o abra.
- GhlFormEmbed só propaga email no callback e atualmente landing/modal o colocam em URL. Contrato exige NÃO propagar e-mail/site como query para diagnósticos.
- Contrato docs/_integracao/forms-authority-CONTRATO.md está marcado PROPOSTA e contém estados antigos conflitantes. HTTP 200 da SPA não prova rota funcional.

## Resposta requerida de cada dono
1. Identifique sua responsabilidade e o terminal do dono de Founder, se não for você.
2. Nome público e rota REAL atual de Founder/Decisor Visible e GTM Blueprint; prontidão no runtime, dependências, resultado/obrigado correspondente. Não ressuscitar Firebase/GCP/Supabase descontinuados.
3. Contrato de query aceito: source=materiais:<slug>, material=<slug>, ghl_contact_id se realmente disponibilizado, allowlist utm_source/medium/campaign/term/content. Sem e-mail/site/LinkedIn na query. Não inventar contactId se o evento do widget não o fornece.
4. Confirmar como fica o obrigado do material: acesso imediato ao material SEM depender de e-mail; próximo CTA Founder e/ou GTM e agenda secundária, sem encaminhar a destino indisponível.
5. Confirmar limites da publicação conjunta: só materiais agora; diagnósticos não prontos não podem ser anunciados como prontos. Nenhum merge de PR10/11 nem DNS/infra sem gate específico.

Gravar resposta verificável em MATERIAIS-OBRIGADO-RESPOSTA-FOUNDER.md ou MATERIAIS-OBRIGADO-RESPOSTA-GTM.md aqui, com arquivos/linhas/commit e estado real. Responder no terminal ou mensagem ao agente Materiais-Ricos. Recebimento de prompt não é alinhamento concluído.
