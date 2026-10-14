/**
 * Contratos diagnose / unlock / share do Diagnóstico LinkedIn.
 *
 * Espelha os contratos do MVP local sem importar o servidor:
 * - diagnose: valida material mínimo, roda o motor, devolve prévia + sessão.
 * - unlock: gate LGPD com token single-use e TTL; libera relatório completo.
 * - share: expõe SÓ a prévia (notas + headline + pilares). Textos do
 *   visitante e dados do lead NUNCA saem no share.
 *
 * Sem rede, sem scraping, sem CRM: o lead vive só na sessão em memória.
 * O envio ao CRM é dependência de publicação (ver PR).
 */

import {
  analisarAutoridadeLinkedin,
  faixaDaMedia,
  prioridades30Dias,
  type Confianca,
  type DimensaoId,
  type EntradaLinkedin,
  type ResultadoDiagnostico,
} from './linkedinAuthorityEngine';

export const SESSAO_TTL_MS = 30 * 60 * 1000;
export const MINIMO_MATERIAL_CHARS = 20;

export interface PreviaDiagnostico {
  media: number | null;
  faixa: string;
  headline_sugerida: string;
  pilares: Array<{ nome: string; justificativa: string }>;
  dimensoes: Array<{ id: DimensaoId; nota: number | null; confianca: Confianca }>;
  modo: 'observavel';
}

export interface PlanoSemana {
  semana: number;
  tema: string;
  formato: string;
}

export interface RelatorioCompleto {
  diagnostico_geral: string;
  dimensoes: ResultadoDiagnostico['dims'];
  headline_sugerida: string;
  pilares: ResultadoDiagnostico['pilares'];
  hooks: ResultadoDiagnostico['hooks'];
  problemas: string[];
  missings: string[];
  plano_4_semanas: PlanoSemana[];
  prioridades_30d: string[];
}

export interface LeadGate {
  nome: string;
  email: string;
  empresa?: string;
  lgpd: boolean;
}
export type ErroDiagnose = 'sem_material';
export type ErroUnlock = 'sessao_expirada' | 'cadastro_invalido';
export type { EntradaLinkedin } from './linkedinAuthorityEngine';

interface SessaoAtiva {
  slug: string;
  entrada: EntradaLinkedin;
  resultado: ResultadoDiagnostico;
  previa: PreviaDiagnostico;
  criadaEm: number;
}

const sessoes = new Map<string, SessaoAtiva>();
const CHAVE_SHARE = 'rh-linkedin-share:';

function gerarHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function limparSessoesExpiradas(): void {
  const agora = Date.now();
  for (const [token, s] of sessoes) {
    if (agora - s.criadaEm > SESSAO_TTL_MS) sessoes.delete(token);
  }
}

/** Material mínimo: headline + Sobre + posts somam 20+ caracteres. */
export function temMaterialMinimo(entrada: EntradaLinkedin): boolean {
  const posts = (entrada.posts ?? []).map((p) => String(p ?? '').trim()).filter(Boolean);
  const total = [entrada.headline, entrada.sobre, ...posts]
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
    .join('\n');
  return total.length >= MINIMO_MATERIAL_CHARS;
}

export function montarPrevia(resultado: ResultadoDiagnostico): PreviaDiagnostico {
  return {
    media: resultado.media,
    faixa: faixaDaMedia(resultado.media),
    headline_sugerida: resultado.headline_sugerida,
    pilares: resultado.pilares,
    dimensoes: resultado.dims.map((d) => ({ id: d.id, nota: d.nota, confianca: d.confianca })),
    modo: 'observavel',
  };
}

export function montarRelatorio(resultado: ResultadoDiagnostico): RelatorioCompleto {
  return {
    diagnostico_geral: `Média observável ${resultado.media ?? 'N/A'} (${faixaDaMedia(resultado.media)}) — relatório demonstrativo do motor observável, sem inferência de alcance ou engajamento.`,
    dimensoes: resultado.dims,
    headline_sugerida: resultado.headline_sugerida,
    pilares: resultado.pilares,
    hooks: resultado.hooks,
    problemas: resultado.problemas_gerais,
    missings: resultado.missings,
    plano_4_semanas: resultado.pilares.map((p, i) => ({
      semana: i + 1,
      tema: p.nome,
      formato: 'caso + framework + pergunta',
    })),
    prioridades_30d: prioridades30Dias(resultado),
  };
}

