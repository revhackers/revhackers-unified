import { z } from 'zod';
import type { PromptSpec } from './types';
import { SHARED_SYSTEM_PREAMBLE } from './shared';
import { ClaimSchema, Evidence, renderEvidenceCompact } from './evidence';
import { competitorLines } from './numberGuard';
import { ExtractOutputSchema, type ExtractOutput } from './extract';

export const DossierInputSchema = z.object({
  companyName: z.string(),
  websiteUrl: z.string(),
  declaredPhase: z.string().describe('Ex: Estruturação Inicial, Primeira Tração Validada, Escala Estruturada, Otimização e Eficiência'),
  declaredIcp: z.string().optional(),
  competitors: z.array(z.object({ url: z.string(), collected: z.boolean() })).describe('Concorrentes informados, com indicação de coleta. Só os coletados são analisados.'),
  computedFacts: z.object({
    cnpjAgeYears: z.number().nullable().optional(),
    companySizeEstimated: z.string().nullable().optional(),
    estimatedAddressState: z.string().nullable().optional(),
  }),
  evidences: z.array(z.any()).describe('Lista de evidências coletadas (Extracts, CNPJ, etc.)'),
  fatosExtraidos: z.array(z.object({ evidenceId: z.string(), extract: ExtractOutputSchema })).describe('Extrações de página com citação conferida no texto da página'),
});

export type DossierInput = z.infer<typeof DossierInputSchema>;

export const DossierOutputSchema = z.object({
  teseCentral: z.string().describe('Tese central do negócio em 1 frase incisiva e memorável'),
  estagioRealVsDeclarado: z.object({
    declarado: z.string(),
    realidadeAuditada: z.string(),
    contradicoesEncontradas: z.array(ClaimSchema),
  }),
  modeloNegocio: z.object({
    tipo: z.enum(['PLG', 'Enterprise Sales', 'Self-Service + Inside Sales', 'Marketplace', 'Serviço com Produto (Agency/Service-led)']),
    monetizacao: ClaimSchema,
    ticketMedioEstimado: ClaimSchema,
  }),
  icpAtualFirmografico: z.object({
    segmentoSetor: ClaimSchema,
    tamanhoEmpresa: ClaimSchema,
    faturamentoAnualOuFaixa: ClaimSchema,
    tecnologiasOuSinaisChave: ClaimSchema,
  }),
  icpDeclaradoVsClientes: z.object({
    clientesObservados: z.array(z.object({ nome: z.string(), setorAparente: z.string(), evidenceId: z.string() })),
    alinhamento: z.enum(['ALINHADO', 'PARCIAL', 'DIVERGENTE', 'SEM_PROVA_SOCIAL']),
    leitura: ClaimSchema,
  }),
  comiteCompraB2B: z.array(z.object({
    papel: z.enum(['Decisor (C-Level/Diretor)', 'Influenciador Técnico', 'Usuário Final', 'Bloqueador/Financeiro']),
    cargoArquetipo: z.string().describe('Cargo e contexto, sem nome de pessoa. Ex: CRO de SaaS B2B mid-market'),
    dorPrincipal: ClaimSchema,
    gatilhoDeCompra: ClaimSchema,
    objecaoPrincipal: ClaimSchema,
  })).min(3).max(5),
  concorrentesReais: z.array(z.object({
    nome: z.string(),
    posicionamentoVsNos: ClaimSchema,
    diferencialObservado: ClaimSchema,
  })),
  sinaisMaturidadeGtm: z.array(ClaimSchema),
  topRiscos: z.array(ClaimSchema).min(3).max(5),
  lacunasDeDadosCriticas: z.array(z.string()),
});

export type DossierOutput = z.infer<typeof DossierOutputSchema>;

