// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { fetchCnpjData } from '../cnpj.js';

// Formato real da BrasilAPI: a data de abertura vem em `data_inicio_atividade`.
const BRASILAPI_PAYLOAD = {
  cnpj: '12345678000190',
  razao_social: 'ACME SOLUCOES LTDA',
  nome_fantasia: 'Acme',
  data_inicio_atividade: '2013-10-03',
  descricao_situacao_cadastral: 'ATIVA',
  natureza_juridica: '2062 - Sociedade Empresária Limitada',
  porte: 'DEMAIS',
  uf: 'SP',
  cnae_fiscal: 6204000,
  cnae_fiscal_descricao: 'Consultoria em tecnologia da informação',
};

const NOW = new Date('2026-11-16T00:00:00.000Z');

function fetchReturning(body: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe('fetchCnpjData', () => {
  it('calcula a idade a partir de data_inicio_atividade com a data injetada', async () => {
    const result = await fetchCnpjData('12.345.678/0001-90', { fetch: fetchReturning(BRASILAPI_PAYLOAD), now: () => NOW });

    // 2013-10-03 até 2026-11-16 são 4792 dias: 4792 / 365.25 = 13,1 anos.
    expect(result.cnpjAgeYears).toBe(13.1);
    expect(result.companySizeEstimated).toBe('DEMAIS');
    expect(result.estimatedAddressState).toBe('SP');
    expect(result.gap).toBeNull();
  });

  it('registra os campos cadastrais e a origem no conteúdo da evidência CNPJ1', async () => {
    const result = await fetchCnpjData('12345678000190', {
      fetch: fetchReturning(BRASILAPI_PAYLOAD),
      now: () => NOW,
      origem: 'detectado no site',
    });

    expect(result.evidence?.id).toBe('CNPJ1');
    expect(result.evidence?.kind).toBe('cnpj');
    expect(result.evidence?.fetchedAt).toBe(NOW.toISOString());
    const content = JSON.parse(result.evidence?.content ?? '{}') as Record<string, unknown>;
    expect(content).toMatchObject({
      cnpj: '12345678000190',
      dataInicioAtividade: '2013-10-03',
      porte: 'DEMAIS',
      uf: 'SP',
      cnaeFiscal: 'Consultoria em tecnologia da informação',
      situacao: 'ATIVA',
      naturezaJuridica: '2062 - Sociedade Empresária Limitada',
      origem: 'detectado no site',
    });
  });

  it('devolve gap com o status HTTP quando a consulta falha', async () => {
    const result = await fetchCnpjData('12345678000190', { fetch: fetchReturning({}, 503), now: () => NOW });

    expect(result.evidence).toBeNull();
    expect(result.cnpjAgeYears).toBeNull();
    expect(result.gap).toBe('CNPJ não consultado: HTTP 503');
  });

  it('devolve gap com a mensagem quando a rede falha', async () => {
    const failing = (async () => {
      throw new Error('ENOTFOUND brasilapi.com.br');
    }) as unknown as typeof fetch;
    const result = await fetchCnpjData('12345678000190', { fetch: failing, now: () => NOW });

    expect(result.evidence).toBeNull();
    expect(result.gap).toBe('CNPJ não consultado: ENOTFOUND brasilapi.com.br');
  });

  it('não consulta e não registra gap quando o lead não informou CNPJ', async () => {
    const result = await fetchCnpjData(undefined, { fetch: fetchReturning(BRASILAPI_PAYLOAD) });

    expect(result).toEqual({ cnpjAgeYears: null, companySizeEstimated: null, estimatedAddressState: null, evidence: null, gap: null });
  });

  it('registra gap de formato quando o CNPJ informado não tem 14 dígitos', async () => {
    const result = await fetchCnpjData('1234', { fetch: fetchReturning(BRASILAPI_PAYLOAD) });

    expect(result.evidence).toBeNull();
    expect(result.gap).toBe('CNPJ não consultado: formato inválido (14 dígitos esperados)');
  });
});
