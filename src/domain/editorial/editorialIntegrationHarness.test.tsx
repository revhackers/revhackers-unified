import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BlogPostContent from '@/components/blog/post/BlogPostContent';
import { ArticleRenderer } from '@/components/blog/ArticleRenderer';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Editorial Integration Harness - Custom TSX Fallback & Bundle Proof', () => {
  it('1. should render custom TSX article components for 3 actual custom mapped slugs and ignore markdown content sentinel', async () => {
    const testCases = [
      {
        slug: 'ltv-vs-cac-calcular-otimizar-crescimento-sustentavel',
        expectedText: '3 Erros que Mascaram a Realidade'
      },
      {
        slug: 'cold-email-2025-7-estrategias-que-funcionam',
        expectedText: 'Quer escalar sem cair no Spam?'
      },
      {
        slug: 'abm-na-pratica-escolher-contas-alvo',
        expectedText: 'Por que seu ABM vai falhar'
      }
    ];

    const sentinelContent = 'CONTENT_MARKER_SENTINEL_SHOULD_BE_IGNORED_12345';

    for (const tc of testCases) {
      const { unmount } = render(
        <MemoryRouter>
          <BlogPostContent
            slug={tc.slug}
            content={sentinelContent}
            category="RevOps"
            authorName="Giulliano Alves"
            authorRole="Architect"
            authorAvatar="/uploads/author.png"
          />
        </MemoryRouter>
      );

      // Await lazy component loading and verify characteristic heading is visible
      const heading = await screen.findByText(tc.expectedText, {}, { timeout: 4000 });
      expect(heading).toBeInTheDocument();

      // Verify content marker sentinel is ignored (not rendered in document)
      expect(screen.queryByText(sentinelContent)).not.toBeInTheDocument();

      unmount();
    }
  });

  it('neutraliza links e HTML perigosos no renderizador real', () => {
    const html = renderToStaticMarkup(<ArticleRenderer content={'[inseguro](javascript:alert(1))\n\n<img src=x onerror="alert(1)">\n\n<script>alert(1)</script>\n\n[seguro](https://example.org/fonte)'} />);
    const container = document.createElement('div');
    container.innerHTML = html;
    expect(container.querySelector('script, [onerror], a[href^="javascript:"]')).toBeNull();
    expect(container.querySelector('a[href="https://example.org/fonte"]')).not.toBeNull();
  });
});
