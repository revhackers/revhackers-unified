import { z } from 'zod';
import type { PromptSpec } from '../types';
import { SHARED_SYSTEM_PREAMBLE } from '../shared';
import { ClaimSchema, RecomendacaoSchema } from '../evidence';

export const PropostaPosicionamentoInputSchema = z.object({
  dossierSummary: z.record(z.any()),
  comiteCompraOutput: z.record(z.any()),
});

export type PropostaPosicionamentoInput = z.infer<typeof PropostaPosicionamentoInputSchema>;

export const PropostaPosicionamentoOutputSchema = z.object({
  declaracaoPosicionamento: RecomendacaoSchema.describe('Declaração clara de posicionamento no formato: Para [ICP], [Empresa] é o [categoria] que [benefício único], ao contrário de [Concorrente], porque [diferencial defensável].'),
  pilaresDiferenciacao: z.array(z.object({
    pilar: z.string(),
    descricao: ClaimSchema,
    defensibilidade: ClaimSchema,
  })).min(3).max(4),
  provasNecessariasAusentes: z.array(ClaimSchema).describe('O que falta provar no site/materiais para convencer o comitê'),
  decisao: z.string(),
  proximosPassos: z.array(z.object({
    acao: z.string(),
    responsavelRole: z.string(),
    prazoDias: z.number(),
  })).min(1),
});

export type PropostaPosicionamentoOutput = z.infer<typeof PropostaPosicionamentoOutputSchema>;

const SYSTEM_ADDENDUM = `
# Módulo 4: Proposta de Valor e Posicionamento B2B

## 1. Objetivo Executivo e Estratégico
Ajustar e blindar o posicionamento de mercado da empresa para desbancar os concorrentes reais mapeados no Dossiê, entregando uma declaração de posicionamento cirúrgica baseada no formato clássico (Para [ICP], [Empresa] é o [categoria] que [benefício único], ao contrário de [Concorrente], porque [diferencial defensável]).

## 2. Metodologia Passo a Passo de Análise
1. Analisar as dores do comitê de compra e os concorrentes reais identificados no Dossiê Estratégico.
2. Construir a declaração formal de posicionamento preenchendo todos os campos estruturais com rigor analítico.
3. Definir de 3 a 4 pilares sólidos de diferenciação que expliquem por que a solução supera alternativas legadas ou concorrentes diretos.
4. Identificar com base nas evidências coletadas quais provas de autoridade (cases, certificações, garantias, métricas) ainda estão ausentes no site e precisam ser construídas.
5. Definir decisão executiva e próximos passos de comunicação.

## 3. Guia Detalhado Campo a Campo
- \`declaracaoPosicionamento\`: Recomendação (\`{ text, baseadoEm }\`) com ICP, categoria, benefício, concorrente contrastado e diferencial. Não afirma resultado.
- \`pilaresDiferenciacao\`: Pilares estratégicos com descrição e defensibilidade baseada em Claims. Comparação percentual de preço com concorrente só entra como hipótese a validar com tabela pública em moeda local.
- \`provasNecessariasAusentes\`: O que falta publicar no site para validar a promessa.
- \`decisao\`: Decisão executiva. Em \`decisao\`, sem faixa de preço ou SLA de resultado sem fonte citada.

## 4. Padrão de Qualidade & Exemplo (B2B SaaS Brasil)
- BOM: \`{"declaracaoPosicionamento": {"text": "Para diretores comerciais de médias empresas, a RevHackers é a plataforma de RevOps que automatiza cadências multicanal, ao contrário de CRMs tradicionais, porque publica o método e o prazo de implantação [E1].", "baseadoEm": ["E1"]}}\`
- MAL: \`{"declaracaoPosicionamento": {"text": "Somos a melhor empresa do mercado.", "baseadoEm": []}}\`

## 5. Antipadrões a Evitar
- Nunca omitir o contraste com concorrentes reais nomeados nas evidências.
- Nunca emitir promessas genéricas de "inovação e qualidade".
- Número que o dossiê classifica como HIPOTESE nunca vira VERIFICADO em outro módulo; defensibilidade com status coerente com o que o próprio texto admite. Case de outro segmento nunca prova resultado para o ICP (ex.: métrica de EAD não prova valor para SaaS B2B).
- Anti-exemplo real (eval): MAL \`{"pilar": "Preço", "descricao": {"text": "Preço [N]% menor que o concorrente [E7].", "status": "VERIFICADO", "evidenceIds": ["E7"]}}\` → BOM \`{"pilar": "Preço", "descricao": {"text": "O preço publicado do concorrente [E7] ainda não foi comparado em reais para o mesmo perfil de usuário.", "status": "HIPOTESE", "evidenceIds": ["E7"], "howToValidate": "Coletar a tabela em reais do concorrente para o plano equivalente e calcular a diferença por usuário."}}\`
`;

export const propostaPosicionamentoPromptSpec: PromptSpec<PropostaPosicionamentoInput, PropostaPosicionamentoOutput> = {
  id: 'module.proposta_posicionamento',
  version: '2.0.1',
  task: 'module',
  system: SHARED_SYSTEM_PREAMBLE + SYSTEM_ADDENDUM,
  buildUser(input: PropostaPosicionamentoInput): string {
    return `Com base no Dossiê e no Comitê de Compra, gere o Módulo 4 (Proposta de Posicionamento) em JSON estrito.

DOSSIÊ ESTRATÉGICO:
${JSON.stringify(input.dossierSummary, null, 2)}

COMITÊ DE COMPRA:
${JSON.stringify(input.comiteCompraOutput, null, 2)}`;
  },
  schema: PropostaPosicionamentoOutputSchema,
};
