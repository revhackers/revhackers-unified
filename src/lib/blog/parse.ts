// Funções puras, sem imports com alias: este arquivo também é lido pelo plugin de build.

export const CATEGORIES = [
  'Vendas',
  'Customer Success',
  'RevOps',
  'Growth',
  'Marketing',
  'Dados',
  'Automação e IA',
  'CRM e ferramentas',
  'Estratégia',
] as const;

export interface PostHeading {
  id: string;
  text: string;
}

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  category: string;
  author: string;
  date: string;
  updated?: string;
  cover?: string;
  coverAlt?: string;
  coverCredit?: string;
  readingMinutes: number;
  headings: PostHeading[];
}

const REQUIRED_KEYS = ['title', 'description', 'category', 'author', 'date'] as const;
const OPTIONAL_KEYS = ['updated', 'cover', 'cover_alt', 'cover_credit'] as const;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function splitFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') {
    throw new Error('frontmatter inválido: o arquivo precisa começar com ---');
  }
  const data: Record<string, string> = {};
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '---') {
      end = i;
      break;
    }
    if (line.trim() === '') continue;
    const sep = line.indexOf(': ');
    if (sep < 1) {
      throw new Error(`frontmatter inválido: linha ${i + 1} não tem o formato chave: "valor"`);
    }
    const key = line.slice(0, sep);
    let value: unknown;
    try {
      value = JSON.parse(line.slice(sep + 2));
    } catch {
      throw new Error(`frontmatter inválido: o valor de "${key}" não é uma string entre aspas duplas`);
    }
    if (typeof value !== 'string') {
      throw new Error(`frontmatter inválido: o valor de "${key}" precisa ser texto`);
    }
    if (key in data) {
      throw new Error(`frontmatter inválido: chave "${key}" repetida`);
    }
    data[key] = value;
  }
  if (end < 0) {
    throw new Error('frontmatter inválido: falta o --- de fechamento');
  }
  return { data, body: lines.slice(end + 1).join('\n').replace(/^\n+/, '') };
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1) return false;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= lastDay;
}

/** Linhas do corpo fora de blocos de código cercados. */
export function proseLines(body: string): string[] {
  const out: string[] = [];
  let fenced = false;
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) out.push(line);
  }
  return out;
}

export function parsePost(slug: string, raw: string, authorIds: string[]): PostMeta {
  const fail = (reason: string): never => {
    throw new Error(`${slug}.md: ${reason}`);
  };

  let parsed: { data: Record<string, string>; body: string };
  try {
    parsed = splitFrontmatter(raw);
  } catch (error) {
    return fail((error as Error).message);
  }
  const { data, body } = parsed;

  for (const key of REQUIRED_KEYS) {
    if (!data[key] || data[key].trim() === '') fail(`falta a chave obrigatória "${key}"`);
  }
  for (const key of Object.keys(data)) {
    if (!(REQUIRED_KEYS as readonly string[]).includes(key) && !(OPTIONAL_KEYS as readonly string[]).includes(key)) {
      fail(`chave desconhecida "${key}"`);
    }
  }
  if (!(CATEGORIES as readonly string[]).includes(data.category)) {
    fail(`categoria "${data.category}" fora da lista (${CATEGORIES.join(', ')})`);
  }
  if (!authorIds.includes(data.author)) {
    fail(`autor "${data.author}" não existe em src/data/authors.ts`);
  }
  if (!isValidDate(data.date)) fail('date precisa ser AAAA-MM-DD válida');
  if (data.updated !== undefined && !isValidDate(data.updated)) fail('updated precisa ser AAAA-MM-DD válida');
  if (data.cover !== undefined) {
    if (!data.cover.startsWith('/images/blog/')) fail('cover precisa começar com /images/blog/');
    if (!data.cover_alt) fail('cover exige cover_alt');
    if (!data.cover_credit) fail('cover exige cover_credit');
  } else if (data.cover_alt !== undefined || data.cover_credit !== undefined) {
    fail('cover_alt e cover_credit só valem junto com cover');
  }

  const lines = proseLines(body);
  if (lines.some((line) => /^# /.test(line))) {
    fail('o corpo não pode ter título de nível 1 (# ); o título vem do cabeçalho');
  }

  const headings: PostHeading[] = [];
  const seen = new Map<string, number>();
  for (const line of lines) {
    const m = /^## +(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[1].trim();
    const base = slugifyHeading(text) || 'secao';
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    headings.push({ id: count === 1 ? base : `${base}-${count}`, text });
  }

  const words = body.split(/\s+/).filter(Boolean).length;

  return {
    slug,
    title: data.title,
    description: data.description,
    category: data.category,
    author: data.author,
    date: data.date,
    ...(data.updated ? { updated: data.updated } : {}),
    ...(data.cover ? { cover: data.cover, coverAlt: data.cover_alt, coverCredit: data.cover_credit } : {}),
    readingMinutes: Math.max(1, Math.ceil(words / 200)),
    headings,
  };
}
