import { describe, expect, test, vi } from 'vitest';
import {
  sanitizeLeadForGHL,
  stageToGHLEvent,
  submitLeadLifecycleStage,
  validateLead,
  type GHLSender,
  type LeadRecord,
} from '@/lib/ghlLeadAdapter';

const LEAD_BASE: LeadRecord = {
  fullName: '  Maria Silva  ',
  email: 'MARIA@Exemplo.COM',
  company: 'Exemplo SA',
  source: 'site',
};

function mockSender(result = true): GHLSender & { calls: Array<{ eventType: string; payload: Record<string, unknown> }> } {
  const calls: Array<{ eventType: string; payload: Record<string, unknown> }> = [];
  const send = (async (eventType: string, payload: Record<string, unknown>) => {
    calls.push({ eventType, payload });
    return result;
  }) as GHLSender & { calls: typeof calls };
  send.calls = calls;
  return send;
}

describe('validateLead', () => {
  test('lead valido nao retorna erros', () => {
    expect(validateLead('lead', LEAD_BASE)).toEqual([]);
  });

  test('aponta nome, email e origem ausentes', () => {
    expect(validateLead('lead', {})).toEqual(
      expect.arrayContaining(['nome_obrigatorio', 'email_obrigatorio', 'origem_obrigatoria']),
    );
  });

  test('rejeita email malformado', () => {
    expect(validateLead('lead', { ...LEAD_BASE, email: 'sem-arroba' })).toContain('email_invalido');
  });

  test('diagnostico e resultado exigem diagnosticoId', () => {
    expect(validateLead('diagnostico', LEAD_BASE)).toContain('diagnosticoId_obrigatorio');
    expect(validateLead('resultado', LEAD_BASE)).toContain('diagnosticoId_obrigatorio');
    expect(validateLead('lead', LEAD_BASE)).not.toContain('diagnosticoId_obrigatorio');
  });

  test('score fora de 0 a 100 e invalido', () => {
    expect(
      validateLead('resultado', { ...LEAD_BASE, diagnosticoId: 'diag_1', score: 101 }),
    ).toContain('score_fora_da_faixa');
  });
});

describe('sanitizeLeadForGHL', () => {
  test('normaliza email, faz trim e descarta cnpj e cpf', () => {
    const out = sanitizeLeadForGHL({
      ...LEAD_BASE,
      cnpj: '12.345.678/0001-99',
      cpf: '123.456.789-00',
    } as LeadRecord & { cnpj: string; cpf: string });
    expect(out['email']).toBe('maria@exemplo.com');
    expect(out['fullName']).toBe('Maria Silva');
    expect(out).not.toHaveProperty('cnpj');
    expect(out).not.toHaveProperty('cpf');
  });
});

describe('stageToGHLEvent', () => {
  test('lead varia por formKind', () => {
    expect(stageToGHLEvent('lead', { formKind: 'newsletter' })).toBe('newsletter');
    expect(stageToGHLEvent('lead', { formKind: 'material' })).toBe('download');
    expect(stageToGHLEvent('lead', { formKind: 'calculator' })).toBe('roi_calculator');
    expect(stageToGHLEvent('lead', { formKind: 'rei' })).toBe('rei_completed');
    expect(stageToGHLEvent('lead', {})).toBe('lead_capture');
  });

  test('diagnostico usa score_captured; contato material usa email_material', () => {
    expect(stageToGHLEvent('diagnostico')).toBe('score_captured');
    expect(stageToGHLEvent('contato', { formKind: 'material' })).toBe('email_material');
    expect(stageToGHLEvent('contato', { formKind: 'contact' })).toBe('contact_form');
    expect(stageToGHLEvent('follow_up')).toBe('lead_capture');
  });

  test('resultado e oportunidade exigem diagnosticEvent do chamador', () => {
    expect(() => stageToGHLEvent('resultado')).toThrow('diagnosticEvent_obrigatorio_para_resultado_oportunidade');
    expect(stageToGHLEvent('resultado', { diagnosticEvent: 'rei_completed' })).toBe('rei_completed');
  });
});

describe('submitLeadLifecycleStage', () => {
  test('envia lead via sender mockado sem tocar na rede', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const send = mockSender();
      const result = await submitLeadLifecycleStage('lead', LEAD_BASE, { lgpdConsent: true, formKind: 'newsletter' }, send);
      expect(result.eventType).toBe('newsletter');
      expect(result.sent).toBe(true);
      expect(send.calls).toHaveLength(1);
      expect(send.calls[0]?.payload['email']).toBe('maria@exemplo.com');
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test('recusa sem consentimento LGPD antes de qualquer envio', async () => {
    const send = mockSender();
    await expect(
      submitLeadLifecycleStage('lead', LEAD_BASE, { lgpdConsent: false }, send),
    ).rejects.toThrow('consentimento_lgpd_obrigatorio');
    expect(send.calls).toHaveLength(0);
  });

  test('recusa lead invalido antes de qualquer envio', async () => {
    const send = mockSender();
    await expect(
      submitLeadLifecycleStage('lead', {}, { lgpdConsent: true }, send),
    ).rejects.toThrow('lead_invalido');
    expect(send.calls).toHaveLength(0);
  });

  test('follow-up adiciona tags sem recapturar dados', async () => {
    const send = mockSender();
    const result = await submitLeadLifecycleStage(
      'follow_up',
      { ...LEAD_BASE, diagnosticoId: 'diag_9' },
      { lgpdConsent: true, followUpKind: 'no_response' },
      send,
    );
    expect(result.eventType).toBe('lead_capture');
    expect(result.payload['tags']).toEqual(expect.arrayContaining(['follow-up', 'follow-up:no_response']));
  });

  test('propaga falha do sender sem mascarar', async () => {
    const failing: GHLSender = async () => { throw new Error('rede indisponivel'); };
    await expect(
      submitLeadLifecycleStage('lead', LEAD_BASE, { lgpdConsent: true }, failing),
    ).rejects.toThrow('rede indisponivel');
  });
});
