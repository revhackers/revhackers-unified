import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAllCases, getCaseBySlug, getFeaturedCases } from './cases';
import { casesData } from '@/data/cases';

describe('cases local-first helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns local cases synchronously without any network call', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const all = getAllCases();

    expect(Array.isArray(all)).toBe(true);
    expect(all).toHaveLength(Object.keys(casesData).length);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves a known slug synchronously and returns null for an unknown slug', () => {
    const slug = Object.keys(casesData)[0];

    expect(getCaseBySlug(slug)?.slug).toBe(slug);
    expect(getCaseBySlug('slug-que-nao-existe')).toBeNull();
  });

  it('caps the featured list at six cases', () => {
    const featured = getFeaturedCases();

    expect(featured.length).toBeLessThanOrEqual(6);
    expect(featured.length).toBeGreaterThan(0);
  });
});
