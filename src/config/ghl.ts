/**
 * src/config/ghl.ts
 *
 * GHL (GoHighLevel) integration configuration for RevHackers.
 * Form IDs and calendar IDs created in S7HE (FUNNELS/Inbound location).
 *
 * Location: S7HEFAz97UKuC8NLHMmI
 * Embed endpoint: https://api.leadconnectorhq.com
 */

export const GHL_EMBED_BASE = 'https://api.leadconnectorhq.com';
export const GHL_FORM_EMBED_SCRIPT = `${GHL_EMBED_BASE}/js/form_embed.js`;

/**
 * Form IDs from S7HE location.
 */
export const GHL_FORMS = {
  /** RH · Materiais Ricos — form for downloading rich materials */
  materiais: 'mJMtcwBd46xpqm9c2ABu',
  
  /** RH · Diagnóstico — form for self-diagnostic */
  diagnostico: '6K64dkab3k4kuedDiFaC',
  
  /** RH · Contato — form for general contact */
  contato: 'iNOZntXTFX9wJPeu53YM',
  
  /** RH · Newsletter — form for newsletter subscription */
  newsletter: 't6SRbbh2FcjBtam3B5Gj',
  
  /** RH · Score — hidden form for capturing diagnostic results */
  score: '6BrluXzMJOPOIGOvgYzV',
  
  /** RH · Calculadora — hidden form for capturing calculator results */
  calculadora: 'JJEKvTdL9Sm6JFdirbb0',
} as const;

/**
 * Survey IDs from S7HE location.
 */
export const GHL_SURVEYS = {
  nps: 'WzzR3u7WJoAN8GwfW2T0',
} as const;

/**
 * Calendar IDs from S7HE location.
 */
export const GHL_CALENDARS = {
  /** Diagnóstico RevHackers · 45 min */
  diagnostico: '0qBL8YhEucu58qzNgdpe',
} as const;

/**
 * Pipeline ID and stages for RevHackers Inbound.
 */
export const GHL_PIPELINE = {
  id: 'h5QPYbZlkVBgWhKc8O8C',
  stages: {
    leadMaterial: '42147a93-9c3e-44da-a49c-c1a89b77dac0',
    leadDiagnostico: 'f8aa35ad-0384-422f-985f-c3bf9a383cbc',
    contato: '098b95d9-e445-49d2-b603-72c1160c18ec',
    reuniao: 'c8039377-c6a1-4b60-9c49-eed4f77d3dc3',
    perdido: 'aef79da5-7ee5-441a-866a-f543467ddedd',
  },
} as const;

/**
 * Custom field keys in S7HE with correct namespace rules:
 * - Generic fields shared with FUNNELS: without prefix.
 * - Specific RevHackers fields: with rh_ prefix.
 */
export const GHL_CUSTOM_FIELD_KEYS = {
  origem: 'origem',
  funil: 'funil',
  rh_material_slug: 'rh_material_slug',
  rh_material_title: 'rh_material_title',
  rh_material_link: 'rh_material_link',
  cargo: 'cargo',
  setor: 'setor',
  rh_consentimento_lgpd: 'rh_consentimento_lgpd',
  rh_diagnostic_type: 'rh_diagnostic_type',
  rh_diagnostic_score: 'rh_diagnostic_score',
  rh_diagnostic_category: 'rh_diagnostic_category',
  rh_calculadora: 'rh_calculadora',
  rh_calculadora_resultado: 'rh_calculadora_resultado',
  utm_source: 'utm_source',
  utm_medium: 'utm_medium',
  utm_campaign: 'utm_campaign',
  utm_term: 'utm_term',
  utm_content: 'utm_content',
  linkedin: 'linkedin',
  crm_atual: 'crm_atual',
  tamanho_do_time: 'tamanho_do_time',
  principal_dor: 'principal_dor',
} as const;
