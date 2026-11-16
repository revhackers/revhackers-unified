import { describe, it, expect } from 'vitest';
import { criticPromptSpec, CriticOutputSchema, renderCriticPayloadJson, type CriticInput } from '../critic.js';

const CLAIM_TEXT = 'Equipes de vendas B2B com CRM e cadência semanal de prospecção precisam de evidência de conversão por canal antes de escalar o investimento.';
const LONG_SOURCE = Array.from({ length: 170 }, (_, i) => `Linha ${i} sobre pipeline B2B e CRM com texto integral da página.`).join('\n');
const UNIQUE_SOURCE = `Página distinta do concorrente.\n${LONG_SOURCE}`;
const ERROR_PAGE = 'Oops! Página não encontrada. '.repeat(30);
const FETCHED_AT = '2026-11-14T00:00:00.000Z';

const FIXTURE: CriticInput = {
  dossier: {
    resumo: CLAIM_TEXT,
    objecaoPrincipal: { text: CLAIM_TEXT, status: 'VERIFICADO', evidenceIds: ['E1'], howToValidate: 'Conferir E1 e E4.' },
    fonteCitada: LONG_SOURCE,
    lista: [CLAIM_TEXT, 'curto', 'curto', 7, true, null, [], {}],
    objetoUsuario: { ref: 'valor do usuário' },
    semValor: undefined,
    naoNumero: Number.NaN,
    infinito: Number.POSITIVE_INFINITY,
    menosZero: -0,
  },
  modules: {
    funil: { texto: CLAIM_TEXT, tags: ['b2b', 'b2b'], nota: 8.5 },
    fonte: LONG_SOURCE,
  },
  evidences: [
    { id: 'E1', kind: 'site', source: 'https://exemplo.com.br', fetchedAt: FETCHED_AT, content: LONG_SOURCE },
    { id: 'E2', kind: 'site', source: 'https://exemplo.com.br/pricing', fetchedAt: FETCHED_AT, content: ERROR_PAGE },
    { id: 'E3', kind: 'site', source: 'https://exemplo.com.br/precos', fetchedAt: FETCHED_AT, content: ERROR_PAGE },
    { id: 'E4', kind: 'competitor_site', source: 'https://concorrente.com.br', fetchedAt: FETCHED_AT, content: UNIQUE_SOURCE },
  ],
};

const NAO_JSON_VALUES = new Map<string, unknown>([
  ['undefined', undefined],
  ['NaN', Number.NaN],
  ['Infinity', Number.POSITIVE_INFINITY],
  ['-Infinity', Number.NEGATIVE_INFINITY],
  ['-0', -0],
]);

// Resolve as referências da tabela e os marcadores $nao_json de volta ao valor original.
function decode(node: unknown, table: Record<string, string>): unknown {
  if (Array.isArray(node)) {
    const items: unknown[] = node;
    return items.map((item) => decode(item, table));
  }
  if (node === null || typeof node !== 'object') return node;
  const record = node as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 1 && keys[0] === '$ref') {
    const id = record['$ref'];
    if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(table, id)) {
      throw new Error(`ref sem entrada na tabela: ${String(id)}`);
    }
    return table[id];
  }
  if (keys.length === 1 && keys[0] === '$nao_json') {
    const tag = record['$nao_json'];
    if (typeof tag !== 'string' || !NAO_JSON_VALUES.has(tag)) {
      throw new Error(`marcador $nao_json desconhecido: ${String(tag)}`);
    }
    return NAO_JSON_VALUES.get(tag);
  }
  const out: Record<string, unknown> = {};
  for (const key of keys) out[key] = decode(record[key], table);
  return out;
}

function parseTable(raw: string): Record<string, string> {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return parsed['textosRepetidos'] as Record<string, string>;
}

