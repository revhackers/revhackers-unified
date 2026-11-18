import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import CasesDetalhe from '../src/pages/CasesDetalhe';
import { casesData } from '../src/data/cases';

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="page-layout">{children}</div>,
}));

vi.mock('@/components/shared/SEO', () => ({
  default: () => null,
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cases/:slug" element={<CasesDetalhe />} />
      </Routes>
    </MemoryRouter>
  );

describe('Dossiê de case', () => {
  afterEach(() => cleanup());

  it('mostra o período dentro do cartão "Sobre o Cliente"', () => {
    renderAt('/cases/enics');

    const periodo = screen.getByText(casesData.enics.period!);
    const cartao = screen.getByText('Sobre o Cliente').parentElement!;
    expect(cartao).toContainElement(periodo);
  });

  it('trata um slug herdado do protótipo de Object como case inexistente', () => {
    renderAt('/cases/constructor');

    expect(screen.queryByText('Sobre o Cliente')).toBeNull();
  });
});
