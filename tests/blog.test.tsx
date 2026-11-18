import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import Blog from '../src/pages/Blog';
import BlogPost from '../src/pages/BlogPost';
import NotFound from '../src/pages/NotFound';
import { posts, loadPostBody } from '../src/lib/blog';
import { parsePost, proseLines } from '../src/lib/blog/parse';
import slugs from './fixtures/blog-slugs.json';

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="page-layout">{children}</div>,
}));

vi.mock('@/components/shared/SEO', () => ({
  default: () => null,
}));

const AUTHORS = ['giulliano-alves', 'equipe-revhackers'];
const VALID_HEADER = [
  '---',
  'title: "Título"',
  'description: "Resumo"',
  'category: "Growth"',
  'author: "giulliano-alves"',
  'date: "2026-01-01"',
  '---',
  '',
  'Texto.',
].join('\n');

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  );

describe('conteúdo do blog', () => {
  afterEach(() => cleanup());

  it('mantém os 153 posts e todas as URLs antigas', () => {
    const published = new Set(posts.map((p) => p.slug));
    expect(posts).toHaveLength(153);
    for (const slug of slugs) expect(published.has(slug), slug).toBe(true);
  });

  it('todo post tem texto limpo: sem título H1, bloco de resumo antigo, assinatura de série nem emoji', async () => {
    for (const { slug } of posts) {
      const body = await loadPostBody(slug);
      expect(body.length, slug).toBeGreaterThanOrEqual(400);
      expect(proseLines(body).some((line) => line.startsWith('# ')), slug).toBe(false);
      expect(body, slug).not.toContain('[TAKEAWAYS');
      expect(body, slug).not.toContain('faz parte da série');
      expect(body, slug).not.toContain('Conteúdo renderizado via componente customizado');
      expect(/\p{Extended_Pictographic}/u.test(body), slug).toBe(false);
    }
  });
});

describe('contrato dos arquivos de post', () => {
  it('aceita um cabeçalho válido e calcula tempo de leitura e títulos', () => {
    const meta = parsePost('modelo', VALID_HEADER + '\n\n## Uma seção\n\n## Uma seção\n', AUTHORS);
    expect(meta.readingMinutes).toBe(1);
    expect(meta.headings).toEqual([
      { id: 'uma-secao', text: 'Uma seção' },
      { id: 'uma-secao-2', text: 'Uma seção' },
    ]);
  });

  it.each([
    ['categoria fora da lista', VALID_HEADER.replace('"Growth"', '"Outra"'), /categoria/],
    ['autor desconhecido', VALID_HEADER.replace('"giulliano-alves"', '"ninguem"'), /autor/],
    ['capa sem crédito', VALID_HEADER.replace('---\n\nTexto', 'cover: "/images/blog/x/a.webp"\ncover_alt: "Tela"\n---\n\nTexto'), /cover_credit/],
    ['título de nível 1 no corpo', VALID_HEADER + '\n\n# Título repetido\n', /nível 1/],
  ])('rejeita %s', (_nome, raw, motivo) => {
    expect(() => parsePost('modelo', raw, AUTHORS)).toThrow(motivo);
  });
});

describe('páginas do blog', () => {
  afterEach(() => cleanup());

  it('renderiza o post com um único CTA e sem o bloco antigo', async () => {
    renderAt('/blog/revenue-architecture-guia-definitivo');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Revenue Architecture: O Guia Definitivo para Construir Máquinas de Receita' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Resumo' })).toBeInTheDocument();
    expect(screen.queryByText('PRÓXIMO PASSO')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Agendar Diagnóstico' })).toHaveLength(1);
  });

  it('mostra a página 404 para slug que não existe', () => {
    renderAt('/blog/slug-que-nao-existe');

    expect(screen.queryByRole('heading', { level: 1, name: /Revenue Architecture/ })).toBeNull();
    expect(screen.getByText(/Página não encontrada/)).toBeInTheDocument();
  });

  it('lista 20 posts por página com paginação', () => {
    renderAt('/blog');

    expect(screen.getAllByRole('article')).toHaveLength(20);
    expect(screen.getByText('Página 1 de 8')).toBeInTheDocument();
  });

  it('filtra pela categoria da URL', () => {
    renderAt('/blog?categoria=RevOps');

    const items = screen.getAllByRole('article');
    const expected = posts.filter((p) => p.category === 'RevOps').length;
    expect(items).toHaveLength(Math.min(20, expected));
    for (const item of items) expect(within(item).getByText('RevOps')).toBeInTheDocument();
  });
});