describe('renderCriticPayloadJson', () => {
  it('produces one JSON object with the table and the three input sections', () => {
    const parsed = JSON.parse(renderCriticPayloadJson(FIXTURE)) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(['textosRepetidos', 'dossier', 'modules', 'evidences']);
  });

  it('resolving table refs reproduces the input exactly', () => {
    const raw = renderCriticPayloadJson(FIXTURE);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const body = { dossier: parsed['dossier'], modules: parsed['modules'], evidences: parsed['evidences'] };
    expect(decode(body, parseTable(raw))).toStrictEqual({
      dossier: FIXTURE.dossier,
      modules: FIXTURE.modules,
      evidences: FIXTURE.evidences,
    });
  });

  it('stores each repeated text once and keeps the >8000-char source intact in the table', () => {
    const raw = renderCriticPayloadJson(FIXTURE);
    const table = parseTable(raw);
    expect(LONG_SOURCE.length).toBeGreaterThan(8000);
    expect(raw.split(JSON.stringify(LONG_SOURCE)).length - 1).toBe(1);
    expect(raw.split(JSON.stringify(ERROR_PAGE)).length - 1).toBe(1);
    expect(raw.split(JSON.stringify(CLAIM_TEXT)).length - 1).toBe(1);
    expect(Object.values(table)).toContain(LONG_SOURCE);
    expect(Object.values(table)).toContain(ERROR_PAGE);
  });

  it('keeps a non-repeated long source inline and intact', () => {
    const raw = renderCriticPayloadJson(FIXTURE);
    expect(UNIQUE_SOURCE.length).toBeGreaterThan(8000);
    expect(raw).toContain(JSON.stringify(UNIQUE_SOURCE));
    expect(Object.values(parseTable(raw))).not.toContain(UNIQUE_SOURCE);
  });

  it('keeps user objects with a plain ref key untouched', () => {
    const parsed = JSON.parse(renderCriticPayloadJson(FIXTURE)) as { dossier: Record<string, unknown> };
    expect(parsed.dossier['objetoUsuario']).toEqual({ ref: 'valor do usuário' });
  });

  it('marks values without JSON representation instead of dropping them', () => {
    const raw = renderCriticPayloadJson(FIXTURE);
    expect(raw).toContain('{"$nao_json":"undefined"}');
    expect(raw).toContain('{"$nao_json":"NaN"}');
    expect(raw).toContain('{"$nao_json":"Infinity"}');
    expect(raw).toContain('{"$nao_json":"-0"}');

    const exotic = renderCriticPayloadJson({
      dossier: { f: () => 1, s: Symbol('x') },
      modules: {},
      evidences: [],
    });
    const parsed = JSON.parse(exotic) as Record<string, unknown>;
    expect(parsed['dossier']).toEqual({ f: { $nao_json: 'function' }, s: { $nao_json: 'symbol' } });
  });

  it('fails closed when the input uses reserved marker keys', () => {
    expect(() => renderCriticPayloadJson({ ...FIXTURE, dossier: { $ref: 's1' } })).toThrow();
    expect(() => renderCriticPayloadJson({ ...FIXTURE, modules: { x: [{ $nao_json: 'NaN' }] } })).toThrow();
  });
});

describe('criticPromptSpec', () => {
  it('keeps the critic identity and output schema', () => {
    expect(criticPromptSpec.id).toBe('critic.audit');
    expect(criticPromptSpec.task).toBe('critic');
    expect(criticPromptSpec.schema).toBe(CriticOutputSchema);
  });

  it('buildUser embeds the payload exactly once', () => {
    const payload = renderCriticPayloadJson(FIXTURE);
    const user = criticPromptSpec.buildUser(FIXTURE);
    expect(user.split(payload).length - 1).toBe(1);
  });
});

describe('CriticOutputSchema', () => {
  it('accepts a grouped issue and rejects an unknown approval verdict', () => {
    const valid = {
      issuesFound: [{
        locationPath: 'modules.funil.texto | dossier.resumo',
        tipoProblema: 'Número inventado / sem fonte',
        descricao: 'Número sem correspondência nas evidências.',
        severidade: 'ALTA',
        sugestaoCorrecao: 'Remover o número ou ligá-lo a evidência.',
      }],
      rubricaQualidade0a10: {
        especificidadeB2B: 5,
        rigorEvidenciaEpistemica: 5,
        coerenciaNarrativa: 5,
        acionabilidadePragmatica: 5,
        scoreGeralMedio: 5,
      },
      parecerFinalAprovacao: 'REQUER AJUSTES',
    };
    expect(CriticOutputSchema.safeParse(valid).success).toBe(true);
    expect(CriticOutputSchema.safeParse({ ...valid, parecerFinalAprovacao: 'TALVEZ' }).success).toBe(false);
  });
});
