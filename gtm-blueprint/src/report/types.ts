// Contrato do relatório que o lead vê. Sem imports: a página do site consome este arquivo como tipo puro.

/** OBSERVADO: fato com fonte. HIPOTESE: a validar em campo. RECOMENDACAO: ação proposta, nunca fato. */
export type ItemTipo = 'OBSERVADO' | 'HIPOTESE' | 'RECOMENDACAO';

export interface ReportItem {
  tipo: ItemTipo;
  texto: string;
  fontes: string[];
  comoValidar?: string;
}

export interface ReportBlock {
  rotulo: string;
  itens: ReportItem[];
}

export interface ReportProximoPasso {
  acao: string;
  responsavel: string;
  prazoDias: number;
}

export type ReportSectionId =
  | 'dossie'
  | 'icp_mercado'
  | 'comite_compra'
  | 'proposta_posicionamento'
  | 'motor_demanda'
  | 'funil_revops'
  | 'unit_economics'
  | 'plano_90_dias';

export interface ReportSection {
  id: ReportSectionId;
  titulo: string;
  status: 'pendente' | 'pronto' | 'indisponivel';
  decisao?: string;
  blocos: ReportBlock[];
  proximosPassos: ReportProximoPasso[];
}

export type ReportOnda = 'onda_1' | 'onda_2' | 'onda_3';

export interface ReportIniciativa {
  titulo: string;
  descricao: ReportItem;
  ice: number;
  impacto: number;
  confianca: number;
  facilidade: number;
  responsavel: string;
  prazoDias: number;
}

export interface ReportUnitEconomics {
  status: string;
  arpuMensal: number | null;
  cac: number | null;
  churnMensal: number | null;
  cicloVendasDias: number | null;
  ltv: number | null;
  paybackMeses: number | null;
  ltvCac: number | null;
}

export interface LeadReport {
  versao: 1;
  empresa: { nome: string; site: string; faseDeclarada: string };
  progresso: { concluidas: number; total: 10; etapaAtual: string | null };
  fontes: Array<{ id: string; tipo: string; url: string; coletadaEm: string }>;
  lacunasDeColeta: string[];
  stackDetectada: Array<{ sinal: string; detectado: boolean }>;
  tese: string | null;
  contradicoes: ReportItem[];
  achados: Array<{ titulo: string; impacto: string; custoDeInacao: string; base: ReportItem }>;
  decisaoDaSemana: string | null;
  plano90Dias: Array<{ onda: ReportOnda; rotulo: string; foco: ReportItem; iniciativas: ReportIniciativa[] }>;
  unitEconomics: ReportUnitEconomics | null;
  dadosAColetar: string[];
  secoes: ReportSection[];
}
