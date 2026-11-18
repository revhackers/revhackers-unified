import { posts } from 'virtual:blog-index';
import { splitFrontmatter } from './parse';

export { posts };

const bodies = import.meta.glob(['/src/content/blog/*.md', '!/src/content/blog/_*.md'], {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

export const getPostMeta = (slug: string) => posts.find((p) => p.slug === slug);

export async function loadPostBody(slug: string): Promise<string> {
  const load = bodies['/src/content/blog/' + slug + '.md'];
  if (!load) throw new Error(`Post "${slug}" não encontrado`);
  return splitFrontmatter(await load()).body;
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** `2026-03-14` vira `14 mar 2026`. Sem `new Date`, para não depender de fuso. */
export function formatDateShort(date: string): string {
  const [year, month, day] = date.split('-');
  return `${Number(day)} ${MONTHS_SHORT[Number(month) - 1]} ${year}`;
}

/** `2026-03-14` vira `14 de março de 2026`. */
export function formatDateLong(date: string): string {
  const [year, month, day] = date.split('-');
  return `${Number(day)} de ${MONTHS_LONG[Number(month) - 1]} de ${year}`;
}
