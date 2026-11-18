import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  throw new Error('cases nao pode importar o cliente Supabase');
});

import { getAllCases, getCaseBySlug, getFeaturedCases } from './cases';
import { casesData } from '@/data/cases';

describe('cases lidos só dos dados locais', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devolve os cases locais de forma síncrona, sem nenhuma chamada de rede', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const all = getAllCases();

    expect(Array.isArray(all)).toBe(true);
    expect(all).toHaveLength(Object.keys(casesData).length);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolve um slug conhecido de forma síncrona e devolve null para slug desconhecido', () => {
    const slug = Object.keys(casesData)[0];

    expect(getCaseBySlug(slug)?.slug).toBe(slug);
    expect(getCaseBySlug('slug-que-nao-existe')).toBeNull();
  });

  it('aplica o logo oficial do cliente sobre o dado local', () => {
    expect(getCaseBySlug('lindoya')?.client_logo).toBe('/uploads/lindoya-logo.png');
  });

  it('limita os destaques a seis cases, na ordem dos dados locais', () => {
    const featured = getFeaturedCases();

    expect(featured).toHaveLength(6);
    expect(featured.map((c) => c.slug)).toEqual(Object.keys(casesData).slice(0, 6));
  });
});
