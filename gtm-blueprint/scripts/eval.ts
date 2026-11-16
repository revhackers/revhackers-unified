import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES } from './cases.js';
import { runGtmPipeline, type PipelineOutput } from '../src/pipeline.js';
import { createBedrockProvider } from '../src/ai/providers/bedrock.js';
import { resolveCredentials } from '../src/ai/credentials.js';
import { renderWithBrowser } from '../src/collect/renderNode.js';
import { buildLeadReport } from '../src/report/viewModel.js';
import { renderLeadReportMarkdown } from '../src/report/markdown.js';

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
  const output = await runGtmPipeline(
    { ...caseDef, providers },
    {
      collect: { render: renderWithBrowser },
      onStage: (stage) => console.log(`[EVAL] estágio: ${stage}`),
    },
  );
  const totalDuration = Date.now() - startTime;

  const leadReport = buildLeadReport({
    input: caseDef,
    collect: output.collect,
    dossier: output.dossier,
    modules: output.modules,
    failed: [],
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputDir = path.join(__dirname, '..', 'eval-output', caseName);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'result.json'), JSON.stringify(output, null, 2), 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'lead-report.json'), JSON.stringify(leadReport, null, 2), 'utf-8');
  const reportMd = `${renderLeadReportMarkdown(leadReport)}\n${renderApendiceInterno(output, totalDuration)}`;
  fs.writeFileSync(path.join(outputDir, 'report.md'), reportMd, 'utf-8');

  console.log(`[EVAL] Concluído com sucesso para '${caseName}'!`);
  console.log(`- Custo total: US$ ${output.metrics.totalCostUsd.toFixed(4)}`);
  console.log(`- Latência total: ${(output.metrics.totalLatencyMs / 1000).toFixed(1)}s (Wall-clock: ${(totalDuration / 1000).toFixed(1)}s)`);
  console.log(`- Chamadas LLM: ${output.metrics.callsCount}`);
  console.log(`- Arquivos gerados em: ${outputDir}/`);
}

/** Apêndice só para desenvolvimento: auditoria do crítico, verificações mecânicas e custo. Não vai para o lead. */
function renderApendiceInterno(output: PipelineOutput, wallClockMs: number): string {
  const m = output.metrics;
  const c = output.critic;
  const q = output.qualityChecks;
  const lines: string[] = [];

  lines.push('## Apêndice interno (desenvolvimento, não enviar ao lead)', '');
  lines.push(`- Custo de IA estimado por tokens: US$ ${m.totalCostUsd.toFixed(4)} (não é fatura AWS; preços do registro e cache estimado)`);
  lines.push(`- Latência das respostas registradas: ${(m.totalLatencyMs / 1000).toFixed(1)}s (tempo total observado: ${(wallClockMs / 1000).toFixed(1)}s)`, '');

  lines.push('### Crítico', '');
  lines.push(`- Parecer: **${c.parecerFinalAprovacao}**`);
  lines.push(`- Média: **${c.rubricaQualidade0a10.scoreGeralMedio} / 10**`);
  lines.push(`  - Especificidade B2B: ${c.rubricaQualidade0a10.especificidadeB2B}/10`);
  lines.push(`  - Rigor epistêmico: ${c.rubricaQualidade0a10.rigorEvidenciaEpistemica}/10`);
  lines.push(`  - Coerência narrativa: ${c.rubricaQualidade0a10.coerenciaNarrativa}/10`);
  lines.push(`  - Acionabilidade: ${c.rubricaQualidade0a10.acionabilidadePragmatica}/10`, '');
  for (const issue of c.issuesFound) {
    lines.push(`- **[${issue.severidade}]** \`${issue.locationPath}\` (${issue.tipoProblema}): ${issue.descricao} → *Sugestão*: ${issue.sugestaoCorrecao}`);
  }
  lines.push('');

  lines.push('### Verificações mecânicas', '');
  lines.push('Validação de referências e números não comprova que uma fonte sustenta semanticamente a conclusão.', '');
  lines.push(`- Afirmações reclassificadas por falta de referência válida: ${q.downgradedClaims}`);
  lines.push(`- Citações de extração descartadas (não conferidas no texto da página): ${q.droppedQuotes}`);
  lines.push(`- Campos com frase sem fonte removida: ${q.numericFindings.length}`);
  for (const finding of q.numericFindings) {
    lines.push(`  - \`${finding.path}\`: ${finding.reason}`);
  }
  lines.push('');

  lines.push('### Custo e latência por etapa LLM', '');
  lines.push('| Prompt ID | Latência (s) | Custo (US$) | Input Tokens | Cache Read Tokens | Output Tokens |');
  lines.push('|---|---|---|---|---|---|');
  for (const b of m.breakdown) {
    lines.push(`| \`${b.promptId}\` | ${(b.latencyMs / 1000).toFixed(1)}s | $${b.costUsd.toFixed(4)} | ${b.inputTokens} | ${b.cacheReadTokens} | ${b.outputTokens} |`);
  }
  lines.push(`| **TOTAL** | **${(m.totalLatencyMs / 1000).toFixed(1)}s** | **$${m.totalCostUsd.toFixed(4)}** | - | - | - |`);
  lines.push('');
  lines.push('Custos incluem reparos bem-sucedidos; a latência por etapa é a da resposta final registrada, não de todas as tentativas.');

  return lines.join('\n');
}

main().catch((err) => {
  console.error('[EVAL ERROR]', err);
  process.exit(1);
});
