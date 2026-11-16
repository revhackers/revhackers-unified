import { describe, it, expect } from 'vitest';
import { verifyExtract, type ExtractOutput } from '../extract.js';

const CONTENT = 'Plano Pro por R$ 490/mês com suporte dedicado. O botão “Começar agora” leva ao cadastro.';

function extract(overrides: Partial<ExtractOutput> = {}): ExtractOutput {
  return {
    url: 'https://acme.test',
    propostaValorDeclarada: null,
    icpDeclarado: null,
    produtosPlanosPrecos: [],
    provasSociais: [],
    ctasConversao: [],
    sinaisMaturidade: [],
    lacunasOuInconsistencias: [],
    ...overrides,
  };
}

describe('verifyExtract', () => {
  it('mantém itens cuja citação aparece literalmente no conteúdo', () => {
    const input = extract({
      produtosPlanosPrecos: [{ nomePlano: 'Pro', precoStr: 'R$ 490/mês', features: ['suporte'], quote: 'Plano Pro por R$ 490/mês' }],
    });
    const { extract: out, dropped } = verifyExtract(input, CONTENT);

    expect(out.produtosPlanosPrecos).toHaveLength(1);
    expect(dropped).toBe(0);
  });

  it('descarta item cuja citação não está no conteúdo e conta o descarte', () => {
    const input = extract({
      provasSociais: [
        { tipo: 'depoimento', descricao: 'Cliente X', quote: 'A Beta triplicou reuniões' },
        { tipo: 'metrica_citada', descricao: 'Suporte', quote: 'suporte dedicado' },
      ],
    });
    const { extract: out, dropped } = verifyExtract(input, CONTENT);

    expect(out.provasSociais.map((p) => p.descricao)).toEqual(['Suporte']);
    expect(dropped).toBe(1);
  });

  it('compara aspas tipográficas e espaços repetidos com o conteúdo, sem diferenciar maiúsculas', () => {
    const input = extract({
      ctasConversao: [{ textoBotao: 'Começar agora', quote: 'o botão "Começar   agora" leva ao cadastro.' }],
    });
    const { extract: out, dropped } = verifyExtract(input, CONTENT);

    expect(out.ctasConversao).toHaveLength(1);
    expect(dropped).toBe(0);
  });

  it('campo único com citação inválida vira null', () => {
    const input = extract({
      icpDeclarado: { publicoAlvo: 'Times de vendas enterprise', quote: 'Feito para times de vendas enterprise' },
      propostaValorDeclarada: { resumo: 'Automação de vendas', quote: 'Plano Pro' },
    });
    const { extract: out, dropped } = verifyExtract(input, CONTENT);

    expect(out.icpDeclarado).toBeNull();
    expect(out.propostaValorDeclarada?.resumo).toBe('Automação de vendas');
    expect(dropped).toBe(1);
  });

  it('nunca aceita citação vazia', () => {
    const input = extract({ provasSociais: [{ tipo: 'logo', descricao: 'Logo', quote: '' }] });
    const { extract: out, dropped } = verifyExtract(input, CONTENT);

    expect(out.provasSociais).toEqual([]);
    expect(dropped).toBe(1);
  });
});
