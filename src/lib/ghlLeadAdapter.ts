/**
 * ghlLeadAdapter.ts
 *
 * Adapter tipado do ciclo lead > diagnostico > resultado > contato >
 * oportunidade > follow-up para o relay GHL (`src/lib/ghlRelay.ts`).
 *
 * Contratos: `docs/ghl-lead-lifecycle-contracts.md`.
 * Proibicoes desta frente: nenhum contato real em testes (sender injetavel e
 * mockado), nenhuma alteracao em `public/api/ghl.php`, nenhuma config
 * GHL/agencia/subconta tocada.
 */

import { sendToGHL } from './ghlRelay';

export type LifecycleStage =
  | 'lead'
  | 'diagnostico'
  | 'resultado'
  | 'contato'
  | 'oportunidade'
  | 'follow_up';

export type LeadFormKind = 'diagnosis' | 'contact' | 'material' | 'newsletter' | 'calculator' | 'rei';

export interface LeadRecord {
  fullName?: string;
  name?: string;
  email?: string;
  corporateEmail?: string;
  company?: string;
  phone?: string;
  role?: string;
  segment?: string;
  source?: string;
  diagnosticoId?: string;
  diagnostic_type?: string;
  score?: number;
  maturity_level?: string;
  materialId?: string;
  materialTitle?: string;
  formType?: string;
  tags?: string[];
}

export interface StageOptions {
  /** Consentimento LGPD. Obrigatorio: sem ele o envio e recusado. */
  lgpdConsent: boolean;
  formKind?: LeadFormKind;
  /** Evento GHL especifico do diagnostico (ex. o usado pelo form chamador). */
  diagnosticEvent?: string;
  /** Tag extra para follow-up e reengajamento. */
  followUpKind?: 'no_response' | 'next_step' | 'reengajamento';
}

export type GHLSender = (eventType: string, payload: Record<string, unknown>) => Promise<boolean>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EVENT_BY_FORM_KIND: Record<string, string> = {
  newsletter: 'newsletter',
  material: 'download',
  calculator: 'roi_calculator',
  rei: 'rei_completed',
  contact: 'contact_form',
  diagnosis: 'lead_capture',
};

/** Campos sensiveis que nunca seguem para o relay GHL por esta camada. */
const SENSITIVE_KEYS: Record<string, true> = {
  cnpj: true,
  cpf: true,
  password: true,
  token: true,
};

function displayNameOf(lead: LeadRecord): string {
  return (lead.fullName ?? lead.name ?? '').trim();
}

function emailOf(lead: LeadRecord): string {
  return (lead.email ?? lead.corporateEmail ?? '').trim().toLowerCase();
}

/** Valida um registro de lead. Retorna a lista de erros; vazia = valido. */
export function validateLead(stage: LifecycleStage, lead: LeadRecord): string[] {
  const errors: string[] = [];
  if (!displayNameOf(lead)) errors.push('nome_obrigatorio');
  const email = emailOf(lead);
  if (!email) {
    errors.push('email_obrigatorio');
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push('email_invalido');
  }
  if (stage === 'lead' && !(lead.source ?? '').trim()) errors.push('origem_obrigatoria');
  if ((stage === 'diagnostico' || stage === 'resultado' || stage === 'follow_up') && !(lead.diagnosticoId ?? '').trim()) {
    errors.push('diagnosticoId_obrigatorio');
  }
  if (stage === 'resultado' && lead.score !== undefined && (lead.score < 0 || lead.score > 100)) {
    errors.push('score_fora_da_faixa');
  }
  return errors;
}

/**
 * Normaliza e remove dados sensiveis do payload GHL.
 * Email em minusculas, strings com trim, CNPJ/CPF descartados.
 */
export function sanitizeLeadForGHL(lead: LeadRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(lead)) {
    if (SENSITIVE_KEYS[key]) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      out[key] = key === 'email' || key === 'corporateEmail' ? trimmed.toLowerCase() : trimmed;
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Mapeia estagio (+ contexto) para o tipo de evento GHL.
 * Estagios `resultado` e `oportunidade` exigem `diagnosticEvent` do chamador,
 * que e o evento especifico do tipo de diagnostico ja usado pelos forms.
 */
export function stageToGHLEvent(stage: LifecycleStage, options: Pick<StageOptions, 'formKind' | 'diagnosticEvent'> = {}): string {
  switch (stage) {
    case 'lead': {
      const mapped = options.formKind ? EVENT_BY_FORM_KIND[options.formKind] : undefined;
      return mapped ?? 'lead_capture';
    }
    case 'diagnostico':
      return 'score_captured';
    case 'resultado':
    case 'oportunidade': {
      if (!options.diagnosticEvent) throw new Error('diagnosticEvent_obrigatorio_para_resultado_oportunidade');
      return options.diagnosticEvent;
    }
    case 'contato':
      return options.formKind === 'material' ? 'email_material' : 'contact_form';
    case 'follow_up':
      return 'lead_capture';
  }
}

export interface StageSubmitResult {
  eventType: string;
  payload: Record<string, unknown>;
  sent: boolean;
}

/**
 * Submete um estagio do ciclo ao relay GHL.
 * Recusa sem consentimento LGPD ou com lead invalido, antes de qualquer rede.
 * `send` e injetavel: testes passam mock; producao usa `sendToGHL`.
 */
export async function submitLeadLifecycleStage(
  stage: LifecycleStage,
  lead: LeadRecord,
  options: StageOptions,
  send: GHLSender = sendToGHL,
): Promise<StageSubmitResult> {
  if (!options.lgpdConsent) throw new Error('consentimento_lgpd_obrigatorio');
  const errors = validateLead(stage, lead);
  if (errors.length > 0) throw new Error(`lead_invalido:${errors.join(',')}`);
  const eventType = stageToGHLEvent(stage, options);
  const payload = sanitizeLeadForGHL(lead);
  if (stage === 'follow_up' && options.followUpKind) {
    const tags = Array.isArray(payload['tags']) ? [...payload['tags'] as string[]] : [];
    tags.push('follow-up', `follow-up:${options.followUpKind}`);
    payload['tags'] = tags;
  }
  const sent = await send(eventType, payload);
  return { eventType, payload, sent };
}
