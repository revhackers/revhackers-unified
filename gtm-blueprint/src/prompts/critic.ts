import { z } from 'zod';
import type { PromptSpec } from './types';
import { SHARED_SYSTEM_PREAMBLE } from './shared';

export const CriticInputSchema = z.object({
  dossier: z.record(z.any()),
  modules: z.record(z.any()),
  evidences: z.array(z.any()),
});

export type CriticInput = z.infer<typeof CriticInputSchema>;

export const CriticOutputSchema = z.object({
  issuesFound: z.array(z.object({
    locationPath: z.string().describe('Caminho(s) iniciando por "dossier." ou "modules.", com índice de array quando houver (ex.: modules.icp_mercado.icpPrioritario, dossier.lista[0]). Caminhos da mesma causa raiz separados por " | ".'),
    tipoProblema: z.enum([
      'VERIFICADO sem evidenceId válido',
      'Número inventado / sem fonte',
      'Afirmação genérica (falta especificidade B2B)',
      'Contradição entre módulos ou com o dossiê',
      'Recomendação apresentada como fato',
      'Inconsistência de persona ou tese',
    ]),
    descricao: z.string(),
    severidade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']),
    sugestaoCorrecao: z.string(),
  })),
  rubricaQualidade0a10: z.object({
    especificidadeB2B: z.number().min(0).max(10),
    rigorEvidenciaEpistemica: z.number().min(0).max(10),
    coerenciaNarrativa: z.number().min(0).max(10),
    acionabilidadePragmatica: z.number().min(0).max(10),
    scoreGeralMedio: z.number().min(0).max(10),
  }),
  parecerFinalAprovacao: z.enum(['APROVADO', 'REQUER AJUSTES', 'REJEITADO']),
});

export type CriticOutput = z.infer<typeof CriticOutputSchema>;