/**
 * Divide o textarea de posts em trechos pelo separador --- (uma linha).
 * Trechos com menos de 20 chars são descartados com aviso (não avaliáveis).
 */
export function dividirPosts(textoBruto: string): { posts: string[]; descartados: number } {
  const brutos = String(textoBruto ?? '')
    .split(/^\s*---\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
  const posts = brutos.filter((s) => s.length >= MINIMO_MATERIAL_CHARS);
  return { posts, descartados: brutos.length - posts.length };
}

export interface SaidaDiagnose {
  ok: true;
  slug: string;
  tokenSessao: string;
  previa: PreviaDiagnostico;
  postsDescartados: number;
}

export function iniciarDiagnostico(
  entrada: EntradaLinkedin,
  postsDescartados = 0,
): SaidaDiagnose | { ok: false; erro: ErroDiagnose; mensagem: string } {
  limparSessoesExpiradas();
  if (!temMaterialMinimo(entrada)) {
    return {
      ok: false,
      erro: 'sem_material',
      mensagem: 'Cole headline, Sobre ou ao menos 1 post (mín. 20 caracteres no total).',
    };
  }
  const resultado = analisarAutoridadeLinkedin(entrada);
  const previa = montarPrevia(resultado);
  const slug = gerarHex(6);
  const tokenSessao = gerarHex(16);
  sessoes.set(tokenSessao, { slug, entrada, resultado, previa, criadaEm: Date.now() });
  persistirPrevia(slug, previa);
  return { ok: true, slug, tokenSessao, previa, postsDescartados };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarLead(lead: LeadGate): string | null {
  if (!lead.nome || lead.nome.trim().length < 2) return 'Informe seu nome completo.';
  if (!EMAIL_RE.test(String(lead.email ?? '').trim())) return 'Informe um e-mail corporativo válido.';
  if (lead.lgpd !== true) return 'O consentimento LGPD é obrigatório para liberar o relatório.';
  return null;
}

export function liberarRelatorio(
  tokenSessao: string,
  lead: LeadGate,
): { ok: true; slug: string; relatorio: RelatorioCompleto } | { ok: false; erro: ErroUnlock; mensagem: string } {
  const sessao = sessoes.get(tokenSessao);
  if (!sessao || Date.now() - sessao.criadaEm > SESSAO_TTL_MS) {
    sessoes.delete(tokenSessao);
    return { ok: false, erro: 'sessao_expirada', mensagem: 'Sessão expirada. Rode o diagnóstico novamente.' };
  }
  const invalido = validarLead(lead);
  if (invalido) {
    return { ok: false, erro: 'cadastro_invalido', mensagem: invalido };
  }
  // Single-use: consome o token para impedir lead duplicado em duplo clique.
  sessoes.delete(tokenSessao);
  return { ok: true, slug: sessao.slug, relatorio: montarRelatorio(sessao.resultado) };
}

/** Share público: só a prévia. Textos do visitante e lead nunca persistem aqui. */
export function persistirPrevia(slug: string, previa: PreviaDiagnostico): void {
  try {
    window.localStorage.setItem(`${CHAVE_SHARE}${slug}`, JSON.stringify({ slug, previa }));
  } catch {
    // Armazenamento indisponível: o share segue válido só nesta sessão.
  }
}

export function lerPreviaCompartilhada(slug: string): PreviaDiagnostico | null {
  try {
    const bruto = window.localStorage.getItem(`${CHAVE_SHARE}${slug}`);
    if (!bruto) return null;
    const parsed = JSON.parse(bruto) as { previa?: PreviaDiagnostico };
    return parsed.previa ?? null;
  } catch {
    return null;
  }
}

/** Uso em testes: inspeciona sessão sem expor lead (lead não é armazenado). */
export function __testOnly__limparSessoes(): void {
  sessoes.clear();
}
