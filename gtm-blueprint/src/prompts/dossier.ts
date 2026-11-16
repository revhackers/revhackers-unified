import { z } from 'zod';
import type { PromptSpec } from './types';
import { SHARED_SYSTEM_PREAMBLE } from './shared';
import { ClaimSchema, Evidence, renderEvidenceCompact } from './evidence';

export const DossierInputSchema = z.object({
  companyName: z.string(),
  websiteUrl: z.string(),
  declaredPhase: z.string().describe('Ex: Estruturação Inicial, Primeira Tração Validada, Escala Estruturada, Otimização e Eficiência'),
  declaredIcp: z.string().optional(),
  competitors: z.array(z.string()).describe('Lista de concorrentes informados ou descobertos'),
  computedFacts: z.object({
    cnpjAgeYears: z.number().nullable().optional(),
    companySizeEstimated: z.string().nullable().optional(),
    estimatedAddressState: z.string().nullable().optional(),
  }),
  evidences: z.array(z.any()).describe('Lista de evidências coletadas (Extracts, CNPJ, etc.)'),
});

export type DossierInput = z.infer<typeof DossierInputSchema>;

export const DossierOutputSchema = z.object({
  teseCentral: z.string().describe('Tese central do negócio em 1 frase incisiva e memorável'),
  estagioRealVsDeclarado: z.object({
    declarado: z.string(),
    realidadeAuditada: z.string(),
    contradiçõesEncontradas: z.array(ClaimSchema),
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
  comiteCompraB2B: z.array(z.object({
    papel: z.enum(['Decisor (C-Level/Diretor)', 'Influenciador Técnico', 'Usuário Final', 'Bloqueador/Financeiro']),
    nomeFantasiaPersona: z.string().describe('Ex: Carlos Alberto (CRO)'),
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
1. Triagem exaustiva de todas as evidências coletadas (E1..En) provenientes da homepage, páginas de preços, sobre, cases e concorrentes.
2. Sintetizar a tese central do negócio em uma frase incisiva e memorável focada em valor B2B SaaS.
3. Contrastar rigorosamente a fase declarada pela empresa com a realidade auditada nas evidências e dados de CNPJ (idade, porte, UF), destacando contradições estruturais (ex: CNPJ antigo com site raso).
4. Identificar o modelo de negócio predominante (PLG, Enterprise Sales, Self-Service + Inside Sales, Marketplace, Agency/Service-led) amparado por evidências.
5. Mapear o ICP firmográfico atual com base estrita no texto do site e concorrentes.
6. Desenvolver de 3 a 5 personas executivas reais do comitê de compra B2B (Decisor C-Level, Influenciador Técnico, Usuário Final, Bloqueador Financeiro), nomeando-as profissionalmente.
7. Analisar concorrentes reais mapeados e seus diferenciais observados.
8. Identificar sinais claros de maturidade de GTM e os top riscos críticos que ameaçam o crescimento.
9. Listar lacunas de dados críticas que impeçam conclusão definitiva.

## 3. Guia Detalhado Campo a Campo
- \`teseCentral\`: Frase síntese de posicionamento e valor diferenciado no mercado B2B brasileiro.
- \`estagioRealVsDeclarado\`: Análise crítica confrontando o discurso do fundador com dados reais de CNPJ e site.
- \`modeloNegocio\`: Classificação exata do modelo e monetização com Claims fundamentados.
- \`icpAtualFirmografico\`: Segmento, porte de funcionários, faixa de faturamento e sinais/tecnologias.
- \`comiteCompraB2B\`: Personas nomeadas com dores, gatilhos de compra e objeções principais.
- \`concorrentesReais\`: Concorrentes reais comparados.
- \`sinaisMaturidadeGtm\`: Evidências de processos comerciais modernos.
- \`topRiscos\`: Riscos operacionais e estratégicos.
- \`lacunasDeDadosCriticas\`: O que falta coletar.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"text": "A empresa opera no modelo Self-Service + Inside Sales com ticket estimado em R$ 1.500/mês, voltado para gestores de operações de logísticas médias conforme planos em [E2].", "status": "VERIFICADO", "evidenceIds": ["E2"]}\`
- MAL: \`{"text": "A empresa tem um modelo de negócios excelente e escalável para todos os setores.", "status": "VERIFICADO", "evidenceIds": []}\`

## 5. Antipadrões a Evitar
- Nunca omitir divergências entre o CNPJ antigo e a ausência de tração digital.
- Nunca inventar faturamento ou número de clientes ausentes das evidências.
`;

export const dossierPromptSpec: PromptSpec<DossierInput, DossierOutput> = {
  id: 'dossier.build',
  version: '1.0.0',
  task: 'dossier',
  system: DOSSIER_SYSTEM_PROMPT,
  buildUser(input: DossierInput): string {
    const compactEv = renderEvidenceCompact(input.evidences as Evidence[]);
    return `Construa o Dossiê Estratégico para a seguinte empresa:

- Empresa: ${input.companyName}
- Website: ${input.websiteUrl}
- Fase Declarada: ${input.declaredPhase}
- ICP Declarado: ${input.declaredIcp || 'Não informado'}
- Concorrentes Informados: ${input.competitors.join(', ')}
- Fatos Computados (CNPJ/Porte): Idade CNPJ: ${input.computedFacts.cnpjAgeYears ?? 'Desconhecida'} anos | Porte estimado: ${input.computedFacts.companySizeEstimated ?? 'Não informado'} | UF: ${input.computedFacts.estimatedAddressState ?? 'Não informada'}

EVIDÊNCIAS COLETADAS:
${compactEv}

Gere o Dossiê Estratégico completo em formato JSON estrito conforme o schema.`;
  },
  schema: DossierOutputSchema,
};
