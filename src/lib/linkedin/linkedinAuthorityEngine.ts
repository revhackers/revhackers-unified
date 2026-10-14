/**
 * Motor observável de autoridade no LinkedIn (modo determinístico, sem LLM).
 *
 * LIMITES M1 DECLARADOS (não simulados):
 * - Só avalia características OBSERVÁVEIS do texto colado (tamanho,
 *   parágrafos, estrutura, CTA, link, hashtag, especificidade literal).
 * - PROIBIDO inferir alcance, engajamento, frequência de publicação,
 *   formato visual ou conversão.
 * - PROIBIDO alegar comportamento do algoritmo do LinkedIn.
 * - Sem juízo semântico: D5 conta frequência de termos (não relevância),
 *   D7 conta moldes textuais (não variedade real), D8 faz match literal
 *   com stemming mínimo (não intenção do decisor).
 * - Divergências conhecidas herdadas do MVP (D1/D5/D7 otimistas, D2 com
 *   teto 8): documentadas, nunca corrigidas inflando nota.
 * - Nenhum número fora da entrada: notas 0-10, contagens estruturais e os
 *   marcadores [A CONFIRMAR] / 140 chars / 30 dias / 4 semanas são os
 *   únicos literais permitidos além do vocabulário da entrada.
 *
 * Reimplementação TypeScript inspirada na rubrica v3 do MVP local
 * (8 dimensões D1-D8, N/A com motivo, confiança separada da nota).
 * Não importa o motor do MVP como está: nomes, estrutura e montagem
 * foram reescritos para o app; o comportamento observável é compatível
 * para preservar os contratos diagnose/unlock/share.
 */

export type DimensaoId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8';
export type Confianca = 'Alta' | 'Média' | 'Baixa';

export interface EntradaLinkedin {
  headline?: string;
  sobre?: string;
  posts?: string[];
  cargo?: string;
  segmento?: string;
  publico_alvo?: string;
  objetivo?: string;
  /** Referência opcional. Nunca acessada, nunca validada por rede. */
  linkedin_url?: string;
}

export interface Dimensao {
  id: DimensaoId;
  nota: number | null;
  confianca: Confianca;
  evidencias: string[];
  problemas: string[];
  nao_avaliavel_motivo: string | null;
}

export interface Pilar {
  nome: string;
  justificativa: string;
}

export interface HookSugerido {
  para_post: number;
  hook: string;
  porque: string;
}

export interface ResultadoDiagnostico {
  media: number | null;
  dims: Dimensao[];
  headline_sugerida: string;
  pilares: Pilar[];
  hooks: HookSugerido[];
  problemas_gerais: string[];
  missings: string[];
}

/** Nomes públicos das 8 dimensões (espelho da rubrica v3). */
export const DIMENSOES_META: Record<DimensaoId, { nome: string; explicacao: string }> = {
  D1: { nome: 'Clareza de posicionamento', explicacao: 'Quem você ajuda, com o quê, para quem. E se a dor tem verba.' },
  D2: { nome: 'Headline', explicacao: 'Cargo + segmento + resultado nos primeiros caracteres, sem clichê.' },
  D3: { nome: 'Seção Sobre', explicacao: 'Texto escaneável, prova concreta e um único CTA.' },
  D4: { nome: 'Autoridade do conteúdo', explicacao: 'Experiência própria, dados ou método. Ou só opinião.' },
  D5: { nome: 'Consistência de pilares', explicacao: '2 a 4 temas recorrentes alinhados ao posicionamento.' },
  D6: { nome: 'Hooks', explicacao: 'Aberturas específicas, sem isca, link no corpo ou excesso de hashtags.' },
  D7: { nome: 'Diversidade de formatos', explicacao: 'Variação observável de moldes textuais.' },
  D8: { nome: 'Coerência público-conteúdo', explicacao: 'Vocabulário e dores de quem decide e compra.' },
};

