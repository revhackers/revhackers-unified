import { describe, expect, it } from 'vitest';
import { parseDiagnosticRequest } from '../input.js';
import { VALID_BODY } from './fixtures.js';

describe('parseDiagnosticRequest', () => {
  it('converte churn percentual em fração mensal e mantém os demais números do CRM', () => {
    const parsed = parseDiagnosticRequest({
      ...VALID_BODY,
      crm: { arpuMonthly: 500, cacEstimated: 1200, churnMonthlyPercent: 3.5, salesCycleDays: 45 },
    });

    expect(parsed).toMatchObject({ ok: true });
    if (!parsed.ok) return;
    expect(parsed.input.crmOrFinancialInputs).toEqual({ arpuMonthly: 500, cacEstimated: 1200, churnMonthlyRate: 0.035, salesCycleDays: 45 });
  });

  it('CRM vazio não gera crmOrFinancialInputs', () => {
    const parsed = parseDiagnosticRequest({ ...VALID_BODY, crm: {} });
    expect(parsed.ok && parsed.input.crmOrFinancialInputs).toBeUndefined();
  });

  it('descarta linhas vazias de concorrentes e campos opcionais vazios', () => {
    const parsed = parseDiagnosticRequest({
      ...VALID_BODY,
      competitors: ['', 'https://growthmachine.com.br', '   '],
      declaredIcp: '',
      cnpj: '',
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input.competitors).toEqual(['https://growthmachine.com.br/']);
    expect(parsed.input).not.toHaveProperty('declaredIcp');
    expect(parsed.input).not.toHaveProperty('cnpj');
  });

  it('normaliza websiteUrl para href e preserva o token', () => {
    const parsed = parseDiagnosticRequest({ ...VALID_BODY, websiteUrl: 'https://acme.com.br' });
    expect(parsed).toMatchObject({ ok: true, turnstileToken: 'token-de-teste' });
    if (parsed.ok) expect(parsed.input.websiteUrl).toBe('https://acme.com.br/');
  });

  it.each([
    ['mais de 3 concorrentes', { competitors: ['https://a.com.br', 'https://b.com.br', 'https://c.com.br', 'https://d.com.br'] }],
    ['CNPJ com 13 dígitos', { cnpj: '1234567800019' }],
    ['fase fora dos 4 valores', { declaredPhase: 'Crescimento' }],
    ['companyName de 1 caractere', { companyName: 'A' }],
    ['churn acima de 100%', { crm: { churnMonthlyPercent: 101 } }],
    ['CRM com número zero', { crm: { arpuMonthly: 0 } }],
    ['declaredIcp acima de 300 caracteres', { declaredIcp: 'x'.repeat(301) }],
  ])('%s é entrada_invalida', (_nome, override) => {
    expect(parseDiagnosticRequest({ ...VALID_BODY, ...override })).toEqual({ ok: false, error: 'entrada_invalida' });
  });

  it('site em host privado é url_invalida', () => {
    expect(parseDiagnosticRequest({ ...VALID_BODY, websiteUrl: 'http://127.0.0.1' })).toEqual({ ok: false, error: 'url_invalida' });
  });

  it('concorrente em host privado é url_invalida', () => {
    expect(parseDiagnosticRequest({ ...VALID_BODY, competitors: ['http://intranet/'] })).toEqual({ ok: false, error: 'url_invalida' });
  });

  it('corpo que não é objeto é entrada_invalida', () => {
    expect(parseDiagnosticRequest(null)).toEqual({ ok: false, error: 'entrada_invalida' });
  });
});