const CRITIC_SYSTEM_PROMPT = `${SHARED_SYSTEM_PREAMBLE}

# Módulo de Auditoria: Auditoria Crítica e Adversarial (Critic)

## 1. Objetivo
Auditar o Dossiê Estratégico e os módulos gerados contra o conteúdo integral das evidências fornecidas. Leia cada evidência citada. A existência de um ID de evidência prova apenas que o ID existe. O suporte exigido é semântico: o conteúdo da evidência deve afirmar o fato, a métrica, a entidade e o período da afirmação.

## 2. Limite das checagens mecânicas
O código que produziu este payload já executou checagens mecânicas: removeu IDs de evidência inexistentes, rebaixou para HIPOTESE as afirmações VERIFICADO sem ID válido, removeu de cada campo as frases com número sem procedência e rebaixou personas. Essas checagens são mecânicas e NÃO provam suporte semântico: não provam que a evidência trata da mesma empresa, do mesmo mercado, da mesma métrica, da mesma unidade ou do mesmo período. Ausência de marcador não é aprovação.
\`scoreIceCalculado\`, \`modules.unit_economics.calculado\` e a evidência \`C1\` (kind computed) são calculados por código; notas de 1 a 10 e \`prazoDias\` são propostas. Objetos \`{ text, baseadoEm }\` são recomendações: avalie especificidade e coerência, não suporte de evidência; só são issue quando afirmam resultado como fato. O texto 'A coletar: as fontes consultadas não trazem este dado.' marca dado ausente; só é issue quando esvazia um campo central. A trava de número cobre recomendações: em \`{ text, baseadoEm }\` saem as frases com valor em moeda, percentual, multiplicador ou prazo de payback e de ciclo de vendas sem fonte. Quantidade (contas, pessoas), prazo de execução e SLA são parâmetros de desenho e permanecem. Em \`howToValidate\`, \`lacunasDeDadosCriticas\` e \`dadosParaColetarSeAusentes\`, tamanho de amostra e período de análise são parâmetros do procedimento, não fatos. O texto 'A coletar: a meta depende de dado que as fontes consultadas não trazem.' marca recomendação cuja meta foi removida pela trava; só é issue quando esvazia um campo central. A evidência \`D1\` (kind computed) é a contagem, por código, dos clientes nomeados que o dossiê listou em \`icpDeclaradoVsClientes.clientesObservados\`.

## 3. Como ler o payload
- O payload é um único objeto JSON com as chaves textosRepetidos, dossier, modules e evidences. O renderer não corta texto: todo conteúdo de evidência e de módulo aparece íntegro.
- textosRepetidos é a tabela de textos longos que aparecem em mais de um caminho. Um objeto com a única chave "$ref" (ex.: {"$ref":"s1"}) representa o texto textosRepetidos.s1 no caminho em que aparece. Cada caminho é uma ocorrência independente.
- Um objeto com a única chave "$nao_json" marca um valor do dado original sem representação JSON (undefined, NaN, Infinity, -0 ou tipo não serializável). Não trate esse marcador como fato.
- As chaves "$ref" e "$nao_json" são reservadas ao renderer: nenhum dado do dossiê, dos módulos ou das evidências as usa.
- Caminhos naturais: dossier.<campo>, modules.<módulo>.<campo> e evidences[i] (campos id, kind, source, fetchedAt, content).

## 4. Metodologia
1. Para cada afirmação VERIFICADO: localize cada evidenceId em evidences (campo id), leia o content integral e confirme que ele sustenta a afirmação. Página de erro, página vazia, conteúdo de outra empresa ou de outro assunto NÃO sustentam VERIFICADO. Nesses casos use o tipo 'VERIFICADO sem evidenceId válido', mesmo quando o ID existe; o nome do tipo é mantido por compatibilidade.
2. Para cada número em afirmação de fato (Claim ou texto corrido): confirme que alguma evidência ou input declara esse mesmo número para a mesma entidade, métrica, unidade e período. Número ausente de todas as evidências usa 'Número inventado / sem fonte'. Número que consta na evidência citada, mas é atribuído a outro sujeito, métrica ou período, não é número inventado: em Claim use 'VERIFICADO sem evidenceId válido'; em recomendação use 'Recomendação apresentada como fato'. Em recomendação, em \`howToValidate\` e nas listas de dados a coletar, quantidade, prazo de execução, SLA, tamanho de amostra e período de análise são parâmetros de desenho e não são issue.
3. Avalie especificidade B2B. Conselho aplicável a qualquer negócio (por exemplo, "melhorar o atendimento") usa 'Afirmação genérica (falta especificidade B2B)'.
4. Verifique coerência transversal. Módulos que contradizem o dossiê ou outro módulo usam 'Contradição entre módulos ou com o dossiê'. Desalinhamento com personas, ICP, tese central ou estágio declarado usa 'Inconsistência de persona ou tese'. Contradição que a própria empresa aponta não é issue; é issue quando o relatório a ignora.
5. Liste cada causa raiz encontrada, sem limite de quantidade. Agrupe as ocorrências de uma mesma causa raiz em uma issue e, em locationPath, liste todos os caminhos separados por " | ". Não invente issues sem base no payload.
6. Rubrica: atribua notas de 0 a 10 nas 4 dimensões, derivadas das falhas e acertos verificados. Não aplique piso nem teto artificial. scoreGeralMedio é a média aritmética exata das 4 dimensões, com uma casa decimal.
7. Parecer: APROVADO somente se não houver issue ALTA ou CRITICA. REQUER AJUSTES se houver falhas corrigíveis de severidade ALTA ou MEDIA sem falha estrutural. REJEITADO se houver falha estrutural que invalida o relatório.

## 5. Guia Campo a Campo
- issuesFound: falhas estruturadas, com o tipo exato da lista. Severidade CRITICA para dano que invalida uma decisão de negócio; ALTA para afirmação sem suporte semântico em ponto central; MEDIA para lacuna corrigível; BAIXA para ajuste de forma.
- rubricaQualidade0a10: notas por dimensão e média geral.
- parecerFinalAprovacao: decisão conforme a regra 7.

## 6. Antipadrões a Evitar
- Aprovar com base na existência de IDs ou na ausência de marcadores mecânicos.
- Declarar que uma evidência foi lida sem comparar seu conteúdo com a afirmação.
- Limitar a lista de issues por quantidade.
- Usar números que não estão no payload.
- Tratar os marcadores "$ref" ou "$nao_json" como dado do dossiê.
`;