const DOSSIER_SYSTEM_PROMPT = `${SHARED_SYSTEM_PREAMBLE}

# Módulo Mestre: Dossiê Estratégico (Single Source of Truth)

## 1. Objetivo Executivo e Estratégico
Atuar como o estrategista sênior de GTM construindo o Dossiê Estratégico, o artefato mestre que serve como a Verdade Absoluta (Single Source of Truth) para todos os 8 módulos subsequentes do GTM Blueprint RevHackers. Toda tese, ICP, persona e contradição mapeada aqui deve ser estritamente referenciada e mantida por todos os módulos seguintes, garantindo rigor analítico e coesão absoluta.

## 2. Metodologia Passo a Passo de Análise
1. Triagem exaustiva de todas as evidências coletadas (E1..En) provenientes da homepage, páginas de preços, sobre, cases e concorrentes. O bloco FATOS EXTRAÍDOS COM CITAÇÃO CONFERIDA é a leitura já conferida de cada página: use-o junto das evidências.
2. Sintetizar a tese central do negócio em uma única frase, sem nenhum número, focada em valor B2B SaaS. Quantificação vai nos achados do Raio-X, nunca na tese.
3. Contrastar rigorosamente a fase declarada pela empresa com a realidade auditada nas evidências e dados de CNPJ (idade, porte, UF), destacando contradições estruturais (ex: CNPJ antigo com site raso).
4. Identificar o modelo de negócio predominante (PLG, Enterprise Sales, Self-Service + Inside Sales, Marketplace, Agency/Service-led) amparado por evidências.
5. Mapear o ICP firmográfico atual com base estrita no texto do site e concorrentes.
6. Desenvolver de 3 a 5 personas do comitê de compra B2B (Decisor C-Level, Influenciador Técnico, Usuário Final, Bloqueador Financeiro), descrevendo cada uma pelo cargo arquetípico e contexto, sem inventar nome de pessoa.
7. Analisar concorrentes reais mapeados e seus diferenciais observados. Só analise concorrente listado como coletado.
8. Identificar sinais claros de maturidade de GTM e os top riscos críticos que ameaçam o crescimento.
9. Listar lacunas de dados críticas que impeçam conclusão definitiva.
10. Liste cada cliente, logo ou depoimento nomeado nas evidências com o setor aparente e compare com o ICP declarado.

## 3. Guia Detalhado Campo a Campo
- \`teseCentral\`: Exatamente 1 frase de posicionamento e valor diferenciado no mercado B2B brasileiro, sem nenhum número (percentual, valor, prazo ou quantidade). Quantificação vai nos achados do Raio-X, nunca na tese.
- \`estagioRealVsDeclarado\`: Análise crítica confrontando o discurso do fundador com dados reais de CNPJ e site. \`contradicoesEncontradas\` lista cada divergência como Claim.
- \`modeloNegocio\`: Classificação exata do modelo e monetização com Claims fundamentados.
- \`icpAtualFirmografico\`: Segmento, porte de funcionários, faixa de faturamento e sinais/tecnologias.
- \`icpDeclaradoVsClientes\`: Clientes, logos e depoimentos nomeados nas evidências, com setor aparente, comparados ao ICP declarado. \`alinhamento\` é ALINHADO, PARCIAL, DIVERGENTE ou SEM_PROVA_SOCIAL. Cada \`evidenceId\` deve existir na lista recebida. Sem cliente nomeado, use SEM_PROVA_SOCIAL e lista vazia.
- \`comiteCompraB2B\`: Personas por cargo arquetípico, com dores, gatilhos de compra e objeções como hipótese a validar.
- \`concorrentesReais\`: Concorrentes reais comparados.
- \`sinaisMaturidadeGtm\`: Evidências de processos comerciais modernos.
- \`topRiscos\`: Riscos operacionais e estratégicos.
- \`lacunasDeDadosCriticas\`: O que falta coletar.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"text": "A empresa opera no modelo Self-Service + Inside Sales: a página de planos [E2] publica preços e o botão principal leva a um teste gratuito.", "status": "VERIFICADO", "evidenceIds": ["E2"]}\`
- MAL: \`{"text": "A empresa tem um modelo de negócios excelente e escalável para todos os setores.", "status": "VERIFICADO", "evidenceIds": []}\`
- \`teseCentral\` BOM: "A empresa precisa decidir entre vender autoatendimento e vender implantação consultiva: a home [E1] promete o primeiro e a página de cases [E3] vende o segundo."
- \`teseCentral\` MAL: "Perda de [N]% das oportunidades por falta de follow-up: a empresa precisa de um SDR."

## 5. Antipadrões a Evitar
- Nunca omitir divergências entre o CNPJ antigo e a ausência de tração digital.
- Nunca inventar faturamento ou número de clientes ausentes das evidências.
- Nunca tratar a copy de venda do site como prova do que o cliente sente.
- Nunca listar como cliente uma empresa que não aparece nomeada nas evidências.
- Nunca colocar número na \`teseCentral\`: quantificação vai nos achados.
- Depoimentos com o autor exatamente como consta na evidência citada; nunca trocar o sujeito da frase. Contagens na leitura apenas via clientesObservados.
`;

