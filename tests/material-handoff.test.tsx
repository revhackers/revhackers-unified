import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import MaterialLanding from '../src/pages/MaterialLanding';
import MaterialThankYou from '../src/pages/MaterialThankYou';
import MaterialModal from '../src/components/shared/MaterialModal';
import { GhlFormEmbed } from '../src/components/shared/GhlFormEmbed';
import { GHL_EMBED_BASE, GHL_FORMS } from '../src/config/ghl';

// Mock apenas de PageLayout e SEO conforme especificado para evitar dependências globais/backend
vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="page-layout">{children}</div>,
}));

vi.mock('@/components/shared/SEO', () => ({
  default: () => null,
}));

describe('Testes de Handoff de Materiais (Landing, Modal, ThankYou e GhlFormEmbed)', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('GhlFormEmbed rejeita mensagens de origens falsas ou substrings maliciosas (ex: api.leadconnectorhq.com.attacker.invalid)', async () => {
    const onSubmitted = vi.fn();
    render(
      <BrowserRouter>
        <GhlFormEmbed formId={GHL_FORMS.materiais} title="Receber material" onSubmitted={onSubmitted} />
      </BrowserRouter>
    );

    const iframe = screen.getByTitle('Receber material') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();

    const maliciousOrigin = 'https://api.leadconnectorhq.com.attacker.invalid';
    const fakeEvent = new MessageEvent('message', {
      origin: maliciousOrigin,
      data: ['set-sticky-contacts', '_ud', JSON.stringify({ email: 'attacker@evil.invalid' })],
      source: iframe.contentWindow,
    });

    act(() => {
      window.dispatchEvent(fakeEvent);
    });

    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('GhlFormEmbed rejeita mensagens cujo event.source não pertença ao contentWindow do iframe', async () => {
    const onSubmitted = vi.fn();
    render(
      <BrowserRouter>
        <GhlFormEmbed formId={GHL_FORMS.materiais} title="Receber material" onSubmitted={onSubmitted} />
      </BrowserRouter>
    );

    const validOrigin = new URL(GHL_EMBED_BASE).origin;
    const fakeEvent = new MessageEvent('message', {
      origin: validOrigin,
      data: ['set-sticky-contacts', '_ud', JSON.stringify({ email: 'spoofed@example.invalid' })],
      source: window,
    });

    act(() => {
      window.dispatchEvent(fakeEvent);
    });

    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('mantém os UTMs e o e-mail privado ao liberar o material e abrir a agenda', async () => {
    const attribution = {
      utm_source: 'materiais',
      utm_medium: 'cta',
      utm_campaign: 'auditar_operacao',
      utm_content: 'prospeccao',
      utm_term: 'growth',
    };
    sessionStorage.setItem('revhackers_utm', JSON.stringify({
      ...attribution,
      arbitrary_field: 'nao-encaminhar',
    }));
    window.history.replaceState({}, '', '/materiais/prospeccao-ultra-segmentada-7-dados');
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/materiais/:slug" element={<MaterialLanding />} />
          <Route path="/materiais/obrigado" element={<MaterialThankYou />} />
        </Routes>
      </BrowserRouter>
    );
    const iframe = screen.getByTitle('Receber material') as HTMLIFrameElement;
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: new URL(GHL_EMBED_BASE).origin,
        data: ['set-sticky-contacts', '_ud', JSON.stringify({ email: 'lead@example.invalid' })],
        source: iframe.contentWindow,
      }));
    });
    expect(await screen.findByText('Pronto. Seu material está liberado.')).toBeInTheDocument();
    const query = new URLSearchParams(window.location.search);
    expect(window.location.pathname).toBe('/materiais/obrigado');
    expect(query.get('m')).toBe('prospeccao-ultra-segmentada-7-dados');
    expect(query.has('email')).toBe(false);
    expect(query.has('arbitrary_field')).toBe(false);
    expect(window.history.state.usr.email).toBe('lead@example.invalid');
    for (const [key, value] of Object.entries(attribution)) {
      expect(query.get(key)).toBe(value);
    }
    const access = screen.getByRole('link', { name: 'Abrir material agora' });
    expect(access).toHaveAttribute('href', '/materiais/acesso/prospeccao-ultra-segmentada-7-dados');
    const diagnostic = new URL(
      screen.getByRole('link', { name: /Fazer diagnóstico Decisor Visible/i }).getAttribute('href')!,
      window.location.origin,
    );
    expect(diagnostic.pathname).toBe('/score-founder');
    expect(Object.fromEntries(diagnostic.searchParams)).toEqual({
      source: 'materiais:prospeccao-ultra-segmentada-7-dados',
      material: 'prospeccao-ultra-segmentada-7-dados',
      ...attribution,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agendar diagnóstico' }));
    const booking = await screen.findByTitle('Agendar diagnóstico');
    const bookingUrl = new URL(booking.getAttribute('src')!);
    expect(bookingUrl.searchParams.get('email')).toBe('lead@example.invalid');
    expect(window.location.search).not.toContain('email');
  });


  it('MaterialModal renderiza e gerencia sucesso de submissão do material', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    function ModalRouterHarness() {
      return (
        <Routes>
          <Route
            path="/"
            element={
              <MaterialModal
                isOpen={true}
                onClose={onClose}
                material={{ slug: 'prospeccao-ultra-segmentada-7-dados', title: 'Prospecção' }}
                onSuccess={onSuccess}
              />
            }
          />
          <Route path="/materiais/obrigado" element={<MaterialThankYou />} />
        </Routes>
      );
    }

    render(
      <BrowserRouter>
        <ModalRouterHarness />
      </BrowserRouter>
    );

    const iframe = screen.getByTitle('Receber material') as HTMLIFrameElement;
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: new URL(GHL_EMBED_BASE).origin,
        data: ['set-sticky-contacts', '_ud', JSON.stringify({ email: 'modal@example.invalid' })],
        source: iframe.contentWindow,
      }));
    });
    expect(await screen.findByText('Pronto. Seu material está liberado.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir material agora' })).toHaveAttribute(
      'href', '/materiais/acesso/prospeccao-ultra-segmentada-7-dados',
    );
    expect(window.location.pathname).toBe('/materiais/obrigado');
    expect(new URLSearchParams(window.location.search).has('email')).toBe(false);
    expect(window.history.state.usr.email).toBe('modal@example.invalid');
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