/** Faixa qualitativa da média observável. */
export function faixaDaMedia(media: number | null): string {
  if (media === null || Number.isNaN(media)) return 'sem material suficiente';
  if (media < 4) return 'fundação ausente';
  if (media < 6) return 'base com vazamentos';
  if (media < 8) return 'autoridade funcional';
  return 'referência do nicho';
}

// ---------------------------------------------------------------------------
// Normalização e detecções (observáveis, sem semântica)
// ---------------------------------------------------------------------------

/** Minúsculas + sem diacríticos ("opinião" == "opiniao"). */
export function normalizar(texto: string): string {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Stemming mínimo só para COMPARAÇÃO (nunca exibido): plural -es/-s. */
export function radicalizar(palavra: string): string {
  const w = normalizar(palavra);
  if (w.length > 5 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

interface PadraoCliche {
  re: RegExp;
  nome: string;
}

/** Lista fechada de clichês com flexão verbal tolerada. */
export const PADROES_CLICHE: PadraoCliche[] = [
  { re: /apaixonad[oa]s?\s+por/, nome: 'apaixonado(a) por' },
  { re: /ajud[oa](mos|m)?\s+(empresas?|pessoas?|negocios?|clientes?)\s+a\b/, nome: 'ajudo empresas a…' },
  { re: /o que acham\?/, nome: '"o que acham?"' },
  { re: /voce concorda\?/, nome: '"você concorda?"' },
  { re: /vamos l[áa]/, nome: '"vamos lá"' },
  { re: /\bspoiler\b/, nome: '"spoiler"' },
];

export function detectarCliches(texto: string): string[] {
  const t = normalizar(texto);
  return PADROES_CLICHE.filter((p) => p.re.test(t)).map((p) => p.nome);
}

/**
 * Artefatos metalinguísticos: nomeiam o artefato (exemplo, teste),
 * não um tema de negócio. Nunca viram pilar editorial.
 */
export const TERMOS_META = new Set([
  'exemplo', 'exemplos', 'ficticio', 'ficticia', 'ficticios', 'teste', 'testes',
  'texto', 'textos', 'post', 'posts', 'empresa', 'empresas', 'dado', 'dados',
  'coisa', 'coisas', 'fato', 'fatos', 'jeito', 'jeitos', 'forma', 'formas',
  'parte', 'pontos', 'contato', 'email',
]);

const RE_CTA =
  /(comente|comenta|salv[ea]|compartilh[ea]|me cham[ae]|fala comigo|link (no|nos)|qual .* (dói|falta)|já aconteceu|você já)/i;
const RE_NUMERO = /\d+([.,]\d+)?\s?(%|k|mil|milh|meses|anos|dias|km|lojas)?/i;
const RE_LINK = /https?:\/\/\S+|www\.\S+/i;
const RE_HASHTAG = /#[\p{L}\d_]+/gu;
const RE_ISCA = /o que acham\?|você concorda\?/i;
const RE_EXPERIENCIA_VIVIDA =
  /\b(eu|meu|minha|nossa|nosso|liderei|acompanho|montei|fiz|fizemos|descobri|visitei|rodei|constru[ií]|entreguei|negociei|implantei|acompanhei)\b/i;

export interface EstatisticasTexto {
  tamanho: number;
  paragrafos: number;
  bullets: number;
  temLink: boolean;
  hashtags: string[];
  temCta: boolean;
  temNumero: boolean;
  temPergunta: boolean;
  cliches: string[];
  temIsca: boolean;
  primeiros140: string;
  abertura: string;
}

export function estatisticas(texto: string): EstatisticasTexto {
  const t = String(texto ?? '');
  const paras = t
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    tamanho: t.length,
    paragrafos: paras.length,
    bullets: (t.match(/^(\s*[-*•\d+[.)])\s+\S/gm) || []).length,
    temLink: RE_LINK.test(t),
    hashtags: [...t.matchAll(RE_HASHTAG)].map((m) => m[0]),
    temCta: RE_CTA.test(t),
    temNumero: RE_NUMERO.test(t),
    temPergunta: /\?\s*$|\?/.test(t),
    cliches: detectarCliches(t),
    temIsca: RE_ISCA.test(t),
    primeiros140: t.slice(0, 140),
    abertura: paras.slice(0, 3).join('\n'),
  };
}

/** Termos mais frequentes do corpus (frequência pura, sem semântica). */
export function termosFrequentes(textos: string[], top = 12): Array<[string, number]> {
  const freq = new Map<string, number>();
  for (const t of textos) {
    const palavras = normalizar(t)
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/);
    for (const w of palavras) {
      if (w.length > 3 && !TERMOS_META.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
}

// ---------------------------------------------------------------------------
// Diagnóstico D1-D8
// ---------------------------------------------------------------------------

function evidenciasLimitadas(...xs: Array<string | false | null | undefined>): string[] {
  return xs.filter((x): x is string => Boolean(x)).slice(0, 4);
}

function dimensao(
  id: DimensaoId,
  nota: number | null,
  confianca: Confianca,
  evidencias: string[],
  problemas: string[],
  nao_avaliavel_motivo: string | null = null,
): Dimensao {
  return { id, nota, confianca, evidencias, problemas, nao_avaliavel_motivo };
}

function avaliarD1(entrada: EntradaLinkedin, headline: string, sobre: string): Dimensao {
  const hs = estatisticas(headline);
  const ss = estatisticas(sobre);
  const junto = `${headline} ${sobre}`.toLowerCase();
  const nomeiaNicho =
    Boolean(entrada.segmento) &&
    junto.includes(entrada.segmento!.split(' ')[0].toLowerCase());
  const nomeiaPublico =
    Boolean(entrada.publico_alvo) &&
    `${headline} ${sobre}`.length > 0 &&
    entrada
      .publico_alvo!.split(/[,;]/)
      .some((a) => junto.includes(a.trim().split(' ')[0].toLowerCase()));
  const problemas: string[] = [];
  if (!nomeiaNicho) problemas.push('Segmento não nomeado no texto visível');
  if (!nomeiaPublico) problemas.push('Público-alvo não nomeado em headline/Sobre');
  const pontuacao =
    (nomeiaNicho ? 3 : 1) +
    (nomeiaPublico ? 3 : 1) +
    (entrada.objetivo && sobre.includes(entrada.objetivo.split(' ')[0]) ? 1 : 0) +
    (hs.tamanho > 20 && ss.tamanho > 100 ? 1 : 0);
  return dimensao(
    'D1',
    Math.min(10, pontuacao + 1),
    nomeiaNicho || nomeiaPublico ? 'Alta' : 'Média',
    evidenciasLimitadas(headline.slice(0, 140), sobre.slice(0, 140)),
    problemas,
  );
}

function avaliarD2(headline: string, publicoAlvo?: string): Dimensao {
  if (!headline.trim()) {
    return dimensao('D2', null, 'Baixa', [], [], 'Sem headline na entrada');
  }
  const hs = estatisticas(headline);
  const problemas: string[] = [];
  if (hs.tamanho < 20) problemas.push('Headline curta demais para dizer cargo + segmento');
  if (hs.cliches.length) problemas.push(`Clichê observável: ${hs.cliches.join(', ')}`);
  if (!hs.temNumero && !/[|·-]/.test(headline)) {
    problemas.push('Sem resultado nem separador de proposta de valor');
  }
  const termosPublico = publicoAlvo
    ? normalizar(publicoAlvo)
        .split(/[,;]/)
        .map((s) => s.trim().split(' ')[0])
        .filter((t) => t.length > 3)
    : [];
  const semPromessa =
    !hs.temNumero &&
    termosPublico.length > 0 &&
    !termosPublico.some((t) => normalizar(headline).includes(t));
  if (semPromessa) problemas.push('Sem resultado observável nem público nomeado na headline');
  // Pesos documentados: clichê -3; curta -2; sem separador -1; sem promessa -1. Teto 8.
  const nota = Math.max(
    1,
    Math.min(
      8,
      8 -
        hs.cliches.length * 3 -
        (hs.tamanho < 20 ? 2 : 0) -
        (!hs.temNumero && !/[|·-]/.test(headline) ? 1 : 0) -
        (semPromessa ? 1 : 0),
    ),
  );
  return dimensao('D2', nota, 'Alta', evidenciasLimitadas(hs.primeiros140), problemas);
}

function avaliarD3(sobre: string): Dimensao {
  const ss = estatisticas(sobre);
  if (ss.tamanho < 50) {
    return dimensao(
      'D3',
      null,
      'Baixa',
      [],
      [],
      'Sem texto da seção Sobre para avaliação observável',
    );
  }
  const problemas: string[] = [];
  if (ss.paragrafos < 2 && !ss.bullets) {
    problemas.push('Bloco corrido, sem escaneabilidade observável');
  }
  if (!ss.temCta) problemas.push('Sem CTA único observável');
  return dimensao(
    'D3',
    Math.max(1, 8 - problemas.length * 2),
    ss.tamanho > 300 ? 'Alta' : 'Média',
    evidenciasLimitadas(sobre.slice(0, 140)),
    problemas,
  );
}

function avaliarD4(posts: string[]): Dimensao {
  if (!posts.length) {
    return dimensao('D4', null, 'Baixa', [], [], 'Sem posts na entrada');
  }
  const stats = posts.map(estatisticas);
  const comExperiencia = posts.filter((p, i) => stats[i].temNumero || RE_EXPERIENCIA_VIVIDA.test(p));
  const problemas: string[] = [];
  if (comExperiencia.length < posts.length) {
    problemas.push(
      `${posts.length - comExperiencia.length}/${posts.length} posts sem experiência própria, dado ou método observável`,
    );
  }
  return dimensao(
    'D4',
    Math.round(3 + (comExperiencia.length / posts.length) * 5),
    comExperiencia.length ? 'Alta' : 'Baixa',
    evidenciasLimitadas(...posts.map((p, i) => `post${i + 1}: ${p.slice(0, 100)}`)),
    problemas,
  );
}

function avaliarD5(sobre: string, posts: string[]): Dimensao {
  if (!posts.length) {
    return dimensao('D5', null, 'Baixa', [], [], 'Sem posts para detectar recorrência');
  }
  const frequentes = termosFrequentes([sobre, ...posts], 12);
  const temas = frequentes.filter(([, n]) => n >= 2).map(([w]) => w);
  const problemas: string[] = [];
  if (temas.length < 2) {
    problemas.push('Recorrência temática fraca: menos de 2 termos repetidos no corpus');
  }
  return dimensao(
    'D5',
    Math.min(9, 3 + temas.length),
    temas.length >= 2 ? 'Alta' : 'Média',
    evidenciasLimitadas(...temas.slice(0, 4).map((t) => `termo recorrente: "${t}"`)),
    problemas,
  );
}

function avaliarD6(posts: string[]): Dimensao {
  if (!posts.length) {
    return dimensao('D6', null, 'Baixa', [], [], 'Sem posts na entrada');
  }
  const stats = posts.map(estatisticas);
  let fracos = 0;
  const problemas: string[] = [];
  stats.forEach((s, i) => {
    if (
      !s.temNumero &&
      !s.abertura.includes('?') &&
      s.abertura.length < 140 &&
      /^(algumas|muita gente|erros que|reflexões)/i.test(s.abertura)
    ) {
      problemas.push(`post${i + 1} abre genérico`);
      fracos += 1;
    }
    if (s.temLink) {
      problemas.push(`post${i + 1} com link no corpo`);
      fracos += 1;
    }
    if (s.hashtags.length > 2) {
      problemas.push(`post${i + 1} com ${s.hashtags.length} hashtags`);
      fracos += 1;
    }
    if (s.temIsca) {
      problemas.push('post{i + 1} com isca ("o que acham?")'.replace('{i + 1}', String(i + 1)));
      fracos += 1;
    }
  });
  return dimensao(
    'D6',
    Math.max(1, 9 - fracos * 2),
    'Alta',
    evidenciasLimitadas(
      ...stats.map((s, i) => `post${i + 1} abertura: "${s.abertura.slice(0, 100)}"`),
    ),
    problemas.slice(0, 4),
  );
}

function avaliarD7(posts: string[]): Dimensao {
  if (posts.length < 2) {
    return dimensao(
      'D7',
      null,
      'Baixa',
      [],
      [],
      '1 post só: diversidade de formatos não avaliável',
    );
  }
  const stats = posts.map(estatisticas);
  const moldes = new Set(
    stats.map((s) =>
      [s.temNumero ? 'n' : '', s.temPergunta ? 'q' : '', s.bullets ? 'b' : '', s.hashtags.length ? 'h' : ''].join(''),
    ),
  );
  const problemas: string[] = [];
  if (moldes.size <= 1 && posts.length > 1) {
    problemas.push('Mesmo molde observável em todos os posts');
  }
  return dimensao(
    'D7',
    Math.min(8, 3 + moldes.size * 2),
    'Média',
    evidenciasLimitadas(
      `moldes distintos observáveis: ${moldes.size}`,
      ...posts.map((p, i) => `post${i + 1}: ${p.length} chars, ${stats[i].paragrafos} parágrafos`),
    ).slice(0, 4),
    problemas,
  );
}

function variantesDoTermo(termo: string): Set<string> {
  const base = radicalizar(termo);
  const variantes = new Set<string>([base]);
  if (base.length > 5) {
    variantes.add(`${base}a`);
    variantes.add(`${base}o`);
    if (/[ao]$/.test(base)) variantes.add(base.slice(0, -1));
  }
  return variantes;
}

function avaliarD8(sobre: string, posts: string[], publicoAlvo?: string): Dimensao {
  const termos = publicoAlvo
    ? normalizar(publicoAlvo)
        .split(/[,;]/)
        .map((s) => s.trim().split(' ')[0])
        .filter((t) => t.length > 3)
    : [];
  const corpus = new Set(
    normalizar(`${posts.join(' ')} ${sobre}`)
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .map(radicalizar),
  );
  const acertos = termos.filter((t) => [...variantesDoTermo(t)].some((v) => corpus.has(v)));
  if (!posts.length && !sobre) {
    return dimensao('D8', null, 'Baixa', [], [], 'Sem conteúdo para comparar ao público');
  }
  const problemas: string[] = [];
  if (termos.length && !acertos.length) {
    problemas.push('Vocabulário do público-alvo ausente no conteúdo observável');
  }
  return dimensao(
    'D8',
    termos.length ? Math.min(9, 3 + acertos.length * 2) : 4,
    acertos.length >= 2 ? 'Alta' : acertos.length ? 'Média' : 'Baixa',
    evidenciasLimitadas(...acertos.slice(0, 3).map((h) => `termo do público no conteúdo: "${h}"`)),
    problemas,
  );
}

/** Ordenação por impacto comercial: quem compra primeiro, base por último. */
const ORDEM_IMPACTO: Record<DimensaoId, number> = {
  D8: 0,
  D1: 1,
  D2: 2,
  D6: 3,
  D4: 4,
  D5: 5,
  D3: 6,
  D7: 7,
};

/**
 * Diagnóstico completo a partir de texto colado.
 * Nunca cria fatos: hooks citam fragmentos reais; lacunas usam [A CONFIRMAR].
 */
export function analisarAutoridadeLinkedin(entrada: EntradaLinkedin): ResultadoDiagnostico {
  const brutos = entrada.posts ?? [];
  const posts = brutos.map((p) => String(p ?? '').trim()).filter(Boolean);
  const headline = String(entrada.headline ?? '');
  const sobre = String(entrada.sobre ?? '');

  const dims: Dimensao[] = [
    avaliarD1(entrada, headline, sobre),
    avaliarD2(headline, entrada.publico_alvo),
    avaliarD3(sobre),
    avaliarD4(posts),
    avaliarD5(sobre, posts),
    avaliarD6(posts),
    avaliarD7(posts),
    avaliarD8(sobre, posts, entrada.publico_alvo),
  ];

  const avaliadas = dims.filter((d) => d.nota !== null);
  const media = avaliadas.length
    ? Math.round((avaliadas.reduce((a, d) => a + (d.nota ?? 0), 0) / avaliadas.length) * 10) / 10
    : null;

  const principais = termosFrequentes([sobre, ...posts], 6).map(([w]) => w);
  const publicoCurto = entrada.publico_alvo ? entrada.publico_alvo.split(',')[0].trim() : null;

  const headlineSugerida = [
    entrada.cargo,
    entrada.segmento,
    principais.slice(0, 2).join(' e ') || null,
    publicoCurto ? `para ${publicoCurto}` : null,
    '[A CONFIRMAR: resultado verificável]',
  ]
    .filter(Boolean)
    .join(' | ');

  const pilares: Pilar[] = principais.slice(0, 3).map((t) => ({
    nome: t,
    justificativa: `termo recorrente no corpus (${t})`,
  }));

  const statsPosts = posts.map(estatisticas);
  const hooks: HookSugerido[] = posts.map((post, i) => {
    const s = statsPosts[i];
    const frases = String(post)
      .split(/(?<=[.!?])\s+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const comDado = frases.find((f) => RE_NUMERO.test(f));
    const cortes = [
      s.temLink ? 'link no corpo (mover p/ comentário)' : null,
      s.hashtags.length > 2 ? `${s.hashtags.length} hashtags` : null,
      s.temIsca ? 'isca "o que acham?"' : null,
    ].filter((x): x is string => Boolean(x));
    const abertura = (comDado ?? frases[0] ?? '').slice(0, 140);
    return {
      para_post: i + 1,
      hook: abertura
        ? `“${abertura}”${cortes.length ? ` — corte: ${cortes.join('; ')}` : ''}`
        : 'Hook [A CONFIRMAR: conteúdo do post]',
      porque: comDado
        ? 'dado que já está no texto, movido para a abertura'
        : 'primeira frase da entrada como abertura + cortes observáveis',
    };
  });

  const problemasGerais = dims
    .flatMap((d) => d.problemas.map((p) => ({ ordem: ORDEM_IMPACTO[d.id] ?? 9, texto: `${d.id}: ${p}` })))
    .sort((a, b) => a.ordem - b.ordem)
    .map((x) => x.texto);

  return {
    media,
    dims,
    headline_sugerida: headlineSugerida,
    pilares,
    hooks,
    problemas_gerais: problemasGerais,
    missings: dims
      .filter((d) => d.nota === null)
      .map((d) => `${d.id}: ${d.nao_avaliavel_motivo}`),
  };
}

/** Prioridades de 30 dias: regras fixas por nota (sem invenção). */
export function prioridades30Dias(resultado: ResultadoDiagnostico): string[] {
  const porId = Object.fromEntries(resultado.dims.map((d) => [d.id, d]));
  const saida: string[] = [];
  if ((porId.D2?.nota ?? 9) < 6) {
    saida.push('Reescrever headline a partir de cargo + segmento + [A CONFIRMAR: resultado verificável]');
  }
  if ((porId.D3?.nota ?? 9) < 6) {
    saida.push(
      porId.D3.nota === null
        ? 'Criar seção Sobre escaneável [A CONFIRMAR: trajetória, prova e CTA]'
        : 'Reescrever Sobre em blocos curtos com 1 CTA único',
    );
  }
  if ((porId.D6?.nota ?? 9) < 6) {
    saida.push('Reabrir posts com cena/tese específica; remover link do corpo e excesso de hashtags');
  }
  if ((porId.D8?.nota ?? 9) < 6) {
    saida.push('Redirecionar perguntas ao decisor [A CONFIRMAR: pauta de compra do público-alvo]');
  }
  while (saida.length < 3) {
    saida.push('Nomear 2–3 pilares no perfil a partir dos termos recorrentes detectados');
  }
  return saida.slice(0, 4);
}
