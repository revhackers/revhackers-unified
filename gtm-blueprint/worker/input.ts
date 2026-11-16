import { z } from 'zod';
import type { DeclaredPhase, DiagnosticInput } from '../src/stages.js';
import { assertPublicHttpUrl, UrlInvalidaError } from './guards.js';

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
