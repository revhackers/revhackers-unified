import type { Evidence } from '../prompts/evidence.js';

export interface CnpjComputedResult {
  cnpjAgeYears: number | null;
  companySizeEstimated: string | null;
  estimatedAddressState: string | null;
  evidence: Evidence | null;
}

export async function fetchCnpjData(cnpjInput?: string): Promise<CnpjComputedResult> {
  if (!cnpjInput) {
    return {
      cnpjAgeYears: null,
      companySizeEstimated: null,
      estimatedAddressState: null,
      evidence: null,
    };
  }

  const cleanCnpj = cnpjInput.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) {
    return {
      cnpjAgeYears: null,
      companySizeEstimated: null,
      estimatedAddressState: null,
      evidence: null,
    };
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      headers: {
        'User-Agent': 'RevHackersGTMBlueprint/1.0 (contact@revhackers.com.br)',
      },
    });

    if (!res.ok) {
      return {
        cnpjAgeYears: null,
        companySizeEstimated: null,
        estimatedAddressState: null,
        evidence: null,
      };
    }

    const data = (await res.json()) as any;
    
    let ageYears: number | null = null;
    if (data.abertura) {
      const openDate = new Date(data.abertura);
      const currentDate = new Date('2026-11-13');
      const diffTime = currentDate.getTime() - openDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      ageYears = Math.max(0, Math.round((diffDays / 365.25) * 10) / 10);
    }

    const porte = data.porte || data.descricao_porte || null;
    const uf = data.uf || data.endereco?.uf || null;
    const razaoSocial = data.razao_social || '';
    const nomeFantasia = data.nome_fantasia || razaoSocial;
    const cnaeDesc = data.cnae_fiscal_descricao || data.cnae_fiscal || '';

    const content = JSON.stringify({
      cnpj: cleanCnpj,
      razaoSocial,
      nomeFantasia,
      abertura: data.abertura,
      porte,
      uf,
      cnaeFiscal: cnaeDesc,
      situacao: data.descricao_situacao_cadastral || data.situacao_cadastral,
    }, null, 2);

    const sourceUrl = `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`;
    const evidence: Evidence = {
      id: 'CNPJ1',
      kind: 'cnpj',
      source: sourceUrl,
      fetchedAt: new Date().toISOString(),
      content,
    };

    return {
      cnpjAgeYears: ageYears,
      companySizeEstimated: porte,
      estimatedAddressState: uf,
      evidence,
    };
  } catch (err) {
    return {
      cnpjAgeYears: null,
      companySizeEstimated: null,
      estimatedAddressState: null,
      evidence: null,
    };
  }
}