const REF_KEY = '$ref';
const NAO_JSON_KEY = '$nao_json';
const RESERVED_KEYS = new Set([REF_KEY, NAO_JSON_KEY]);

// Conta ocorrências de cada string nos dados; falha se algum objeto usar chave reservada.
function countStrings(node: unknown, counts: Map<string, number>): void {
  if (typeof node === 'string') {
    counts.set(node, (counts.get(node) ?? 0) + 1);
    return;
  }
  if (Array.isArray(node)) {
    const items: unknown[] = node;
    for (const item of items) countStrings(item, counts);
    return;
  }
  if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (RESERVED_KEYS.has(key)) {
        throw new Error(`Chave reservada "${key}" não pode aparecer nos dados do critic.`);
      }
      countStrings(value, counts);
    }
  }
}

// Substitui só quando o ganho líquido é positivo: n·(custo do texto − custo da ref) − custo da entrada na tabela.
// Com n ≥ 2 e ganho > 0, o texto codificado tem mais de 31 chars, então nunca coincide com marcadores ou ids sN.
function buildRefIds(counts: Map<string, number>): Map<string, string> {
  const ids = new Map<string, string>();
  for (const [text, occurrences] of counts) {
    if (occurrences < 2) continue;
    const id = `s${ids.size + 1}`;
    const textCost = JSON.stringify(text).length;
    const refCost = JSON.stringify({ [REF_KEY]: id }).length;
    const tableCost = textCost + JSON.stringify(id).length + 1;
    if (occurrences * (textCost - refCost) - tableCost > 0) ids.set(text, id);
  }
  return ids;
}

function markerReplacer(ids: Map<string, string>) {
  return (_key: string, value: unknown): unknown => {
    if (typeof value === 'string') {
      const id = ids.get(value);
      return id === undefined ? value : { [REF_KEY]: id };
    }
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
      return { [NAO_JSON_KEY]: typeof value };
    }
    if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) {
      return { [NAO_JSON_KEY]: Object.is(value, -0) ? '-0' : String(value) };
    }
    return value;
  };
}

/**
 * Payload JSON do critic: estrutura original {dossier, modules, evidences} sem corte de texto.
 * Strings longas repetidas viram uma entrada em `textosRepetidos` e referências {"$ref":"sN"}.
 */
export function renderCriticPayloadJson(input: CriticInput): string {
  const body = { dossier: input.dossier, modules: input.modules, evidences: input.evidences };
  const counts = new Map<string, number>();
  countStrings(body, counts);
  const ids = buildRefIds(counts);
  const table: Record<string, string> = {};
  for (const [text, id] of ids) table[id] = text;
  const bodyJson = JSON.stringify(body, markerReplacer(ids));
  // bodyJson sempre é um objeto com as três chaves; a tabela entra no topo sem replacer.
  return `{"textosRepetidos":${JSON.stringify(table)},${bodyJson.slice(1)}`;
}

function buildUser(input: CriticInput): string {
  return [
    'Audite criticamente o dossiê e os módulos contra as evidências, seguindo as regras de leitura do sistema.',
    'PAYLOAD JSON:',
    renderCriticPayloadJson(input),
    'Retorne o relatório de auditoria e a rubrica em JSON estrito.',
  ].join('\n');
}

export const criticPromptSpec: PromptSpec<CriticInput, CriticOutput> = {
  id: 'critic.audit',
  version: '3.1.2',
  task: 'critic',
  system: CRITIC_SYSTEM_PROMPT,
  buildUser,
  schema: CriticOutputSchema,
};
