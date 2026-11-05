# 🚀 Playbook: RevHackers Outbound & Authority Engine (A Máquina de Vendas B2B)

**Data:** 2026-11-05  
**Escopo:** Estratégia unificada de aquisição, autoridade executiva e prospecção cirúrgica conectada à subconta GHL S7HE (`S7HEFAz97UKuC8NLHMmI`).

---

## 🎯 1. Filosofia Operacional
A RevHackers não faz disparo em massa de e-mails frios nem automações robóticas amadoras. Nossa tese é a **Aceleração de Pipeline baseada em Autoridade e Gatilhos de Comportamento (Intent Data)**. 

O lead perfeito é impactado por uma combinação de:
1. **Conteúdo de Autoridade (Inbound):** Artigos, materiais ricos, calculadoras e diagnósticos interativos no site (`revhackers.com.br`).
2. **Abordagem Cirúrgica (Outbound Multi-Canal):** Prospecção ativa direcionada a C-levels (CEOs, Founders, VPs) com base no comportamento demonstrado no site.

---

## ⚙️ 2. Arquitetura de Dados & GHL (Subconta S7HE)

Toda a operação roda unificada na subconta **S7HE**, segmentada por tags e origens:

### A. Taxonomia de Tags e Origens
- `origem:revhackers` — Leads vindos do site principal / consultoria.
- `origem:funnels` — Leads vindos do ecossistema SaaS / Funnels.
- `outbound:linkedin` — Leads abordados via prospecção ativa no LinkedIn.
- `intent:high-score` — Leads que obtiveram pontuação alta nos diagnósticos/calculadoras.
- `funil:materiais` | `funil:diagnostico` | `funil:contato` | `funil:calculadora` — Contexto exato de entrada.

### B. O Fluxo de Dados (Inbound ➔ Outbound)
1. **Captura:** O lead preenche o *Diagnóstico de Growth* ou baixa um *Guia GTM* no site revhackers.com.br.
2. **Enriquecimento / Scoring:** O GHL S7HE recebe o contato via formulário nativo embutido (`GhlFormEmbed`).
3. **Qualificação Automática:** Se o cargo for C-level e a empresa atender ao ICP, o GHL aplica a tag `intent:high-score` e cria a oportunidade no pipeline `RevHackers · Inbound`.
4. **Ação Comercial:** O sistema gera uma tarefa prioritária para o executivo de contas realizar o toque contextualizado (cita o resultado do diagnóstico que o lead acabou de fazer).

---

## ✉️ 3. Padrão de Abordagem (O E-mail Pessoal RevHackers)
- **Zero Marketing Corporativo:** Sem banners, sem cabeçalhos pesados, sem botões chamativos.
- **Formato:** Texto corrido, tom consultivo, direto ao ponto, assinado pessoalmente por Giulliano Alves com foto executiva no rodapé.
- **Gatilho:** Sempre ancorado na dor específica que o lead demonstrou ao interagir com as ferramentas da RevHackers.

---

## 📈 4. Próximos Passos de Execução
- [ ] Ativar os 6 formulários nativos em S7HE.
- [ ] Publicar os workflows de notificação e nutrição em S7HE.
- [ ] Conectar os eventos do site para alimentar o pipeline de forma 100% automatizada.
