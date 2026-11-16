import { z } from 'zod';
import { ArtigoEditorial, EditorialApprovalStatus, SourceProvenance } from '@/types/editorial';
import { blogPosts as staticPosts, BlogPost as StaticBlogPost } from '@/data/blogData';
import { APP_CONFIG } from '@/config/constants';

const LANDING_ORIGIN = new URL(APP_CONFIG.URLS.LANDING_PAGE).origin;

// Zod runtime validation schema enforcing strict B1A.3 invariants:
// - No APPROVED status or claims true (claimsVerified must be literal false)
// - Strict canonical URL origin (LANDING_PAGE only), path, and no search/hash/credentials
// - Strict slug, non-empty ID, and non-empty date validation (rejecting empty strings)
export const ArtigoEditorialSchema = z.object({
  id: z.union([z.string().min(1, 'ID obrigatório'), z.number()]),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug deve ser k-ebab-case alfanumérico seguro'),
  canonicalUrl: z.string().url().optional(),
  title: z.string().min(1, 'Título obrigatório'),
  subtitle: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  category: z.string().min(1, 'Categoria obrigatória'),
  image: z.string().optional(),
  author: z.object({
    name: z.string().min(1, 'Nome do autor obrigatório'),
    role: z.string().min(1, 'Cargo do autor obrigatório'),
    avatar: z.string().min(1, 'Avatar do autor obrigatório')
  }),
  publicationDate: z.string().min(1, 'Data não pode ser vazia').refine(val => !isNaN(Date.parse(val)), 'Data de publicação inválida').optional(),
  updatedAt: z.string().min(1, 'Data não pode ser vazia').refine(val => !isNaN(Date.parse(val)), 'Data de atualização inválida').optional(),
  readTime: z.string().optional(),
  featured: z.boolean().optional(),
  editorialApprovalStatus: z.enum(['LEGACY_UNVERIFIED', 'PENDING_REVIEW', 'TEST']),
  claimsVerified: z.literal(false),
  sourceProvenance: z.enum(['static', 'gcp', 'supabase', 'unknown']),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    ogImage: z.string().optional()
  }).optional(),
  published: z.boolean()
}).refine(data => {
  if (data.canonicalUrl) {
    try {
      const u = new URL(data.canonicalUrl);
      if (u.search || u.hash || u.username || u.password) return false;
      if (u.origin !== LANDING_ORIGIN) return false;
      if (u.pathname !== `/blog/${data.slug}`) return false;
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: 'Canonical URL deve pertencer exclusivamente ao domínio LANDING_PAGE e rota oficial do blog',
  path: ['canonicalUrl']
});

/**
 * Normaliza posts estáticos do blogData.
 */
export function normalizeStaticPost(p: StaticBlogPost): ArtigoEditorial {
  const cleanTitle = p.title ? p.title.replace(/<span>|<\/span>/g, '') : '';
  const parsed = ArtigoEditorialSchema.parse({
    id: p.id,
    slug: p.slug,
    canonicalUrl: `${LANDING_ORIGIN}/blog/${p.slug}`,
    title: cleanTitle,
    excerpt: p.excerpt,
    content: p.content,
    category: p.category || 'Geral',
    image: p.image,
    author: p.author,
    publicationDate: p.date,
    updatedAt: p.date,
    readTime: p.readTime,
    featured: p.featured || false,
    editorialApprovalStatus: 'LEGACY_UNVERIFIED',
    claimsVerified: false,
    sourceProvenance: 'static',
    seo: {
      metaTitle: `${cleanTitle} | RevHackers`,
      metaDescription: p.excerpt,
      keywords: [p.category?.toLowerCase() || 'revops', 'b2b'],
      ogImage: p.image
    },
    published: true
  });

  // Zod valida os campos obrigatórios; strictNullChecks=false faz a inferência Zod 3 marcá-los como opcionais.
  const validated = parsed as ArtigoEditorial;
  return validated;
}

/**
 * Normaliza posts de API (Supabase / GCP / desconhecido).
 * Fail-closed: published omitido = false.
 * Do NOT trust raw.sourceProvenance; use explicit caller parameter defaulting to 'unknown'.
 * External canonical absent stays undefined (do not synthesize).
 */
export function normalizeApiPost(raw: Record<string, unknown>, provenance: SourceProvenance = 'unknown'): ArtigoEditorial {
  const rawTitle = typeof raw.title === 'string' ? raw.title : '';
  const cleanTitle = rawTitle.replace(/<span>|<\/span>/g, '');
  const rawSlug = typeof raw.slug === 'string' ? raw.slug : '';
  const rawExcerpt = typeof raw.excerpt === 'string' ? raw.excerpt : undefined;
  const rawContent = typeof raw.content === 'string' ? raw.content : undefined;
  const rawCategory = typeof raw.category === 'string' ? raw.category : '';
  const rawImage = typeof raw.image === 'string' ? raw.image : undefined;
  
  const rawDate = typeof raw.publicationDate === 'string' ? raw.publicationDate : (typeof raw.date === 'string' ? raw.date : (typeof raw.created_at === 'string' ? raw.created_at : undefined));
  const rawUpdated = typeof raw.updatedAt === 'string' ? raw.updatedAt : (typeof raw.updated_at === 'string' ? raw.updated_at : rawDate);
  const rawReadTime = typeof raw.read_time === 'string' ? raw.read_time : (typeof raw.readTime === 'string' ? raw.readTime : undefined);
  const rawFeatured = typeof raw.featured === 'boolean' ? raw.featured : false;
  
  const rawPublished = typeof raw.published === 'boolean' ? raw.published : false;

  const rawAuthor = raw.author && typeof raw.author === 'object' ? (raw.author as Record<string, unknown>) : null;
  const authorName = rawAuthor && typeof rawAuthor.name === 'string' ? rawAuthor.name : (typeof raw.author_name === 'string' ? raw.author_name : '');
  const authorRole = rawAuthor && typeof rawAuthor.role === 'string' ? rawAuthor.role : (typeof raw.author_role === 'string' ? raw.author_role : '');
  const authorAvatar = rawAuthor && typeof rawAuthor.avatar === 'string' ? rawAuthor.avatar : (typeof raw.author_avatar === 'string' ? raw.author_avatar : '');

  const rawId = (typeof raw.id === 'string' || typeof raw.id === 'number') ? raw.id : undefined;

  // Strict: use explicit caller provenance parameter, ignoring self-proclaimed raw.sourceProvenance
  const resolvedProvenance: SourceProvenance = provenance;

  let approvalStatus: EditorialApprovalStatus = 'LEGACY_UNVERIFIED';
  if (raw.editorialApprovalStatus === 'PENDING_REVIEW') {
    approvalStatus = 'PENDING_REVIEW';
  } else if (raw.editorialApprovalStatus === 'TEST') {
    approvalStatus = 'TEST';
  }

  // External canonical absent should stay undefined (do not synthesize)
  const rawCanonical = typeof raw.canonicalUrl === 'string' ? raw.canonicalUrl : undefined;

  const normalized = ArtigoEditorialSchema.parse({
    id: rawId,
    slug: rawSlug,
    canonicalUrl: rawCanonical,
    title: cleanTitle,
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : undefined,
    excerpt: rawExcerpt,
    content: rawContent,
    category: rawCategory,
    image: rawImage,
    author: {
      name: authorName,
      role: authorRole,
      avatar: authorAvatar
    },
    publicationDate: rawDate,
    updatedAt: rawUpdated,
    readTime: rawReadTime,
    featured: rawFeatured,
    editorialApprovalStatus: approvalStatus,
    claimsVerified: false,
    sourceProvenance: resolvedProvenance,
    seo: {
      metaTitle: `${cleanTitle} | RevHackers`,
      metaDescription: rawExcerpt,
      keywords: rawCategory ? [rawCategory.toLowerCase(), 'revops'] : ['revops'],
      ogImage: rawImage
    },
    published: rawPublished
  });

  // A asserção corrige apenas a inferência Zod 3 após validação de runtime, não aceita entrada sem parse.
  const validated = normalized as ArtigoEditorial;
  return validated;
}

export interface AdapterOptions {
  includeTestFixtures?: boolean;
  provenance?: SourceProvenance;
}

/**
 * Adapter principal com isolamento estrito de fixture de teste e runtime validation.
 */
export class EditorialAdapter {
  static getAllNormalizedPosts(apiPosts: Record<string, unknown>[] = [], options: AdapterOptions = {}): ArtigoEditorial[] {
    const apiMap = new Map<string, Record<string, unknown>>();
    for (const p of apiPosts) {
      if (typeof p.slug === 'string' && p.slug) {
        if (!apiMap.has(p.slug)) {
          apiMap.set(p.slug, p);
        }
      }
    }
    const uniqueApiPosts = Array.from(apiMap.values());

    const defaultProvenance = options.provenance || 'unknown';
    const normalizedApi = uniqueApiPosts.map(p => normalizeApiPost(p, defaultProvenance));
    
    const publishedApiSlugs = new Set(
      normalizedApi.filter(p => p.published && p.editorialApprovalStatus !== 'TEST').map(p => p.slug)
    );

    const normalizedStatic = staticPosts
      .filter(p => !publishedApiSlugs.has(p.slug))
      .map(normalizeStaticPost);

    const all = [...normalizedApi, ...normalizedStatic];
    const publishedOnly = all.filter(p => p.published === true && p.editorialApprovalStatus !== 'TEST');

    return publishedOnly.sort((a, b) => {
      const dateA = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
      const dateB = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
      return dateB - dateA;
    });
  }

  static getPostBySlug(slug: string, apiPosts: Record<string, unknown>[] = [], options: AdapterOptions = {}): ArtigoEditorial | null {
    const allPosts = EditorialAdapter.getAllNormalizedPosts(apiPosts, options);
    const found = allPosts.find(p => p.slug === slug);
    return found || null;
  }
}
