export type FrameworkStatus = 'pending' | 'generating' | 'done' | 'error';
export type GrowthMapPillar = 'inteligencia_estrategica' | 'concepcao_valor' | 'mvp_validacao' | 'escalabilidade';

export interface REIConnection {
  label: string;
  value: string;
  insight: string;
  type: 'warning' | 'critical' | 'ok';
}

export interface GeneratedAction {
  title: string;
  priority: string;
  connected_to_sprint: boolean;
}

export interface FrameworkResult {
  id: string;
  pillar: GrowthMapPillar | string;
  title: string;
  subtitle: string;
  status: FrameworkStatus;
  generated_at?: string;
  data?: any;
  rei_connections?: REIConnection[];
  generated_actions?: GeneratedAction[];
}

export interface GrowthMapState {
  project_id: string;
  company_name: string;
  company_description: string;
  generated_at?: string;
  rei_score?: number;
  growthmap_score?: number;
  rei_connections_count?: number;
  frameworks: Record<string, FrameworkResult>;
}

// ─── Framework-specific data interfaces ───────────────────────────────────────

export interface TamSamSomData {
  tam: { value: string; label: string; description: string };
  sam: { value: string; label: string; description: string };
  som: { value: string; label: string; description: string };
}

export interface SwotData {
  forcas: { text: string }[];
  fraquezas: { text: string }[];
  oportunidades: { text: string }[];
  ameacas: { text: string }[];
}

export interface PestelData {
  politico: { bullets: string[] };
  economico: { bullets: string[] };
  social: { bullets: string[] };
  tecnologico: { bullets: string[] };
  ambiental: { bullets: string[] };
  legal: { bullets: string[] };
}

export interface PorterData {
  rivalidade: { level: 'baixo' | 'medio' | 'alto'; description: string };
  novos_entrantes: { level: 'baixo' | 'medio' | 'alto'; description: string };
  substitutos: { level: 'baixo' | 'medio' | 'alto'; description: string };
  fornecedores: { level: 'baixo' | 'medio' | 'alto'; description: string };
  compradores: { level: 'baixo' | 'medio' | 'alto'; description: string };
}

export interface VrioBenchmarkData {
  resources: Array<{
    name: string;
    level: 'vantagem_sustentavel' | 'vantagem_competitiva' | 'paridade' | 'desvantagem';
    competitors: Record<string, 'vantagem_sustentavel' | 'vantagem_competitiva' | 'paridade' | 'desvantagem'>;
  }>;
  competitors: string[];
}

export interface AarrrStageData {
  metric: string;
  meta: string;
  status: 'critico' | 'alerta' | 'ok' | 'meta';
  current_value?: string | number;
  tactics: string[];
}

export interface AarrrData {
  aquisicao: AarrrStageData;
  ativacao: AarrrStageData;
  retencao: AarrrStageData;
  receita: AarrrStageData;
  referencia: AarrrStageData;
  reativacao: AarrrStageData;
}

export interface NorthStarData {
  metric_name: string;
  description: string;
  current_value?: string | number;
  target_value?: string | number;
  why_this_metric: string[];
  leading_indicators: { label: string; description: string }[];
}

export interface CustomerJourneyData {
  stages: Array<{
    number: number;
    name: string;
    description: string;
    emotion: string;
    emotion_type: 'positive' | 'negative' | 'neutral';
  }>;
}

export interface VPCData {
  customer_profile: {
    jobs: string[];
    pains: string[];
    gains: string[];
  };
  value_map: {
    products: string[];
    pain_relievers: string[];
    gain_creators: string[];
  };
}

export interface EmpathyMapData {
  pensa_sente: string[];
  ve: string[];
  fala_faz: string[];
  ouve: string[];
  dores: string[];
  ganhos: string[];
}

export interface UspData {
  statement: string;
  pillars: Array<{
    title: string;
    description: string;
    bullets: string[];
  }>;
}

export interface GTMData {
  positioning: string;
  key_differentials: string[];
  launch_phases: Array<{
    name: string;
    duration: string;
    actions: string[];
    color: string;
  }>;
}

export interface ICEScoreData {
  initiatives: Array<{
    name: string;
    impact: number;
    confidence: number;
    ease: number;
    score: number;
    priority: 'high' | 'medium' | 'low' | string;
  }>;
}
