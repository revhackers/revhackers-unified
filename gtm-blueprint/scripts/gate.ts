import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PipelineOutput } from '../src/pipeline.js';
import { BLOCKED_NARRATIVE_TEXT, BLOCKED_RECOMMENDATION_TEXT } from '../src/prompts/numberGuard.js';

// Limiares de homologação: proposta inicial, ajustável aqui.
const MIN_CHARS_TEXTO_CENTRAL = 40;
const MAX_RAZAO_TEXTO_NEUTRO = 0.03;
const MAX_RAZAO_CAMPOS_ALTERADOS = 0.10;
const MIN_NOTA = 7;

interface Regra {
  id: number;
  descricao: string;
  ok: boolean;
  detalhe: string;
}

/** Todas as strings folha de um valor JSON. */
function folhas(valor: unknown): string[] {
  if (typeof valor === 'string') return [valor];
  if (Array.isArray(valor)) return valor.flatMap(folhas);
  if (valor && typeof valor === 'object') return Object.values(valor).flatMap(folhas);
  return [];
}

function regras(out: PipelineOutput): Regra[] {
  const { dossier, modules, qualityChecks, critic } = out;
  const rubrica = critic.rubricaQualidade0a10;

  const textosCentrais: Array<[string, string]> = [
    ['raio_x.resumoExecutivo', modules.raio_x.resumoExecutivo],
    ['raio_x.decisao', modules.raio_x.decisao],
    ...modules.raio_x.achadosCriticosReceita.map((a, i): [string, string] => [`raio_x.achadosCriticosReceita[${i}].titulo`, a.titulo]),
    ['dossier.teseCentral', dossier.teseCentral],
  ];
  const invalidos = textosCentrais
    .filter(([, texto]) => texto === BLOCKED_NARRATIVE_TEXT || texto === BLOCKED_RECOMMENDATION_TEXT || texto.length < MIN_CHARS_TEXTO_CENTRAL)
    .map(([campo]) => campo);

  const todas = [...folhas(dossier), ...folhas(modules)];
  const neutros = todas.filter((s) => s === BLOCKED_NARRATIVE_TEXT || s === BLOCKED_RECOMMENDATION_TEXT).length;
  const proporcao = todas.length === 0 ? 0 : neutros / todas.length;
  const alterados = qualityChecks.numericFindings.length;
  const razaoAlterados = todas.length === 0 ? 0 : alterados / todas.length;

  const inventados = critic.issuesFound.filter(
    (i) => i.tipoProblema === 'Número inventado / sem fonte' && (i.severidade === 'ALTA' || i.severidade === 'CRITICA'),
  );

  return [
    {
      id: 1,
      descricao: 'Campos centrais com texto próprio e 40+ caracteres',
      ok: invalidos.length === 0,
      detalhe: invalidos.length === 0 ? `${textosCentrais.length} campos` : `inválidos: ${invalidos.join(', ')}`,
    },
    {
      id: 2,
      descricao: `Textos "A coletar" ≤ ${MAX_RAZAO_TEXTO_NEUTRO * 100}% das strings de dossiê e módulos`,
      ok: proporcao <= MAX_RAZAO_TEXTO_NEUTRO,
      detalhe: `${neutros} de ${todas.length} (${(proporcao * 100).toFixed(1)}%)`,
    },
    {
      id: 3,
      descricao: `Campos alterados pela trava ≤ ${MAX_RAZAO_CAMPOS_ALTERADOS * 100}% das strings de dossiê e módulos`,
      ok: razaoAlterados <= MAX_RAZAO_CAMPOS_ALTERADOS,
      detalhe: `${alterados} de ${todas.length} (${(razaoAlterados * 100).toFixed(1)}%)`,
    },
    {
      id: 4,
      descricao: 'Nenhuma issue de número inventado com severidade ALTA ou CRITICA',
      ok: inventados.length === 0,
      detalhe: `${inventados.length} issue(s)`,
    },
    {
      id: 5,
      descricao: `Rigor epistêmico ≥ ${MIN_NOTA} e média do crítico ≥ ${MIN_NOTA}`,
      ok: rubrica.rigorEvidenciaEpistemica >= MIN_NOTA && rubrica.scoreGeralMedio >= MIN_NOTA,
      detalhe: `rigor ${rubrica.rigorEvidenciaEpistemica}, média ${rubrica.scoreGeralMedio}`,
    },
  ];
}

function main(): void {
  const caso = process.argv[2];
  if (!caso) {
    console.error('Uso: npm run gate -- <caso>');
    process.exitCode = 1;
    return;
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const arquivo = path.join(__dirname, '..', 'eval-output', caso, 'result.json');
  if (!fs.existsSync(arquivo)) {
    console.error(`Sem resultado para '${caso}': rode npm run eval -- ${caso} antes.`);
    process.exitCode = 1;
    return;
  }

  // O eval grava o PipelineOutput; o formato é o da execução atual do pipeline.
  const out = JSON.parse(fs.readFileSync(arquivo, 'utf-8')) as PipelineOutput;
  const resultados = regras(out);

  console.log(`[GATE] ${caso}`);
  for (const r of resultados) {
    console.log(`${r.ok ? 'OK    ' : 'FALHA '} ${r.id}. ${r.descricao} — ${r.detalhe}`);
  }
  const falhas = resultados.filter((r) => !r.ok).length;
  console.log(falhas === 0 ? '[GATE] Homologado nesta execução.' : `[GATE] Reprovado: ${falhas} regra(s).`);
  process.exitCode = falhas === 0 ? 0 : 1;
}

main();
