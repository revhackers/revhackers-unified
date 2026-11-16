import type { Evidence } from '../prompts/evidence.js';

export type CnpjOrigin = 'informado pelo lead' | 'detectado no site';

export interface CnpjComputedResult {
  cnpjAgeYears: number | null;
  companySizeEstimated: string | null;
  estimatedAddressState: string | null;
  evidence: Evidence | null;
  /** Motivo de a consulta não gerar evidência. Null quando não há CNPJ ou a consulta deu certo. */
  gap: string | null;
}

export interface CnpjFetchOptions {
  fetch?: typeof fetch;
  now?: () => Date;
  origem?: CnpjOrigin;
}

/** Campos da BrasilAPI usados aqui, com os nomes que a API devolve. */
interface BrasilApiCnpj {
  data_inicio_atividade?: string | null;
  porte?: string | null;
  descricao_porte?: string | null;
  uf?: string | null;
  endereco?: { uf?: string | null } | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnae_fiscal?: string | number | null;
  cnae_fiscal_descricao?: string | null;
  natureza_juridica?: string | null;
  situacao_cadastral?: string | number | null;
  descricao_situacao_cadastral?: string | null;
}

const TIMEOUT_MS = 8000;

function notConsulted(gap: string | null): CnpjComputedResult {
  return { cnpjAgeYears: null, companySizeEstimated: null, estimatedAddressState: null, evidence: null, gap };
}

function ageInYears(openDate: string | null | undefined, now: Date): number | null {
  if (!openDate) return null;
  const opened = new Date(openDate).getTime();
  if (Number.isNaN(opened)) return null;
  const days = (now.getTime() - opened) / (1000 * 3600 * 24);
  return Math.max(0, Math.round((days / 365.25) * 10) / 10);
}

export async function fetchCnpjData(cnpjInput?: string, opts: CnpjFetchOptions = {}): Promise<CnpjComputedResult> {
  if (!cnpjInput) return notConsulted(null);

  const cleanCnpj = cnpjInput.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) return notConsulted('CNPJ não consultado: formato inválido (14 dígitos esperados)');

  const sourceUrl = `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`;
  const fetchImpl = opts.fetch ?? fetch;
  const now = opts.now?.() ?? new Date();

  try {
    const res = await fetchImpl(sourceUrl, {
      headers: { 'User-Agent': 'RevHackersGTMBlueprint/1.0 (contact@revhackers.com.br)' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return notConsulted(`CNPJ não consultado: HTTP ${res.status}`);

    const data = (await res.json()) as BrasilApiCnpj;
    const porte = data.porte || data.descricao_porte || null;
    const uf = data.uf || data.endereco?.uf || null;
    const razaoSocial = data.razao_social || '';
    const content = JSON.stringify({
      cnpj: cleanCnpj,
      razaoSocial,
      nomeFantasia: data.nome_fantasia || razaoSocial,
      dataInicioAtividade: data.data_inicio_atividade ?? null,
      porte,
      uf,
      cnaeFiscal: data.cnae_fiscal_descricao || (data.cnae_fiscal != null ? String(data.cnae_fiscal) : null),
      situacao: data.descricao_situacao_cadastral || data.situacao_cadastral || null,
      naturezaJuridica: data.natureza_juridica ?? null,
      origem: opts.origem ?? 'informado pelo lead',
    }, null, 2);

    return {
      cnpjAgeYears: ageInYears(data.data_inicio_atividade, now),
      companySizeEstimated: porte,
      estimatedAddressState: uf,
      evidence: {
        id: 'CNPJ1',
        kind: 'cnpj',
        source: sourceUrl,
        fetchedAt: now.toISOString(),
        content,
      },
      gap: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return notConsulted(`CNPJ não consultado: ${msg}`);
  }
}
