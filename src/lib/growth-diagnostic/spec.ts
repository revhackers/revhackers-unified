// Diagnóstico Growth — especificação funcional candidata (NÃO validada).
//
// Este arquivo descreve a estrutura de eixos e questões do diagnóstico
// avançado. O scoring que consome este spec é DEMONSTRATIVO: nenhum peso,
// faixa ou rótulo aqui possui validação metodológica ou estatística.
// Ver docs/product/GROWTH_DIAGNOSTIC_DECISOES_METODOLOGICAS.md.

export type GrowthAxisId =
  | 'estrategia'
  | 'posicionamento'
  | 'aquisicao'
  | 'demanda'
  | 'marketing'
  | 'vendas'
  | 'crm'
  | 'revops'
  | 'retencao'
  | 'automacao'
  | 'maturidade';

export interface GrowthAxis {
  id: GrowthAxisId;
  label: string;
  description: string;
  /** Arquivo real do repo de onde o eixo foi derivado (ex. 'src/pages/GrowthScore.tsx:19-29'). */
  source: string;
}

export interface GrowthOption {
  label: string;
  score: number;
  max: number;
}

export interface GrowthQuestion {
  axisId: GrowthAxisId;
  text: string;
  options: GrowthOption[];
  /** Arquivo real do repo de onde a pergunta foi adaptada. Nenhuma pergunta sem source. */
  source: string;
}

export const GROWTH_AXES: GrowthAxis[] = [
  {
    id: 'estrategia',
    label: 'Estratégia de Crescimento',
    description: 'Clareza sobre qual gargalo limita o crescimento (operação, retenção, conversão ou aquisição).',
    source: 'src/pages/GrowthScore.tsx:19-29',
  },
  {
    id: 'posicionamento',
    label: 'Posicionamento e ICP',
    description: 'Refino da segmentação go-to-market e diferenciação frente a concorrentes.',
    source: 'src/pages/GrowthScore.tsx:64-73',
  },
  {
    id: 'aquisicao',
    label: 'Aquisição e Canais',
    description: 'Distribuição da matriz de risco entre canais (inbound, outbound, indicação, ads).',
    source: 'src/pages/GrowthScore.tsx:42-51',
  },
  {
    id: 'demanda',
    label: 'Geração de Demanda',
    description: 'Capacidade de gerar pipeline previsível em vez de depender de indicações.',
    source: 'src/data/reiOnboardingQuestions.ts:90-100',
  },
  {
    id: 'marketing',
    label: 'Marketing e Qualificação',
    description: 'Critérios objetivos de qualificação (MQL para SQL) antes do time comercial.',
    source: 'src/pages/RevenueScore.tsx:44-53',
  },
  {
    id: 'vendas',
    label: 'Processo de Vendas',
    description: 'Existência de processo documentado, metas desdobradas e playbooks seguidos.',
    source: 'src/data/reiOnboardingQuestions.ts:101-111',
  },
  {
    id: 'crm',
    label: 'CRM e Fonte da Verdade',
    description: 'Nível de adoção do CRM pelo time comercial como fonte única da verdade.',
    source: 'src/pages/RevenueScore.tsx:21-31',
  },
  {
    id: 'revops',
    label: 'RevOps e SLA',
    description: 'Alinhamento entre marketing e vendas via SLA, e arquitetura correta de CRM.',
    source: 'src/pages/RevenueScore.tsx:55-64',
  },
  {
    id: 'retencao',
    label: 'Retenção e LTV',
    description: 'Capacidade de reter receita (churn sob controle) em vez de só fechar negócio novo.',
    source: 'src/data/reiOnboardingQuestions.ts:160-170',
  },
  {
    id: 'automacao',
    label: 'Automação e IA',
    description: 'Processos montados e automatizados (IA, follow-up, nutrição) que suportam escala.',
    source: 'src/pages/GrowthScore.tsx:53-62',
  },
  {
    id: 'maturidade',
    label: 'Maturidade de Dados',
    description: 'Clareza financeira e analítica (CAC teto, conversão por etapa, dashboards).',
    source: 'src/pages/GrowthScore.tsx:31-40',
  },
];

