import { authenticatedRequest, apiBase } from './_base';

export interface BlogArticleGcp {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt?: string;
  content: string;
  authorName?: string;
  readTime?: string;
  published: boolean;
  createdAt: string;
}

// MaterialGcp removed

export interface CaseStudyGcp {
  id: string;
  clientName: string;
  clientLogo?: string;
  caseCategory: string;
  headline: string;
  summary?: string;
  published: boolean;
  createdAt: string;
}

// ============ Normalizers: frontend (snake_case) → GCP API (camelCase) ============

// Blog: frontend fields already match Zod schema (title, slug, category, authorId, readTime)
// No transformation needed for blog articles

// toGcpMaterialPayload removed
// Cases: frontend sends snake_case, Zod expects camelCase
// title → headline (frontend field name to Zod field name)
// Zod requires BOTH title AND headline as separate required fields
function toGcpCasePayload(input: Record<string, unknown>): Record<string, unknown> {
  const swap: Record<string, string> = {
    client_name: 'clientName',
    client_logo: 'clientLogo',
    case_category: 'caseCategory',
    cover_image: 'coverImage',
  };
  const out: Record<string, unknown> = {};
  // Copy title to both title and headline (Zod requires both)
  if (input.title !== undefined) {
    out.title = input.title;
    out.headline = input.title;
  }
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || k === 'title') continue; // title already handled above
    const target = swap[k] ?? k;
    out[target] = v;
  }
  return out;
}

// ============ Response normalizers: GCP API (camelCase) → frontend (snake_case) ============

// Blog: map to snake_case for frontend compatibility
function fromGcpBlog(record: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!record) return null;
  const swap: Record<string, string> = {
    authorName: 'author_name',
    readTime: 'read_time',
    createdAt: 'created_at',
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    out[swap[k] ?? k] = v;
  }
  return out;
}

// fromGcpMaterial removed
// Cases: map to snake_case for frontend compatibility
function fromGcpCase(record: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!record) return null;
  const swap: Record<string, string> = {
    clientName: 'client_name',
    clientLogo: 'client_logo',
    caseCategory: 'case_category',
    coverImage: 'cover_image',
    createdAt: 'created_at',
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    out[swap[k] ?? k] = v;
  }
  return out;
}

// ============ HTTP helpers ============

async function callPublic<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path.startsWith('/') ? path : `/${path}`}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API GCP ${init?.method || 'GET'} ${path} falhou: ${res.status} ${text}`);
  }
  const body = await res.json().catch(() => ({}));
  return (body && typeof body === 'object' && 'data' in body ? body.data : body) as T;
}

async function callAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const res = await authenticatedRequest(path, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API GCP ${init?.method || 'GET'} ${path} falhou: ${res.status} ${text}`);
  }
  const body = await res.json().catch(() => ({}));
  return (body && typeof body === 'object' && 'data' in body ? body.data : body) as T;
}

export const contentGcpAdapter = {
  // Blog Articles
  async getBlogArticles(): Promise<Record<string, unknown>[]> {
    const data = await callPublic<BlogArticleGcp[]>('/v1/blog/articles');
    return data.map(r => fromGcpBlog(r) as Record<string, unknown>);
  },

  async createBlogArticle(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return callAuth<BlogArticleGcp>('/v1/blog/articles', { method: 'POST', body: JSON.stringify(payload) })
      .then(r => fromGcpBlog(r) as Record<string, unknown>);
  },

  async updateBlogArticle(id: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return callAuth<BlogArticleGcp>(`/v1/blog/articles/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) })
      .then(r => fromGcpBlog(r) as Record<string, unknown>);
  },

  async deleteBlogArticle(id: string): Promise<void> {
    await callAuth(`/v1/blog/articles/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // Materials methods removed

  // Cases
  async getCases(): Promise<Record<string, unknown>[]> {
    const data = await callPublic<CaseStudyGcp[]>('/v1/cases');
    return data.map(r => fromGcpCase(r) as Record<string, unknown>);
  },

  async createCase(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return callAuth<CaseStudyGcp>('/v1/cases', { method: 'POST', body: JSON.stringify(toGcpCasePayload(payload)) })
      .then(r => fromGcpCase(r) as Record<string, unknown>);
  },

  async updateCase(id: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return callAuth<CaseStudyGcp>(`/v1/cases/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(toGcpCasePayload(payload)) })
      .then(r => fromGcpCase(r) as Record<string, unknown>);
  },

  async deleteCase(id: string): Promise<void> {
    await callAuth(`/v1/cases/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
