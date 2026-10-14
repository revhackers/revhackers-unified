/**
 * Testes do motor observável LinkedIn (modo determinístico, sem LLM).
 * Revalidam no app as garantias do MVP: N/A, anti-invenção, [A CONFIRMAR],
 * fragmentos reais nos hooks, teto D2 e ordem comercial dos problemas.
 */
import { describe, expect, it } from 'vitest';
import {
  analisarAutoridadeLinkedin,
  detectarCliches,
  faixaDaMedia,
  prioridades30Dias,
} from './linkedinAuthorityEngine';

const SOBRE_LONGO =
  'Texto-base com mais de cinquenta caracteres para avaliação observável do perfil. ' +
  'Segunda frase com CTA: me chama no inbox para conversar.';

describe('N/A com motivo (ausência de dados, nunca inferência)', () => {
  it('D3 é N/A quando falta Sobre', () => {
    const r = analisarAutoridadeLinkedin({
      headline: 'Vendedor',
      posts: ['Dicas de vendas: acredite no processo e documente cada conversa com o cliente.'],
    });
    const d3 = r.dims.find((d) => d.id === 'D3');
    expect(d3?.nota).toBeNull();
    expect(d3?.nao_avaliavel_motivo).toMatch(/Sobre/i);
  });

  it('D4, D5, D6 e D7 são N/A sem posts', () => {
    const r = analisarAutoridadeLinkedin({
      headline: 'CEO | Logística',
      sobre: SOBRE_LONGO,
    });
    for (const id of ['D4', 'D5', 'D6', 'D7']) {
      const d = r.dims.find((x) => x.id === id);
      expect(d?.nota, id).toBeNull();
    }
    expect(r.missings.length).toBeGreaterThan(0);
  });

  it('D2 é N/A sem headline', () => {
    const r = analisarAutoridadeLinkedin({
      sobre: SOBRE_LONGO,
      posts: ['Eu liderei a renegociação de fretes e reduzi 12% do custo por rota no trimestre.'],
    });
    expect(r.dims.find((d) => d.id === 'D2')?.nota).toBeNull();
  });

  it('média exclui N/A', () => {
    const r = analisarAutoridadeLinkedin({
      headline: 'Vendedor na Empresa Exemplo LTDA',
      posts: ['Dicas de vendas: acredite no seu produto e o cliente acredita em você.'],
    });
    const avaliadas = r.dims.filter((d) => d.nota !== null);
    expect(avaliadas.length).toBeLessThan(8);
    expect(r.media).not.toBeNull();
    expect(r.missings.length).toBeGreaterThan(0);
  });
});

