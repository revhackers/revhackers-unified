import { describe, it, expect } from 'vitest';
import { EditorialAdapter, normalizeApiPost, ArtigoEditorialSchema } from './editorialAdapter';
import { blogPosts } from '@/data/blogData';

describe('EditorialAdapter & ArtigoEditorial Contract - Strict Invariants B1A.3 (Main feedback)', () => {

  it('1. should ignore self-labeled sourceProvenance in raw payload and respect explicit caller parameter (defaulting to unknown)', () => {
    const rawSelfLabelled = {
      id: 'self-1',
      slug: 'self-slug',
      title: 'Self Labelled',
      category: 'RevOps',
      published: true,
      sourceProvenance: 'supabase', // self-claimed
      author: { name: 'A', role: 'R', avatar: '/a.png' }
    };

    // Without explicit caller provenance, defaults to 'unknown'
    const normalizedDefault = normalizeApiPost(rawSelfLabelled);
    expect(normalizedDefault.sourceProvenance).toBe('unknown');

    // With explicit caller provenance 'supabase'
    const normalizedExplicit = normalizeApiPost(rawSelfLabelled, 'supabase');
    expect(normalizedExplicit.sourceProvenance).toBe('supabase');

    // Via EditorialAdapter getAllNormalizedPosts without provenance option, defaults to 'unknown'
    const posts = EditorialAdapter.getAllNormalizedPosts([rawSelfLabelled]);
    const found = posts.find(p => p.slug === 'self-slug');
    expect(found?.sourceProvenance).toBe('unknown');
  });

  it('2. should allow canonical URLs ONLY from LANDING_PAGE origin and reject APP, PAGES or spoofed domains', () => {
    const validCanonical = 'https://revhackers.com.br/blog/valid-slug';
    const appCanonical = 'https://app.revhackers.com.br/blog/valid-slug';
    const pagesCanonical = 'https://pages.revhackers.com.br/blog/valid-slug';
    const spoofCanonical = 'https://revhackers.com.br.evil.com/blog/valid-slug';

    const basePayload = {
      id: 1,
      slug: 'valid-slug',
      title: 'Test',
      category: 'Geral',
      author: { name: 'A', role: 'R', avatar: '/a.png' },
      published: true,
      editorialApprovalStatus: 'LEGACY_UNVERIFIED' as const,
      claimsVerified: false as const,
      sourceProvenance: 'supabase' as const
    };

    expect(ArtigoEditorialSchema.safeParse({ ...basePayload, canonicalUrl: validCanonical }).success).toBe(true);
    expect(ArtigoEditorialSchema.safeParse({ ...basePayload, canonicalUrl: appCanonical }).success).toBe(false);
    expect(ArtigoEditorialSchema.safeParse({ ...basePayload, canonicalUrl: pagesCanonical }).success).toBe(false);
    expect(ArtigoEditorialSchema.safeParse({ ...basePayload, canonicalUrl: spoofCanonical }).success).toBe(false);
  });

  it('3. should reject empty string ID or empty string publication dates', () => {
    const basePayload = {
      slug: 'valid-slug',
      title: 'Test',
      category: 'Geral',
      author: { name: 'A', role: 'R', avatar: '/a.png' },
      published: true,
      editorialApprovalStatus: 'LEGACY_UNVERIFIED' as const,
      claimsVerified: false as const,
      sourceProvenance: 'supabase' as const
    };

    // Empty string ID rejected
    expect(ArtigoEditorialSchema.safeParse({ ...basePayload, id: '' }).success).toBe(false);

    // Empty string publicationDate rejected
    expect(ArtigoEditorialSchema.safeParse({ ...basePayload, id: 1, publicationDate: '' }).success).toBe(false);

    // Invalid publicationDate rejected
    expect(ArtigoEditorialSchema.safeParse({ ...basePayload, id: 1, publicationDate: 'not-a-date' }).success).toBe(false);

    // Valid publicationDate accepted
    expect(ArtigoEditorialSchema.safeParse({ ...basePayload, id: 1, publicationDate: '2026-11-12' }).success).toBe(true);
  });

  it('4. should keep external canonicalUrl undefined when absent (do not synthesize)', () => {
    const rawNoCanonical = {
      id: 'ext-1',
      slug: 'ext-slug',
      title: 'External Post',
      category: 'RevOps',
      published: true,
      author: { name: 'A', role: 'R', avatar: '/a.png' }
      // no canonicalUrl
    };

    const normalized = normalizeApiPost(rawNoCanonical);
    expect(normalized.canonicalUrl).toBeUndefined();
  });

  it('5. should ensure draft collisions never hide published static posts and detail delegates to getAllNormalizedPosts', () => {
    const staticSample = blogPosts[0];
    const draftCollidingApi = {
      id: 'draft-colliding',
      slug: staticSample.slug,
      title: 'Draft Colliding Title',
      category: staticSample.category,
      published: false,
      author: { name: 'A', role: 'R', avatar: '/a.png' }
    };

    const posts = EditorialAdapter.getAllNormalizedPosts([draftCollidingApi]);
    const matched = posts.filter(p => p.slug === staticSample.slug);
    expect(matched.length).toBe(1);
    expect(matched[0].title).not.toBe('Draft Colliding Title');

    const detail = EditorialAdapter.getPostBySlug(staticSample.slug, [draftCollidingApi]);
    expect(detail).toBeDefined();
    expect(detail?.title).not.toBe('Draft Colliding Title');
  });

  // --- Mandatory Negative & Invariant Tests (Main feedback) ---

  it('6. should normalize arbitrary approvalHash, empty SHA hash, and nested approvalSignature + claims true to unverified and false', () => {
    const rawVariants = [
      { id: 'v1', slug: 'v1-slug', title: 'T', category: 'C', published: true, editorialApprovalStatus: 'APPROVED', approvalHash: 'arbitrary-hash', claimsVerified: true, author: { name: 'A', role: 'R', avatar: '/a.png' } },
      { id: 'v2', slug: 'v2-slug', title: 'T', category: 'C', published: true, editorialApprovalStatus: 'APPROVED', approvalHash: '', claimsVerified: true, author: { name: 'A', role: 'R', avatar: '/a.png' } },
      { id: 'v3', slug: 'v3-slug', title: 'T', category: 'C', published: true, editorialApprovalStatus: 'APPROVED', approvalSignature: { approvalHash: 'nested-hash', approvedBy: 'User' }, claimsVerified: true, author: { name: 'A', role: 'R', avatar: '/a.png' } }
    ];

    rawVariants.forEach(raw => {
      const normalized = normalizeApiPost(raw);
      expect(normalized.editorialApprovalStatus).not.toBe('APPROVED');
      expect(normalized.editorialApprovalStatus).toBe('LEGACY_UNVERIFIED');
      expect(normalized.claimsVerified).toBe(false);
    });
  });

  it('7. should reject APPROVED status and claimsVerified: true at schema level', () => {
    const payloadApproved = {
      id: 'sch-1',
      slug: 'valid-slug',
      title: 'T',
      category: 'C',
      published: true,
      editorialApprovalStatus: 'APPROVED',
      claimsVerified: false,
      author: { name: 'A', role: 'R', avatar: '/a.png' },
      sourceProvenance: 'supabase'
    };
    expect(ArtigoEditorialSchema.safeParse(payloadApproved).success).toBe(false);

    const payloadClaims = {
      id: 'sch-2',
      slug: 'valid-slug',
      title: 'T',
      category: 'C',
      published: true,
      editorialApprovalStatus: 'LEGACY_UNVERIFIED',
      claimsVerified: true,
      author: { name: 'A', role: 'R', avatar: '/a.png' },
      sourceProvenance: 'supabase'
    };
    expect(ArtigoEditorialSchema.safeParse(payloadClaims).success).toBe(false);
  });

  it('8. should exclude TEST status with published true from list and detail even with includeTestFixtures: true', () => {
    const rawTestPublished = {
      id: 'test-pub-1',
      slug: 'test-pub-slug',
      title: 'Test Published',
      category: 'C',
      published: true,
      editorialApprovalStatus: 'TEST',
      author: { name: 'A', role: 'R', avatar: '/a.png' }
    };

    const list = EditorialAdapter.getAllNormalizedPosts([rawTestPublished], { includeTestFixtures: true });
    expect(list.some(p => p.slug === 'test-pub-slug')).toBe(false);

    const detail = EditorialAdapter.getPostBySlug('test-pub-slug', [rawTestPublished], { includeTestFixtures: true });
    expect(detail).toBeNull();
  });

  it('9. should exclude missing or false published posts', () => {
    const rawMissingPub = { id: 'm-1', slug: 'missing-pub-slug', title: 'T', category: 'C', author: { name: 'A', role: 'R', avatar: '/a.png' } };
    const rawFalsePub = { id: 'f-1', slug: 'false-pub-slug', title: 'T', category: 'C', published: false, author: { name: 'A', role: 'R', avatar: '/a.png' } };

    const list = EditorialAdapter.getAllNormalizedPosts([rawMissingPub, rawFalsePub]);
    expect(list.some(p => p.slug === 'missing-pub-slug')).toBe(false);
    expect(list.some(p => p.slug === 'false-pub-slug')).toBe(false);
  });

  it('10. should reject malicious slugs with slashes, percents, or path traversal', () => {
    const maliciousSlugs = [
      'slug/with/slash',
      'slug%20encoded',
      '../traversal',
      'slug.with.dot',
      'slug_with_underscore'
    ];

    maliciousSlugs.forEach(slug => {
      const payload = {
        id: 1,
        slug,
        title: 'T',
        category: 'C',
        published: true,
        editorialApprovalStatus: 'LEGACY_UNVERIFIED',
        claimsVerified: false,
        author: { name: 'A', role: 'R', avatar: '/a.png' },
        sourceProvenance: 'supabase'
      };
      expect(ArtigoEditorialSchema.safeParse(payload).success).toBe(false);
    });
  });

  it('11. should implement stable duplicate policy (stable safe first - keeping first occurrence)', () => {
    const dup1 = { id: 'dup-1', slug: 'same-slug', title: 'First Title', category: 'C', published: true, author: { name: 'A', role: 'R', avatar: '/a.png' } };
    const dup2 = { id: 'dup-2', slug: 'same-slug', title: 'Second Title', category: 'C', published: true, author: { name: 'A', role: 'R', avatar: '/a.png' } };

    const posts = EditorialAdapter.getAllNormalizedPosts([dup1, dup2]);
    const matches = posts.filter(p => p.slug === 'same-slug');
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('dup-1');
    expect(matches[0].title).toBe('First Title');
  });

  it('12. should correctly sort posts by historical publication date descending', () => {
    const postOlder = { id: 'old', slug: 'old-slug', title: 'Old', category: 'C', published: true, publicationDate: '2030-01-01', canonicalUrl: 'https://revhackers.com.br/blog/old-slug', author: { name: 'A', role: 'R', avatar: '/a.png' } };
    const postNewer = { id: 'new', slug: 'new-slug', title: 'New', category: 'C', published: true, publicationDate: '2032-01-01', canonicalUrl: 'https://revhackers.com.br/blog/new-slug', author: { name: 'A', role: 'R', avatar: '/a.png' } };

    const posts = EditorialAdapter.getAllNormalizedPosts([postOlder, postNewer]);
    const idxNew = posts.findIndex(p => p.slug === 'new-slug');
    const idxOld = posts.findIndex(p => p.slug === 'old-slug');
    expect(idxNew).toBeLessThan(idxOld);
  });

});
