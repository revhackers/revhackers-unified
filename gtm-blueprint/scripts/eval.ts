import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES } from './cases.js';
import { runGtmPipeline } from '../src/pipeline.js';
import { createBedrockProvider } from '../src/ai/providers/bedrock.js';
import { resolveCredentials } from '../src/ai/credentials.js';

async function main() {
  const caseName = process.argv[2];
  if (!caseName || !CASES[caseName]) {
    console.error(`Uso: npm run eval -- <case-name>`);
    console.error(`Casos disponíveis: ${Object.keys(CASES).join(', ')}`);
    process.exit(1);
  }

  const caseDef = CASES[caseName];
  if (!caseDef) {
    console.error(`Caso '${caseName}' não encontrado.`);
    process.exit(1);
  }

  console.log(`[EVAL] Iniciando pipeline para o caso: '${caseName}' (${caseDef.companyName} - ${caseDef.websiteUrl})`);

  const bedrockProvider = createBedrockProvider({
    region: 'us-east-1',
    credentials: () => resolveCredentials('default'),
  });

  const providers = {
    bedrock: bedrockProvider,
  };

  const startTime = Date.now();
  const output = await runGtmPipeline({
    ...caseDef,
    providers,
  });
  const totalDuration = Date.now() - startTime;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputDir = path.join(__dirname, '..', 'eval-output', caseName);
  fs.mkdirSync(outputDir, { recursive: true });

  const resultJsonPath = path.join(outputDir, 'result.json');
  fs.writeFileSync(resultJsonPath, JSON.stringify(output, null, 2), 'utf-8');

  const reportMdPath = path.join(outputDir, 'report.md');
  const reportMd = generateMarkdownReport(caseName, output, totalDuration);
  fs.writeFileSync(reportMdPath, reportMd, 'utf-8');

  console.log(`[EVAL] Concluído com sucesso para '${caseName}'!`);
  console.log(`- Custo total: US$ ${output.metrics.totalCostUsd.toFixed(4)}`);
  console.log(`- Latência total: ${(output.metrics.totalLatencyMs / 1000).toFixed(1)}s (Wall-clock: ${(totalDuration / 1000).toFixed(1)}s)`);
  console.log(`- Chamadas LLM: ${output.metrics.callsCount}`);
  console.log(`- Arquivos gerados em: ${outputDir}/`);
}

function renderClaim(claim: unknown): string {
  if (!claim || typeof claim !== 'object') return String(claim);
  const c = claim as { text?: string; status?: string; evidenceIds?: string[]; howToValidate?: string };
  const status = c.status || 'HIPOTESE';
  const text = c.text || '';
  if (status === 'VERIFICADO') {
    const evs = Array.isArray(c.evidenceIds) && c.evidenceIds.length > 0 ? ` [${c.evidenceIds.join(', ')}]` : '';
    return `**VERIFICADO${evs}**: ${text}`;
  } else {
    const how = c.howToValidate ? ` *(Como validar: ${c.howToValidate})*` : '';
    return `**HIPÓTESE**: ${text}${how}`;
  }
}

