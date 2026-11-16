export interface EditorialAuthor {
  name: string;
  role: string;
  avatar: string;
}

export interface SeoMetadata {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogImage?: string;
}

export type EditorialApprovalStatus = 'LEGACY_UNVERIFIED' | 'PENDING_REVIEW' | 'TEST';

export type SourceProvenance = 'static' | 'gcp' | 'supabase' | 'unknown';

export interface ArtigoEditorial {
  id: string | number;
  slug: string;
  canonicalUrl?: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  content?: string;
  category: string;
  image?: string;
  author: EditorialAuthor;
  publicationDate?: string;
  updatedAt?: string;
  readTime?: string;
  featured?: boolean;
  editorialApprovalStatus: EditorialApprovalStatus;
  claimsVerified: false;
  sourceProvenance: SourceProvenance;
  seo?: SeoMetadata;
  published: boolean;
}
