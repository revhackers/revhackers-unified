import { extractPromptSpec } from './extract';
import { dossierPromptSpec } from './dossier';
import { raioXPromptSpec } from './modules/raio_x';
import { icpMercadoPromptSpec } from './modules/icp_mercado';
import { comiteCompraPromptSpec } from './modules/comite_compra';
import { propostaPosicionamentoPromptSpec } from './modules/proposta_posicionamento';
import { motorDemandaPromptSpec } from './modules/motor_demanda';
import { funilRevOpsPromptSpec } from './modules/funil_revops';
import { unitEconomicsPromptSpec } from './modules/unit_economics';
import { plano90DiasPromptSpec } from './modules/plano_90_dias';
import { criticPromptSpec } from './critic';

export * from './types';
export * from './evidence';
export * from './shared';
export * from './extract';
export * from './dossier';
export * from './critic';

export const PROMPTS = {
  extract: extractPromptSpec,
  dossier: dossierPromptSpec,
  'module.raio_x': raioXPromptSpec,
  'module.icp_mercado': icpMercadoPromptSpec,
  'module.comite_compra': comiteCompraPromptSpec,
  'module.proposta_posicionamento': propostaPosicionamentoPromptSpec,
  'module.motor_demanda': motorDemandaPromptSpec,
  'module.funil_revops': funilRevOpsPromptSpec,
  'module.unit_economics': unitEconomicsPromptSpec,
  'module.plano_90_dias': plano90DiasPromptSpec,
  critic: criticPromptSpec,
};

export const MODULE_SPECS_ORDER = [
  raioXPromptSpec,
  icpMercadoPromptSpec,
  comiteCompraPromptSpec,
  propostaPosicionamentoPromptSpec,
  motorDemandaPromptSpec,
  funilRevOpsPromptSpec,
  unitEconomicsPromptSpec,
  plano90DiasPromptSpec,
];