export const GROWTH_QUESTIONS: GrowthQuestion[] = [
  {
    axisId: 'estrategia',
    text: 'Se você tivesse uma varinha mágica hoje, qual problema resolveria primeiro no seu negócio?',
    options: [
      { label: 'Tracionar aquisição (não entra lead suficiente)', score: 20, max: 20 },
      { label: 'Converter (entra lead bom, mas o time não fecha)', score: 10, max: 20 },
      { label: 'Reter (fechamos bem, mas o churn está alto)', score: 5, max: 20 },
      { label: 'Operação (tudo roda, mas o gargalo sou eu)', score: 0, max: 20 },
    ],
    source: 'src/pages/GrowthScore.tsx:19-29',
  },
  {
    axisId: 'posicionamento',
    text: 'Em relação ao seu Perfil Ideal de Cliente (ICP), quão refinada é a segmentação do seu go-to-market hoje?',
    options: [
      { label: 'Tese cirúrgica: nicho, dor e tamanho bem qualificados', score: 20, max: 20 },
      { label: 'Sabemos o ICP, mas a mídia atrai curiosos genéricos', score: 10, max: 20 },
      { label: 'ICP muito amplo (ex.: "MPEs e médias do Brasil todo")', score: 5, max: 20 },
      { label: 'Nenhuma barreira de entrada: qualquer interessado entra', score: 0, max: 20 },
    ],
    source: 'src/pages/GrowthScore.tsx:64-73',
  },
  {
    axisId: 'aquisicao',
    text: 'Como está distribuída a sua matriz de risco em Vendas e Marketing?',
    options: [
      { label: '100% distribuída (inbound, outbound, indicação, ads)', score: 20, max: 20 },
      { label: 'Dois canais principais funcionando bem', score: 10, max: 20 },
      { label: 'Dependemos quase 100% de tráfego pago', score: 5, max: 20 },
      { label: 'Vivemos de indicação e network', score: 0, max: 20 },
    ],
    source: 'src/pages/GrowthScore.tsx:42-51',
  },
  {
    axisId: 'demanda',
    text: 'Como é o fluxo de geração de leads da empresa?',
    options: [
      { label: 'Máquina de vendas previsível e escalável', score: 100, max: 100 },
      { label: 'Mix de inbound e outbound estruturado', score: 80, max: 100 },
      { label: 'Prospecção ativa manual', score: 40, max: 100 },
      { label: 'Dependemos 100% de indicações', score: 20, max: 100 },
    ],
    source: 'src/data/reiOnboardingQuestions.ts:90-100',
  },
  {
    axisId: 'marketing',
    text: 'Quais atributos objetivos qualificam um lead como pronto para o seu time comercial (MQL para SQL)?',
    options: [
      { label: 'Matriz BANT/SPIN: vendas só recebe lead com budget e momento', score: 20, max: 20 },
      { label: 'Critérios básicos (tamanho, cargo), mas passam leads fora', score: 10, max: 20 },
      { label: 'Marketing envia qualquer um que baixe material', score: 5, max: 20 },
      { label: 'Sem qualificação: caiu no form, o vendedor tenta fechar', score: 0, max: 20 },
    ],
    source: 'src/pages/RevenueScore.tsx:44-53',
  },
  {
    axisId: 'vendas',
    text: 'Existe um processo de vendas documentado e seguido pelo time?',
    options: [
      { label: 'Sim, e otimizamos constantemente com dados', score: 100, max: 100 },
      { label: 'Sim, temos playbooks documentados', score: 80, max: 100 },
      { label: 'Existe, mas não está documentado', score: 30, max: 100 },
      { label: 'Não, cada um vende do seu jeito', score: 0, max: 100 },
    ],
    source: 'src/data/reiOnboardingQuestions.ts:101-111',
  },
  {
    axisId: 'crm',
    text: 'Seja honesto: qual é a relação real do seu time comercial com o CRM hoje?',
    options: [
      { label: 'É a única fonte da verdade, automação total', score: 20, max: 20 },
      { label: 'Usam, mas atualizam como obrigação no fim do dia', score: 10, max: 20 },
      { label: 'Odeiam: muita informação no caderno e WhatsApp', score: 5, max: 20 },
      { label: 'Comercial não usa CRM', score: 0, max: 20 },
    ],
    source: 'src/pages/RevenueScore.tsx:21-31',
  },
  {
    axisId: 'revops',
    text: 'Como funciona o Acordo de Nível de Serviço (SLA) entre a atração (marketing) e o fechamento (vendas)?',
    options: [
      { label: 'SLA assinado: tempo limite para abordar e reportar perda', score: 20, max: 20 },
      { label: 'Combinado de boca: marketing reclama de vendas e vice-versa', score: 10, max: 20 },
      { label: 'Sem SLA, canais separados, contato só por mensagem', score: 5, max: 20 },
      { label: 'Sem divisão: anuncia de dia, vende à noite', score: 0, max: 20 },
    ],
    source: 'src/pages/RevenueScore.tsx:55-64',
  },
  {
    axisId: 'retencao',
    text: 'Qual o seu principal gargalo para crescer hoje?',
    options: [
      { label: 'Churn alto / LTV baixo', score: 70, max: 100 },
      { label: 'Leads chegam mas não fecham', score: 60, max: 100 },
      { label: 'Falta de leads qualificados', score: 50, max: 100 },
      { label: 'Processo caótico / falta de braço', score: 40, max: 100 },
    ],
    source: 'src/data/reiOnboardingQuestions.ts:160-170',
  },
  {
    axisId: 'automacao',
    text: 'Se dobrarmos a sua entrada de leads amanhã, sua operação quebra?',
    options: [
      { label: 'Não: processos montados e automatizados', score: 20, max: 20 },
      { label: 'Quebra a entrega/produto', score: 10, max: 20 },
      { label: 'Quebra o time comercial (muito processo manual)', score: 5, max: 20 },
      { label: 'Eu surto: faço as duas coisas sozinho', score: 0, max: 20 },
    ],
    source: 'src/pages/GrowthScore.tsx:53-62',
  },
  {
    axisId: 'maturidade',
    text: "Qual é a sua real clareza sobre o Custo de Aquisição (CAC) 'teto' versus o CAC ideal?",
    options: [
      { label: 'Sei de cor por canal/coorte; monitoro o break-even semanalmente', score: 20, max: 20 },
      { label: "Sei o custo médio, mas não delimitei o 'teto' do prejuízo bruto", score: 10, max: 20 },
      { label: 'Olho majoritariamente para o CPL na camada de ads', score: 5, max: 20 },
      { label: 'Só meço gastos vs. receita total', score: 0, max: 20 },
    ],
    source: 'src/pages/GrowthScore.tsx:31-40',
  },
];