function generateMarkdownReport(caseName: string, output: any, wallClockMs: number): string {
  const m = output.metrics;
  const c = output.critic;
  const mod = output.modules;

  let md = `# GTM Blueprint - Relatório Executivo: ${output.companyName} (${caseName})\n\n`;
  md += `- **Website**: [${output.websiteUrl}](${output.websiteUrl})\n`;
  md += `- **Fase Declarada**: ${output.declaredPhase}\n`;
  md += `- **Concorrentes**: ${output.competitors.join(', ')}\n`;
  md += `- **Custo de IA estimado por tokens**: US$ ${m.totalCostUsd.toFixed(4)} (não é fatura AWS; preços do registro e cache estimado, sem infraestrutura ou APIs de dados)\n`;
  md += `- **Latência das respostas registradas**: ${(m.totalLatencyMs / 1000).toFixed(1)}s (tempo total observado: ${(wallClockMs / 1000).toFixed(1)}s; inclui coleta e eventuais reparos)\n\n`;

  md += `## 1. Evidências Coletadas & Lacunas\n\n`;
  md += `### Evidências (${output.collectionResult.evidences.length})\n`;
  for (const ev of output.collectionResult.evidences) {
    md += `- **[${ev.id}]** \`${ev.kind}\` - [${ev.source}](${ev.source})\n`;
  }
  if (output.collectionResult.gaps.length > 0) {
    md += `\n### Gaps / Falhas de Coleta\n`;
    for (const gap of output.collectionResult.gaps) {
      md += `- ⚠️ ${gap}\n`;
    }
  }

  md += `\n## 2. Dossiê Estratégico (Single Source of Truth)\n\n`;
  md += `- **Tese Central**: ${output.dossier.teseCentral}\n`;
  md += `- **Modelo de Negócio**: ${output.dossier.modeloNegocio.tipo} | Ticket: ${renderClaim(output.dossier.modeloNegocio.ticketMedioEstimado)}\n`;
  md += `\n### Estágio Real vs Declarado\n`;
  md += `- Declarado: ${output.dossier.estagioRealVsDeclarado.declarado}\n`;
  md += `- Realidade Auditada: ${output.dossier.estagioRealVsDeclarado.realidadeAuditada}\n`;
  md += `\n### Comitê de Compra Mapeado\n`;
  for (const p of output.dossier.comiteCompraB2B) {
    md += `- **${p.papel}** (${p.nomeFantasiaPersona}): Dor: ${renderClaim(p.dorPrincipal)} | Gatilho: ${renderClaim(p.gatilhoDeCompra)}\n`;
  }

  md += `\n## 3. Módulos GTM Executados\n\n`;

  // Módulo 1
  md += `### Módulo 1: Raio-X Executivo\n`;
  md += `${mod.raio_x.resumoExecutivo}\n\n`;
  md += `**Achados Críticos de Receita**:\n`;
  for (const ach of mod.raio_x.achadosCriticosReceita) {
    md += `- **${ach.titulo}** (Impacto: ${ach.impactoFinanceiroEstimado}): ${renderClaim(ach.evidenciaOuHipotese)}\n`;
  }
  md += `\n**Decisão Imediata**: ${mod.raio_x.decisao}\n\n`;

  // Módulo 2
  md += `### Módulo 2: ICP e Mercado (TAM/SAM/SOM)\n`;
  md += `- **ICP Prioritário**: ${renderClaim(mod.icp_mercado.icpPrioritario.descricaoFirmografica)}\n`;
  md += `- **Anti-ICP**: ${renderClaim(mod.icp_mercado.antiIcp.descricaoEvitar)}\n`;
  md += `- **Análise TAM/SAM/SOM**: ${renderClaim(mod.icp_mercado.tamSamSomInterpretacao.analiseMercado)} (SOM Anual: ${mod.icp_mercado.tamSamSomInterpretacao.potencialReceitaAnualSom})\n\n`;

  // Módulo 3
  md += `### Módulo 3: Comitê de Compra B2B\n`;
  for (const memb of mod.comite_compra.membrosComite) {
    md += `- **${memb.papel}** (${memb.nomeCargo}): Dor: ${renderClaim(memb.dorPrimaria)} | Objeção: ${renderClaim(memb.objecaoChave)}\n`;
  }
  md += `\n**Dinâmica de Aprovação**: ${renderClaim(mod.comite_compra.dinamicaAprovacao)}\n\n`;

  // Módulo 4
  md += `### Módulo 4: Proposta de Valor e Posicionamento\n`;
  md += `- **Declaração**: ${renderClaim(mod.proposta_posicionamento.declaracaoPosicionamento)}\n`;
  md += `**Pilares de Diferenciação**:\n`;
  for (const pil of mod.proposta_posicionamento.pilaresDiferenciacao) {
    md += `- **${pil.pilar}**: ${renderClaim(pil.descricao)} (Defensibilidade: ${renderClaim(pil.defensibilidade)})\n`;
  }
  md += `\n`;

  // Módulo 5
  md += `### Módulo 5: Motor de Demanda\n`;
  for (const can of mod.motor_demanda.mixCanaisPrioritarios) {
    md += `- **${can.canal}** (${can.alocacaoEsforcoPercentual}% esforço): ${renderClaim(can.playConcretoExecucao)}\n`;
  }
  md += `\n**Ritual Operacional**: ${renderClaim(mod.motor_demanda.ritualOperacionalGtm)}\n\n`;

  // Módulo 6
  md += `### Módulo 6: Funil B2B & RevOps\n`;
  for (const et of mod.funil_revops.etapasFunilB2B) {
    md += `- **${et.estagio}**: SLA: ${renderClaim(et.criterioAvancoSla)} | Conversão: ${renderClaim(et.conversaoEsperadaBenchmark)}\n`;
  }
  md += `\n`;

  // Módulo 7
  md += `### Módulo 7: Unit Economics\n`;
  md += `- **Status Dados**: ${mod.unit_economics.statusDados}\n`;
  md += `- **ARPU**: ${renderClaim(mod.unit_economics.metricasCalculadasOuBenchmark.arpu)}\n`;
  md += `- **CAC**: ${renderClaim(mod.unit_economics.metricasCalculadasOuBenchmark.cac)}\n`;
  md += `- **LTV/CAC**: ${renderClaim(mod.unit_economics.metricasCalculadasOuBenchmark.ltvCacRatio)} (Payback: ${renderClaim(mod.unit_economics.metricasCalculadasOuBenchmark.paybackMeses)})\n`;
  md += `- **Trava Financeira**: ${renderClaim(mod.unit_economics.travaFinanceiraRisco)}\n\n`;

  // Módulo 8
  md += `### Módulo 8: Plano de Ação 90 Dias & Matriz ICE (Ordenado por Score)\n`;
  for (const onda of mod.plano_90_dias.ondasExecucao) {
    md += `#### ${onda.onda}\n`;
    md += `- **Foco**: ${renderClaim(onda.focoPrincipal)}\n`;
    md += `| Iniciativa | ICE (I×C×E, 1–1000) | Impacto | Confiança | Facilidade | Owner | Prazo |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    for (const init of onda.iniciativasPraticas) {
      md += `| ${init.titulo} | **${init.scoreIceCalculado ?? '-'}** | ${init.impactoEstimado1a10} | ${init.confianca1a10} | ${init.facilidade1a10} | ${init.ownerRole} | ${init.prazoDias}d |\n`;
    }
    md += `\n`;
  }

  md += `## 4. Auditoria Crítica (Critic) & Rubrica\n\n`;
  md += `- **Parecer Final**: **${c.parecerFinalAprovacao}**\n`;
  md += `- **Rubrica Média**: **${c.rubricaQualidade0a10.scoreGeralMedio} / 10**\n`;
  md += `  - Especificidade B2B: ${c.rubricaQualidade0a10.especificidadeB2B}/10\n`;
  md += `  - Rigor Epistêmico: ${c.rubricaQualidade0a10.rigorEvidenciaEpistemica}/10\n`;
  md += `  - Coerência Narrativa: ${c.rubricaQualidade0a10.coerenciaNarrativa}/10\n`;
  md += `  - Acionabilidade: ${c.rubricaQualidade0a10.acionabilidadePragmatica}/10\n\n`;

  if (c.issuesFound.length > 0) {
    md += `### Issues Encontradas pelo Critic\n`;
    for (const issue of c.issuesFound) {
      md += `- **[${issue.severidade}]** \`${issue.locationPath}\` (${issue.tipoProblema}): ${issue.descricao} → *Sugestão*: ${issue.sugestaoCorrecao}\n`;
    }
    md += `\n`;
  }

  md += `## 5. Verificações Mecânicas\n\n`;
  md += `Validação de referências e números não comprova que uma fonte sustenta semanticamente a conclusão. A revisão estratégica continua necessária.\n\n`;
  if (output.qualityChecks) {
    md += `- Afirmações reclassificadas por falta de referência válida: ${output.qualityChecks.downgradedClaims}\n`;
    md += `- Campos quantitativos bloqueados: ${output.qualityChecks.numericFindings.length}\n\n`;
    for (const finding of output.qualityChecks.numericFindings) {
      md += `- \`${finding.path}\`: ${finding.reason}\n`;
    }
    md += `\n`;
  } else {
    md += `Esta execução não registrou verificações mecânicas detalhadas; não interpretar ausência de registros como aprovação.\n\n`;
  }

  md += `## 6. Custo Estimado & Latência por Etapa LLM\n\n`;
  md += `| Prompt ID | Latência (s) | Custo (US$) | Input Tokens | Cache Read Tokens | Output Tokens |\n`;
  md += `|---|---|---|---|---|---|\n`;
  for (const b of m.breakdown) {
    md += `| \`${b.promptId}\` | ${(b.latencyMs / 1000).toFixed(1)}s | $${b.costUsd.toFixed(4)} | ${b.inputTokens} | ${b.cacheReadTokens} | ${b.outputTokens} |\n`;
  }
  md += `| **TOTAL** | **${(m.totalLatencyMs / 1000).toFixed(1)}s** | **$${m.totalCostUsd.toFixed(4)}** | - | - | - |\n`;
  md += `\nCustos incluem reparos bem-sucedidos; tokens e latência por etapa representam a resposta final registrada, não todas as tentativas. O tempo total observado acima é a referência para a espera do usuário.\n`;

  return md;
}

main().catch((err) => {
  console.error('[EVAL ERROR]', err);
  process.exit(1);
});