/** Uma linha por fato extraído, com a citação literal que o sustenta. Sem fato conferido, uma linha de ausência. */
function renderFatosExtraidos(facts: DossierInput['fatosExtraidos']): string {
  if (facts.length === 0) return 'Nenhum fato extraído com citação conferida.';
  return facts.map(({ evidenceId, extract }) => renderExtract(evidenceId, extract)).join('\n');
}

function renderExtract(evidenceId: string, extract: ExtractOutput): string {
  const lines: string[] = [];
  if (extract.propostaValorDeclarada) {
    lines.push(`Proposta de valor: ${extract.propostaValorDeclarada.resumo} — citação: "${extract.propostaValorDeclarada.quote}"`);
  }
  if (extract.icpDeclarado) {
    lines.push(`ICP declarado: ${extract.icpDeclarado.publicoAlvo} — citação: "${extract.icpDeclarado.quote}"`);
  }
  for (const plano of extract.produtosPlanosPrecos) {
    lines.push(`Plano ${plano.nomePlano} (${plano.precoStr}): ${plano.features.join(', ')} — citação: "${plano.quote}"`);
  }
  for (const prova of extract.provasSociais) {
    lines.push(`Prova social (${prova.tipo}): ${prova.descricao} — citação: "${prova.quote}"`);
  }
  for (const cta of extract.ctasConversao) {
    lines.push(`CTA "${cta.textoBotao}" → ${cta.destino ?? 'sem destino'} — citação: "${cta.quote}"`);
  }
  if (extract.sinaisMaturidade.length > 0) lines.push(`Sinais de maturidade: ${extract.sinaisMaturidade.join('; ')}`);
  if (extract.lacunasOuInconsistencias.length > 0) lines.push(`Lacunas e inconsistências: ${extract.lacunasOuInconsistencias.join('; ')}`);
  if (lines.length === 0) return `[${evidenceId}] Nenhum fato com citação conferida.`;
  return lines.map((line) => `[${evidenceId}] ${line}`).join('\n');
}

export const dossierPromptSpec: PromptSpec<DossierInput, DossierOutput> = {
  id: 'dossier.build',
  version: '2.0.1',
  task: 'dossier',
  system: DOSSIER_SYSTEM_PROMPT,
  buildUser(input: DossierInput): string {
    const compactEv = renderEvidenceCompact(input.evidences as Evidence[], 60000);
    return `Construa o Dossiê Estratégico para a seguinte empresa:

- Empresa: ${input.companyName}
- Website: ${input.websiteUrl}
- Fase Declarada: ${input.declaredPhase}
- ICP Declarado: ${input.declaredIcp || 'Não informado'}
${competitorLines(input.competitors).map((line) => `- ${line}`).join('\n')}
- Fatos Computados (CNPJ/Porte): Idade CNPJ: ${input.computedFacts.cnpjAgeYears ?? 'Desconhecida'} anos | Porte estimado: ${input.computedFacts.companySizeEstimated ?? 'Não informado'} | UF: ${input.computedFacts.estimatedAddressState ?? 'Não informada'}

FATOS EXTRAÍDOS COM CITAÇÃO CONFERIDA:
${renderFatosExtraidos(input.fatosExtraidos)}

EVIDÊNCIAS COLETADAS:
${compactEv}

Gere o Dossiê Estratégico completo em formato JSON estrito conforme o schema.`;
  },
  schema: DossierOutputSchema,
};
