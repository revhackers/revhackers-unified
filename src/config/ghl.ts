/**
 * src/config/ghl.ts
 *
 * GHL (GoHighLevel) integration configuration for RevHackers.
 * Form IDs and calendar IDs are created in Fase 1 of the native-forms migration.
 *
 * Location: S7HEFAz97UKuC8NLHMmI (FUNNELS/Inbound)
 * Embed endpoint: https://api.leadconnectorhq.com
 *
 * To update: complete Fase 1 in the plan, then copy form IDs from GHL → Sites → Forms → Integrate.
 */

export const GHL_EMBED_BASE = 'https://api.leadconnectorhq.com';
export const GHL_FORM_EMBED_SCRIPT = `${GHL_EMBED_BASE}/js/form_embed.js`;

/**
 * Form IDs from S7HE location.
 * Each form submits to GHL via postMessage and triggers workflows.
 *
 * Get IDs from: GHL app → location S7HEFAz97UKuC8NLHMmI → Sites → Forms → [form name] → Integrate tab → form_id
 */
export const GHL_FORMS = {
  /** RH · Materiais Ricos — form for downloading rich materials (PDF, Notion links, etc.) */
  materiais: 'FORM_ID_PLACEHOLDER_MATERIAIS',
  
  /** RH · Diagnóstico — form for self-diagnostic (Growth/Revenue/Site/Founder Score) */
  diagnostico: 'FORM_ID_PLACEHOLDER_DIAGNOSTICO',
  
  /** RH · Contato — form for general contact and inquiries */
  contato: 'FORM_ID_PLACEHOLDER_CONTATO',
  
  /** RH · Newsletter — form for newsletter subscription */
  newsletter: 'FORM_ID_PLACEHOLDER_NEWSLETTER',
  
  /** RH · Score — hidden form for capturing diagnostic results (trigger: only after score calculation) */
  score: 'FORM_ID_PLACEHOLDER_SCORE',
  
  /** RH · Calculadora — hidden form for capturing calculator results (LTV/ROAS gate) */
  calculadora: 'FORM_ID_PLACEHOLDER_CALCULADORA',
} as const;

/**
 * Calendar IDs from S7HE location.
 * Used for booking widgets embedded via iframe.
 *
 * Get ID from: GHL app → location S7HEFAz97UKuC8NLHMmI → Calendars → [calendar name] → copy the ID from the URL or iframe embed code
 */
export const GHL_CALENDARS = {
  /** Diagnóstico RevHackers · 45 min — calendar for booking diagnostic calls with Giulliano */
  diagnostico: '0qBL8YhEucu58qzNgdpe', // Diagnóstico RevHackers · 45 min (confirmar em S7HE, plano 1.6)
} as const;

/**
 * Custom field keys in S7HE.
 * These are the exact keys created in Fase 1.1 Custom Fields.
 * Used when pre-filling forms via query string or JS manipulation.
 */
export const GHL_CUSTOM_FIELD_KEYS = {
  origem: 'origem',
  funil: 'funil',
  material_slug: 'material_slug',
  material_title: 'material_title',
  material_link: 'material_link',
  cargo: 'cargo',
  setor: 'setor',
  consentimento_lgpd: 'consentimento_lgpd',
  diagnostic_type: 'diagnostic_type',
  diagnostic_score: 'diagnostic_score',
  diagnostic_category: 'diagnostic_category',
  calculadora: 'calculadora',
  calculadora_resultado: 'calculadora_resultado',
  utm_source: 'utm_source',
  utm_medium: 'utm_medium',
  utm_campaign: 'utm_campaign',
  utm_term: 'utm_term',
  utm_content: 'utm_content',
  linkedin: 'linkedin',
  crm_atual: 'crm_atual',
  tamanho_do_time: 'tamanho_do_time',
  principal_dor: 'principal_dor',
  email_pessoal: 'email_pessoal',
} as const;