describe('anti-invenção: nenhum número fora da entrada', () => {
  const casos = [
    {
      headline: 'CEO na Transportadora Fictícia S.A. | Logística e gestão de frotas',
      sobre: `${SOBRE_LONGO} Atendo embarcadores industriais com 40 carretas próprias.`,
      posts: [
        'Erros que vejo todo dia na gestão de frotas. Primeiro: ninguém mede o custo por entrega por rota, só olham o total do mês. Eu montei uma planilha que cortou 12% do custo em 90 dias.',
        'Manutenção preventiva vira promessa e o caminhão quebra na estrada. Visitei 5 garagens em SP e documentei o checklist que usamos hoje.',
      ],
    },
    {
      headline: 'Founder @ Pipeline Fictícia SaaS | Revenue e forecast para SaaS',
      sobre: `${SOBRE_LONGO} Trabalho com 30 operações de inside sales.`,
      posts: [
        'Nosso forecast parou de oscilar quando passei a revisar 100% dos deals acima de R$ 20 mil toda sexta. Eu acompanhei 3 trimestres seguidos.',
        'Pergunta genuína para diretores comerciais: qual parte do seu pipeline você revisa semanalmente com o time?',
      ],
    },
  ];

  for (const [i, c] of casos.entries()) {
    it(`caso ${i + 1}: saída sem números inventados`, () => {
      const r = analisarAutoridadeLinkedin(c);
      const saida = JSON.stringify(r)
        .replace(/\d+ chars?, \d+ parágrafos?/g, '')
        .replace(/moldes distintos observáveis: \d+/, '');
      const numsOut = new Set(saida.match(/\d[\d.,]*%?/g) ?? []);
      const numsIn = new Set(JSON.stringify(c).match(/\d[\d.,]*%?/g) ?? []);
      const permitidos = new Set(['140', '30', '4']);
      for (const n of numsOut) {
        const simples = n.replace(/[.,%]/g, '');
        const ehNota = /^[0-9](\.[05])?$/.test(n) || /^[0-9]{1,2}$/.test(simples);
        if (!numsIn.has(n) && !permitidos.has(n) && !permitidos.has(simples) && !ehNota) {
          throw new Error(`número suspeito "${n}" fora da entrada`);
        }
      }
    });
  }

  it('headline sugerida e prioridades carregam [A CONFIRMAR]', () => {
    const r = analisarAutoridadeLinkedin({
      headline: 'CEO | Logística',
      sobre: SOBRE_LONGO,
      posts: ['Eu montei o checklist de manutenção que cortou 12% das quebras em 90 dias.'],
    });
    expect(r.headline_sugerida).toMatch(/\[A CONFIRMAR/);
    expect(prioridades30Dias(r).join(' ').length).toBeGreaterThan(0);
  });

  it('hooks citam fragmentos reais da entrada', () => {
    const posts = [
      'Eu montei o checklist de manutenção que cortou 12% das quebras em 90 dias. Antes disso, o caminhão quebrava na estrada toda semana.',
      'Reflexão honesta sobre gestão de frotas e o custo por entrega que ninguém mede direito na operação.',
    ];
    const r = analisarAutoridadeLinkedin({ headline: 'CEO | Logística', sobre: SOBRE_LONGO, posts });
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    r.hooks.forEach((h, i) => {
      const citado = (h.hook.match(/“([^”]+)”/) ?? [])[1] ?? '';
      const aderente = citado !== '' && norm(posts[i]).includes(norm(citado).slice(0, 40));
      expect(aderente || /\[A CONFIRMAR/.test(h.hook), `hook sem lastro (post ${i + 1})`).toBe(true);
    });
  });
});

describe('regras da rubrica v3', () => {
  it('clichê flexionado derruba D2; controle negativo fica limpo', () => {
    expect(detectarCliches('Ajudamos empresas a vender mais')).toEqual(['ajudo empresas a…']);
    expect(detectarCliches('Somos apaixonados por logística')).toEqual(['apaixonado(a) por']);
    expect(detectarCliches('Ajudo minha equipe a priorizar o backlog')).toEqual([]);
    expect(detectarCliches('CEO na Transportadora Fictícia S.A. | Logística')).toEqual([]);
    const r = analisarAutoridadeLinkedin({
      headline: 'CEO @ Pipeline Fictícia SaaS | Ajudamos empresas a vender mais',
      sobre: SOBRE_LONGO,
    });
    expect(r.dims.find((d) => d.id === 'D2')?.nota ?? 9).toBeLessThanOrEqual(5);
  });

  it('D2 tem teto 8 mesmo com headline forte', () => {
    const r = analisarAutoridadeLinkedin({
      headline: 'CEO na Transportadora Fictícia | Reduzi 12% do custo por rota para embarcadores industriais',
      sobre: SOBRE_LONGO,
      publico_alvo: 'embarcadores industriais',
    });
    const d2 = r.dims.find((d) => d.id === 'D2')?.nota ?? 0;
    expect(d2).toBeLessThanOrEqual(8);
  });

  it('D8 casa diretora/diretor por stemming mínimo', () => {
    const r = analisarAutoridadeLinkedin({
      headline: 'Consultor | Operações',
      sobre: `${SOBRE_LONGO} Conteúdo semanal para diretoras de operações e logística.`,
      posts: [
        'Diretores me perguntam onde o custo por entrega vaza. Eu visitei 5 operações e documentei os 3 pontos que mais pesam na planilha.',
        'Segunda visita a uma operação de diretores regionais: o checklist de docas que eu montei reduziu a fila em 2 horas por dia.',
      ],
      publico_alvo: 'diretoras',
    });
    expect(r.dims.find((d) => d.id === 'D8')?.nota ?? 0).toBeGreaterThanOrEqual(5);
  });

  it('pilares nunca usam termos metalinguísticos', () => {
    const r = analisarAutoridadeLinkedin({
      headline: 'CEO | Logística',
      sobre: `${SOBRE_LONGO} Rotina de frotas, manutenção preventiva e custo por rota.`,
      posts: [
        'Rotina de frotas: eu montei o checklist de manutenção preventiva que cortou o custo por rota em 12%.',
        'Custo por rota e manutenção preventiva: visitei 5 garagens e documentei a rotina de frotas que funciona.',
      ],
    });
    for (const p of r.pilares) {
      expect(p.nome).not.toMatch(/exemplo|fictici|teste|empresa/i);
    }
  });

  it('problemas ordenados por impacto comercial (D8 antes de D3)', () => {
    const r = analisarAutoridadeLinkedin({
      headline: 'Vendedor',
      sobre: 'Texto com mais de cinquenta caracteres para passar do mínimo exigido aqui.',
      posts: ['Post com link http://exemplo.com e #a #b #c com mais de vinte caracteres.'],
      publico_alvo: 'Diretores',
    });
    const ids = r.problemas_gerais.map((p) => p.split(':')[0]);
    expect(ids.indexOf('D8')).toBeLessThan(ids.indexOf('D3'));
  });

  it('faixas da média seguem as bandas da rubrica', () => {
    expect(faixaDaMedia(null)).toBe('sem material suficiente');
    expect(faixaDaMedia(2)).toBe('fundação ausente');
    expect(faixaDaMedia(5)).toBe('base com vazamentos');
    expect(faixaDaMedia(7)).toBe('autoridade funcional');
    expect(faixaDaMedia(9)).toBe('referência do nicho');
  });
});
