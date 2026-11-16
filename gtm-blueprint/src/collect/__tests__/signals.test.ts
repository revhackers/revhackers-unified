import { describe, it, expect } from 'vitest';
import { detectSiteSignals, findCnpj } from '../signals.js';

describe('detectSiteSignals', () => {
  it('detecta scripts de rastreamento, formulário e dados estruturados no HTML', () => {
    const html = '<script src="https://connect.facebook.net/en_US/fbevents.js"></script>'
      + '<script src="https://static.hotjar.com/c/hotjar.js"></script>'
      + '<form></form><script type="application/ld+json">{}</script>';
    const signals = detectSiteSignals(html, []);

    expect(signals).toContainEqual({ sinal: 'Pixel Meta', detectado: true });
    expect(signals).toContainEqual({ sinal: 'Hotjar', detectado: true });
    expect(signals).toContainEqual({ sinal: 'Formulário', detectado: true });
    expect(signals).toContainEqual({ sinal: 'Dados estruturados (JSON-LD)', detectado: true });
    expect(signals).toContainEqual({ sinal: 'Google Tag Manager', detectado: false });
  });

  it('detecta preços, cases e sobre pelo caminho do link, ignorando a origem e a query', () => {
    const signals = detectSiteSignals('', ['https://acme.test/planos?x=1', 'https://acme.test/cases/clientes', '/sobre#equipe']);

    expect(signals).toContainEqual({ sinal: 'Página de preços', detectado: true });
    expect(signals).toContainEqual({ sinal: 'Página de cases', detectado: true });
    expect(signals).toContainEqual({ sinal: 'Página sobre', detectado: true });
  });

  it('não detecta página sobre quando só o domínio contém a palavra', () => {
    const signals = detectSiteSignals('', ['https://empresa.test/']);

    expect(signals).toContainEqual({ sinal: 'Página sobre', detectado: false });
  });

  it('registra todos os sinais, detectados ou não', () => {
    expect(detectSiteSignals('', [])).toHaveLength(17);
  });
});

describe('findCnpj', () => {
  it('encontra o CNPJ do rodapé com ou sem pontuação', () => {
    expect(findCnpj(['Rua X, 10. CNPJ 12.345.678/0001-90 — Todos os direitos'])).toBe('12345678000190');
    expect(findCnpj(['12345678000190'])).toBe('12345678000190');
  });

  it('devolve null sem CNPJ ou quando há mais de um CNPJ distinto', () => {
    expect(findCnpj(['sem número de registro aqui'])).toBeNull();
    expect(findCnpj(['12.345.678/0001-90', '98.765.432/0001-10'])).toBeNull();
  });

  it('conta o mesmo CNPJ em páginas diferentes como um só', () => {
    expect(findCnpj(['12.345.678/0001-90', 'CNPJ: 12345678000190'])).toBe('12345678000190');
  });
});
