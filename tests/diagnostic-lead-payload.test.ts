import { describe, expect, test, vi } from 'vitest';
import {
  buildGrowthLead,
  buildLinkedinLead,
  validateDiagnosticPayload,
} from '@/lib/diagnosticLeadPayload';

describe('diagnosticLeadPayload (mock, sem rede)', () => {
  test('growth valido passa no contrato e mapeia score_captured', () => {
    const lead = buildGrowthLead(
      { name: 'Maria Silva', email: 'maria@empresa.com.br', company: 'Empresa SA' },
      72,
      'Tração inicial',
    );
    const check = validateDiagnosticPayload('resultado', lead, 'score_captured');
    expect(check.errors).toEqual([]);
    expect(check.eventType).toBe('score_captured');
    expect(check.payload['email']).toBe('maria@empresa.com.br');
    expect(check.payload['source']).toBe('growth-diagnostic');
  });

  test('linkedin valido passa no contrato com fonte diagnostico_linkedin', () => {
    const lead = buildLinkedinLead('João', 'joao@empresa.com.br', 'Empresa SA');
    expect(lead.source).toBe('diagnostico_linkedin');
    const check = validateDiagnosticPayload('diagnostico', lead);
    expect(check.errors).toEqual([]);
    expect(check.eventType).toBe('score_captured');
  });

  test('payload invalido retorna erros sem lancar', () => {
    const check = validateDiagnosticPayload('resultado', { email: 'ruim' });
    expect(check.errors).toEqual(
      expect.arrayContaining(['nome_obrigatorio', 'email_invalido', 'diagnosticoId_obrigatorio']),
    );
  });

  test('resultado sem diagnosticEvent nao lanca: retorna evento_nao_mapeado', () => {
    const lead = buildGrowthLead({ name: 'A', email: 'a@b.co', company: 'C' }, 50, 'X');
    expect(() => validateDiagnosticPayload('resultado', lead)).not.toThrow();
    expect(validateDiagnosticPayload('resultado', lead).errors).toContain('evento_nao_mapeado');
  });

  test('score fora da faixa e barrado', () => {
    const lead = { ...buildGrowthLead({ name: 'A', email: 'a@b.co', company: 'C' }, 150, 'X') };
    const check = validateDiagnosticPayload('resultado', lead, 'score_captured');
    expect(check.errors).toContain('score_fora_da_faixa');
  });

  test('nenhum fetch acontece na validacao mock', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    try {
      validateDiagnosticPayload('diagnostico', buildLinkedinLead('J', 'j@e.co', ''));
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
