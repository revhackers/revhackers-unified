import { z } from 'zod';
import type { DeclaredPhase, DiagnosticInput } from '../src/stages.js';
import { assertPublicHttpUrl, UrlInvalidaError } from './guards.js';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Tabela exaustiva: se DeclaredPhase ganhar um valor, o tipo deste Record deixa de compilar.
const PHASE_CHECK: Record<DeclaredPhase, true> = {
  'Estruturação Inicial': true,
  'Primeira Tração Validada': true,
  'Escala Estruturada': true,
  'Otimização e Eficiência': true,
};
const DECLARED_PHASES = Object.keys(PHASE_CHECK) as [DeclaredPhase, ...DeclaredPhase[]];

const emptyAsUndefined = (value: unknown): unknown => (typeof value === 'string' && value.trim() === '' ? undefined : value);

const crmNumber = z.number().finite().positive();

const DiagnosticRequest = z.object({
  companyName: z.string().trim().min(2).max(120),
  websiteUrl: z.string().trim().min(1).max(2048),
  declaredPhase: z.enum(DECLARED_PHASES),
  declaredIcp: z.preprocess(emptyAsUndefined, z.string().trim().max(300).optional()),
  // Linhas vazias do formulário de concorrentes são descartadas antes da contagem.
  competitors: z.preprocess(
    (value) => (Array.isArray(value) ? value.filter((item) => typeof item !== 'string' || item.trim() !== '') : value),
    z.array(z.string().trim().min(1).max(2048)).max(3).default([]),
  ),
  cnpj: z.preprocess(emptyAsUndefined, z.string().regex(/^\d{14}$/).optional()),
  crm: z
    .object({
      arpuMonthly: crmNumber.optional(),
      cacEstimated: crmNumber.optional(),
      churnMonthlyPercent: crmNumber.max(100).optional(),
      salesCycleDays: crmNumber.optional(),
    })
    .optional(),
  turnstileToken: z.string().min(1).max(2048),
});

export type DiagnosticRequestBody = z.infer<typeof DiagnosticRequest>;

export type ParsedDiagnosticRequest =
  | { ok: true; input: DiagnosticInput; turnstileToken: string }
  | { ok: false; error: 'entrada_invalida' | 'url_invalida' };

/**
 * Valida o corpo do POST e o converte na entrada do pipeline. Forma inválida vira `entrada_invalida`; URL que não
 * é pública vira `url_invalida`. Churn chega em percentual e segue para o pipeline como fração mensal.
 */
export function parseDiagnosticRequest(raw: unknown): ParsedDiagnosticRequest {
  const parsed = DiagnosticRequest.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'entrada_invalida' };
  const body = parsed.data;

  let websiteUrl: string;
  let competitors: string[];
  try {
    websiteUrl = assertPublicHttpUrl(body.websiteUrl);
    competitors = body.competitors.map(assertPublicHttpUrl);
  } catch (err) {
    if (err instanceof UrlInvalidaError) return { ok: false, error: 'url_invalida' };
    throw err;
  }

  const crm = body.crm;
  const hasCrm = crm !== undefined && Object.keys(crm).length > 0;

  const input: DiagnosticInput = {
    companyName: body.companyName,
    websiteUrl,
    declaredPhase: body.declaredPhase,
    competitors,
    ...(body.declaredIcp !== undefined ? { declaredIcp: body.declaredIcp } : {}),
    ...(body.cnpj !== undefined ? { cnpj: body.cnpj } : {}),
    ...(hasCrm
      ? {
          crmOrFinancialInputs: {
            arpuMonthly: crm.arpuMonthly ?? null,
            cacEstimated: crm.cacEstimated ?? null,
            churnMonthlyRate: crm.churnMonthlyPercent !== undefined ? crm.churnMonthlyPercent / 100 : null,
            salesCycleDays: crm.salesCycleDays ?? null,
          },
        }
      : {}),
  };
  return { ok: true, input, turnstileToken: body.turnstileToken };
}

/** Números do lead vindos do form nativo, nas chaves de `crmOrFinancialInputs`. */
export type LeadNumbers = Partial<
  Record<'arpuMonthly' | 'cacEstimated' | 'churnMonthlyRate' | 'salesCycleDays' | 'leadsPerMonth' | 'winRate' | 'salesTeamSize', number>
>;

/**
 * Número informado no form nativo. Aceita número ou texto pt-BR ("1.500,50", "R$ 4.000", "3,5%"
 * ou tag de template não preenchida, que vira `null`). Só passa finito maior que zero; o resto vira `null`.
 */
export function leadNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (typeof raw !== 'string') return null;
  let text = raw.trim().replace(/R\$/g, '').replace(/%/g, '').replace(/\s+/g, '');
  if (text === '') return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+,\d+$/.test(text)) {
    text = text.replace(',', '.');
  } else if (!/^\d+(\.\d+)?$/.test(text)) {
    return null;
  }
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const GHL_FIELD_MAP = {
  ticket_medio_mensal: 'arpuMonthly',
  cac: 'cacEstimated',
  churn_mensal_percent: 'churnMonthlyRate',
  ciclo_vendas_dias: 'salesCycleDays',
  leads_mes: 'leadsPerMonth',
  taxa_fechamento_percent: 'winRate',
  time_vendas: 'salesTeamSize',
} as const satisfies Record<string, keyof LeadNumbers>;

const PERCENT_FIELDS: ReadonlySet<keyof LeadNumbers> = new Set(['churnMonthlyRate', 'winRate']);

export type ParsedGhlFormWebhook =
  | { ok: true; diagnosticId: string; numbers: LeadNumbers }
  | { ok: false };

/**
 * Corpo do Custom Webhook do workflow do form nativo. `diagnostic_id` tem de ser UUID válido;
 * campos sem número válido ficam de fora de `numbers` sem invalidar o webhook. Percentuais valem
 * até 100 e são gravados como fração.
 */
export function parseGhlFormWebhook(raw: unknown): ParsedGhlFormWebhook {
  if (typeof raw !== 'object' || raw === null) return { ok: false };
  const body = raw as Record<string, unknown>;
  if (typeof body.diagnostic_id !== 'string' || !UUID.test(body.diagnostic_id)) return { ok: false };
  const numbers: LeadNumbers = {};
  for (const [field, key] of Object.entries(GHL_FIELD_MAP)) {
    const value = leadNumber(body[field]);
    if (value === null) continue;
    if (PERCENT_FIELDS.has(key)) {
      if (value > 100) continue;
      numbers[key] = value / 100;
    } else {
      numbers[key] = value;
    }
  }
  return { ok: true, diagnosticId: body.diagnostic_id, numbers };
}
