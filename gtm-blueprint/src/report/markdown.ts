import type { ItemTipo, LeadReport, ReportBlock, ReportItem, ReportSection } from './types.js';

const ETIQUETA: Record<ItemTipo, string> = {
  OBSERVADO: 'Observado no site',
  HIPOTESE: 'Hipótese',
  RECOMENDACAO: 'Recomendação',
};

const STATUS_SECAO: Record<Exclude<ReportSection['status'], 'pronto'>, string> = {
  pendente: '_Seção em análise nesta execução._',
  indisponivel: '_Seção indisponível nesta execução._',
};

const celula = (texto: string): string => texto.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const numero = (valor: number | null): string => (valor === null ? 'não informado' : valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));

function linhaItem(item: ReportItem): string {
  const fontes = item.fontes.length > 0 ? ` (fontes: ${item.fontes.join(', ')})` : '';
  const validar = item.comoValidar ? ` Como validar: ${item.comoValidar}` : '';
  return `- **${ETIQUETA[item.tipo]}**${fontes}: ${item.texto}${validar}`;
}

function linhasBlocos(blocos: ReportBlock[]): string[] {
  return blocos.flatMap((b) => [`#### ${b.rotulo}`, '', ...b.itens.map(linhaItem), '']);
}

/** Relatório do lead em markdown, na mesma ordem da página: o que lemos, tese, contradições, achados, plano e aprofundamento. */
export function renderLeadReportMarkdown(r: LeadReport): string {
  const out: string[] = [];

  out.push(`# Diagnóstico de GTM: ${r.empresa.nome}`, '');
  out.push(`- Site: ${r.empresa.site}`);
  out.push(`- Fase declarada: ${r.empresa.faseDeclarada}`);
  out.push(`- Progresso: ${r.progresso.concluidas} de ${r.progresso.total} etapas${r.progresso.etapaAtual ? `; em andamento: ${r.progresso.etapaAtual}` : ''}`, '');

  out.push('## O que lemos', '');
  out.push('**Fontes coletadas**', '');
  out.push(...(r.fontes.length > 0 ? r.fontes.map((f) => `- [${f.id}] ${f.tipo}: ${f.url}`) : ['Nenhuma fonte coletada.']), '');
  out.push('**Lacunas de coleta**', '');
  out.push(...(r.lacunasDeColeta.length > 0 ? r.lacunasDeColeta.map((g) => `- ${g}`) : ['Nenhuma lacuna registrada.']), '');
  out.push('**Stack detectada na home**', '');
  out.push(...r.stackDetectada.map((s) => `- ${s.detectado ? 'Detectado' : 'Não detectado'}: ${s.sinal}`), '');

  out.push('## Tese', '', r.tese ?? '_Tese pendente: o dossiê ainda não foi gerado._', '');

  out.push('## O que você declara × o que o site prova', '');
  out.push(...(r.contradicoes.length > 0 ? r.contradicoes.map(linhaItem) : ['Nenhuma contradição encontrada nas fontes lidas.']), '');

  out.push('## 3 achados que custam receita', '');
  if (r.achados.length === 0) out.push('_Achados pendentes._', '');
  for (const [i, a] of r.achados.entries()) {
    out.push(`### ${i + 1}. ${a.titulo}`, '', `- Impacto na receita: ${a.impacto}`, `- Custo de inação: ${a.custoDeInacao}`, linhaItem(a.base), '');
  }

  out.push('## Decisão desta semana', '', r.decisaoDaSemana ?? '_Decisão pendente._', '');

  out.push('## Plano de 90 dias', '');
  if (r.plano90Dias.length === 0) out.push('_Plano pendente._', '');
  for (const onda of r.plano90Dias) {
    out.push(`### ${onda.rotulo}`, '', linhaItem(onda.foco), '');
    out.push('| Iniciativa | ICE | Impacto | Confiança | Facilidade | Responsável | Prazo |');
    out.push('|---|---|---|---|---|---|---|');
    for (const i of onda.iniciativas) {
      out.push(`| ${celula(i.titulo)} | ${i.ice} | ${i.impacto} | ${i.confianca} | ${i.facilidade} | ${celula(i.responsavel)} | ${i.prazoDias}d |`);
    }
    out.push('');
  }

  out.push('## Dados que faltam', '');
  out.push(...(r.dadosAColetar.length > 0 ? r.dadosAColetar.map((d) => `- ${d}`) : ['Nenhum dado faltante identificado.']), '');

  if (r.unitEconomics) {
    const u = r.unitEconomics;
    out.push('## Unit economics', '');
    out.push(`- Status: ${u.status}`);
    out.push(`- ARPU mensal: ${numero(u.arpuMensal)}`);
    out.push(`- CAC: ${numero(u.cac)}`);
    out.push(`- Churn mensal: ${numero(u.churnMensal)}`);
    out.push(`- Ciclo de vendas (dias): ${numero(u.cicloVendasDias)}`);
    out.push(`- LTV: ${numero(u.ltv)}`);
    out.push(`- Payback (meses): ${numero(u.paybackMeses)}`);
    out.push(`- LTV/CAC: ${numero(u.ltvCac)}`, '');
  }

  out.push('## Aprofundar', '');
  for (const s of r.secoes) {
    out.push(`### ${s.titulo}`, '');
    if (s.status !== 'pronto') {
      out.push(STATUS_SECAO[s.status], '');
      continue;
    }
    if (s.decisao) out.push(`**Decisão:** ${s.decisao}`, '');
    out.push(...linhasBlocos(s.blocos));
    if (s.proximosPassos.length > 0) {
      out.push('**Próximos passos**', '');
      out.push(...s.proximosPassos.map((p) => `- ${p.acao} (${p.responsavel}, ${p.prazoDias} dias)`), '');
    }
  }

  return out.join('\n');
}
