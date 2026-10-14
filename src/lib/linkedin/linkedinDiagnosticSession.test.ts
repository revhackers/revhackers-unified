/**
 * Testes dos contratos diagnose / unlock / share.
 * Espelham o MVP: sem_material, gate LGPD, single-use, TTL e share sem PII.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __testOnly__limparSessoes,
  dividirPosts,
  iniciarDiagnostico,
  lerPreviaCompartilhada,
  liberarRelatorio,
  montarPrevia,
  temMaterialMinimo,
  validarLead,
  type EntradaLinkedin,
} from './linkedinDiagnosticSession';
import { analisarAutoridadeLinkedin } from './linkedinAuthorityEngine';

const ENTRADA_VALIDA: EntradaLinkedin = {
  headline: 'CEO na Transportadora Fictícia S.A. | Logística e gestão de frotas',
  sobre:
    'Texto-base com mais de cinquenta caracteres para avaliação observável. ' +
    'Me chama no inbox para conversar sobre custo logístico.',
  posts: [
    'Eu montei o checklist de manutenção que cortou 12% das quebras em 90 dias na operação.',
    'Diretores me perguntam onde o custo por entrega vaza: visitei 5 garagens e documentei tudo.',
  ],
  cargo: 'CEO',
  segmento: 'Logística',
  publico_alvo: 'embarcadores industriais',
};

const LEAD_VALIDO = { nome: 'Visitante Fictícia', email: 'visitante@empresa-ficticia.tld', empresa: 'Empresa Fictícia LTDA', lgpd: true };

beforeEach(() => {
  __testOnly__limparSessoes();
  window.localStorage.clear();
});

describe('diagnose', () => {
  it('rejeita entrada vazia com sem_material', () => {
    expect(temMaterialMinimo({})).toBe(false);
    const r = iniciarDiagnostico({ headline: 'Oi' });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.erro).toBe('sem_material');
  });

  it('gera prévia + sessão com slug e token', () => {
    const r = iniciarDiagnostico(ENTRADA_VALIDA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.slug).toMatch(/^[0-9a-f]{12}$/);
    expect(r.tokenSessao).toMatch(/^[0-9a-f]{32}$/);
    expect(r.previa.modo).toBe('observavel');
    expect(r.previa.headline_sugerida).toMatch(/\[A CONFIRMAR/);
    expect(r.previa.dimensoes).toHaveLength(8);
  });
});

describe('unlock (gate LGPD)', () => {
  it('fluxo completo: diagnose gera relatório com plano e prioridades', () => {
    const d = iniciarDiagnostico(ENTRADA_VALIDA);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    const u = liberarRelatorio(d.tokenSessao, LEAD_VALIDO);
    expect(u.ok).toBe(true);
    if (!u.ok) return;
    expect(u.slug).toBe(d.slug);
    expect(u.relatorio.problemas.length).toBeGreaterThan(0);
    expect(u.relatorio.prioridades_30d.length).toBeGreaterThanOrEqual(3);
    expect(u.relatorio.plano_4_semanas.length).toBeLessThanOrEqual(3);
  });

  it('single-use: segundo unlock com o mesmo token expira', () => {
    const d = iniciarDiagnostico(ENTRADA_VALIDA);
    if (!d.ok) throw new Error('diagnose deveria passar');
    const primeiro = liberarRelatorio(d.tokenSessao, LEAD_VALIDO);
    expect(primeiro.ok).toBe(true);
    const segundo = liberarRelatorio(d.tokenSessao, LEAD_VALIDO);
    expect(segundo.ok).toBe(false);
    if (segundo.ok === false) expect(segundo.erro).toBe('sessao_expirada');
  });

  it('token desconhecido expira com mensagem honesta', () => {
    const u = liberarRelatorio('token-inexistente', LEAD_VALIDO);
    expect(u.ok).toBe(false);
    if (u.ok === false) expect(u.erro).toBe('sessao_expirada');
  });

  it('sessão expira após o TTL de 30 minutos', () => {
    vi.useFakeTimers();
    try {
      const d = iniciarDiagnostico(ENTRADA_VALIDA);
      if (!d.ok) throw new Error('diagnose deveria passar');
      vi.advanceTimersByTime(31 * 60 * 1000);
      const u = liberarRelatorio(d.tokenSessao, LEAD_VALIDO);
      expect(u.ok).toBe(false);
      if (u.ok === false) expect(u.erro).toBe('sessao_expirada');
    } finally {
      vi.useRealTimers();
    }
  });

  it('gate exige nome, e-mail válido e LGPD', () => {
    expect(validarLead({ nome: 'A', email: LEAD_VALIDO.email, lgpd: true })).toMatch(/nome/i);
    expect(validarLead({ nome: 'Nome Válido', email: 'sem-arroba', lgpd: true })).toMatch(/e-mail/i);
    expect(validarLead({ nome: 'Nome Válido', email: LEAD_VALIDO.email, lgpd: false })).toMatch(/LGPD/i);
    expect(validarLead(LEAD_VALIDO)).toBeNull();
  });

  it('unlock com gate inválido não consome a sessão', () => {
    const d = iniciarDiagnostico(ENTRADA_VALIDA);
    if (!d.ok) throw new Error('diagnose deveria passar');
    const ruim = liberarRelatorio(d.tokenSessao, { nome: 'X', email: 'ruim', lgpd: false });
    expect(ruim.ok).toBe(false);
    const bom = liberarRelatorio(d.tokenSessao, LEAD_VALIDO);
    expect(bom.ok).toBe(true);
  });
});

describe('share sem PII', () => {
  it('prévia serializada nunca contém textos do visitante nem lead', () => {
    const resultado = analisarAutoridadeLinkedin(ENTRADA_VALIDA);
    const previa = montarPrevia(resultado);
    const serializada = JSON.stringify(previa);
    expect(serializada).not.toMatch(/manutenção que cortou/i);
    expect(serializada).not.toMatch(/visitante@/i);
    expect(serializada).not.toContain('Empresa Fictícia');
    expect(serializada).toMatch(/observavel/);
  });

  it('slug do diagnose é legível no share só com a prévia', () => {
    const d = iniciarDiagnostico(ENTRADA_VALIDA);
    if (!d.ok) throw new Error('diagnose deveria passar');
    const lida = lerPreviaCompartilhada(d.slug);
    expect(lida).not.toBeNull();
    expect(lida?.media).toBe(d.previa.media);
    expect(JSON.stringify(lida)).not.toMatch(/montei o checklist/i);
  });

  it('slug desconhecido retorna nulo (sem vazar nada)', () => {
    expect(lerPreviaCompartilhada('slug-inexistente')).toBeNull();
  });
});

describe('dividirPosts', () => {
  it('separa por --- e descarta trechos curtos com aviso', () => {
    const { posts, descartados } = dividirPosts(
      'Primeiro post com mais de vinte caracteres para valer.\n---\ncurto\n---\nSegundo post também com tamanho suficiente aqui.',
    );
    expect(posts).toHaveLength(2);
    expect(descartados).toBe(1);
  });
});
