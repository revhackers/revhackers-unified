/**
 * diagnosticLeadPayload.ts
 *
 * Liga os diagnósticos (Growth, LinkedIn) aos contratos de #4
 * (`ghlLeadAdapter`) em MODO MOCK: monta e valida o payload do ciclo
 * (validateLead + sanitize + mapeamento de evento), SEM rede.
 *
 * O fluxo real de envio NÃO muda: Growth continua via `submitPublicDiagnostic`
 * (relay real) e LinkedIn continua sem enviar nada (lead fica no navegador).
 * Esta camada só prova, em tempo de execução e em testes, que o payload que
 * *seria* enviado passa nos contratos — facilitando a ativação real futura.
 */
import {
  sanitizeLeadForGHL,
  stageToGHLEvent,
  validateLead,
  type LeadRecord,
  type LifecycleStage,
} from './ghlLeadAdapter';

export interface DiagnosticContractCheck {
  eventType: string;
  payload: Record<string, unknown>;
  errors: string[];
}

/**
 * Valida um payload de diagnóstico contra os contratos. Função pura:
 * nunca faz fetch, nunca lança — retorna os erros para log/teste.
 */
export function validateDiagnosticPayload(
  stage: LifecycleStage,
  lead: LeadRecord,
  diagnosticEvent?: string,
): DiagnosticContractCheck {
  const errors = validateLead(stage, lead);
  if (errors.length > 0) return { eventType: '', payload: {}, errors };
  return {
    eventType: stageToGHLEvent(stage, diagnosticEvent ? { diagnosticEvent } : {}),
    payload: sanitizeLeadForGHL(lead),
    errors,
  };
}

/** Monta o LeadRecord do Growth a partir do form + score calculado. */
export function buildGrowthLead(
  data: { name: string; email: string; company: string },
  score: number,
  maturityLevel: string,
): LeadRecord {
  return {
    fullName: data.name,
    email: data.email,
    company: data.company,
    source: 'growth-diagnostic',
    diagnosticoId: 'growth-diagnostic',
    diagnostic_type: 'growth',
    score,
    maturity_level: maturityLevel,
  };
}

/** Monta o LeadRecord do LinkedIn a partir dos campos do gate. */
export function buildLinkedinLead(nome: string, email: string, empresa: string): LeadRecord {
  return {
    fullName: nome,
    email,
    company: empresa || undefined,
    source: 'diagnostico_linkedin',
    diagnosticoId: 'linkedin-diagnostic',
    diagnostic_type: 'linkedin',
  };
}
