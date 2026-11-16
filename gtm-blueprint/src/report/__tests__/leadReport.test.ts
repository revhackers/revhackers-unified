// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { runGtmPipeline, type PipelineInput, type PipelineOutput } from '../../pipeline.js';
import { fakeLlm } from '../../prompts/__tests__/fixtures/fakeLlm.js';
import type { DossierOutput } from '../../prompts/dossier.js';
import { buildLeadReport } from '../viewModel.js';
import { renderLeadReportMarkdown } from '../markdown.js';

// Texto acima de 1500 caracteres: a home não cai no caminho de render (que não existe nos testes).
const HOME_TEXT = 'Acme automatiza prospecção B2B para times comerciais com cadências multicanal e dados de decisores. '.repeat(25);
const HOME_HTML = `<html><body>${HOME_TEXT}</body></html>`;

const fetchAcme = (async (input: string | URL | Request) => {
  if (String(input) !== 'https://acme.test') throw new TypeError('fetch failed');
  return new Response(HOME_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
}) as unknown as typeof fetch;

const BASE: Omit<PipelineInput, 'providers'> = {
  companyName: 'Acme',
  websiteUrl: 'https://acme.test',
  declaredPhase: 'Primeira Tração Validada',
  competitors: [],
};

/** Pipeline completo com provedor falso e fetch fixo, executado uma vez: a saída é só lida pelos testes. */
let execucao: Promise<PipelineOutput> | undefined;
function executar(): Promise<PipelineOutput> {
  execucao ??= runGtmPipeline({ ...BASE, providers: { bedrock: fakeLlm().provider } }, { collect: { fetch: fetchAcme } });
  return execucao;
}

describe('buildLeadReport', () => {
  it('com só a coleta: uma etapa concluída, sem tese e todas as seções pendentes', async () => {
    const out = await executar();

    const report = buildLeadReport({ input: BASE, collect: out.collect, modules: {}, failed: [] });

    expect(report.progresso).toEqual({ concluidas: 1, total: 10, etapaAtual: 'Dossiê estratégico' });
    expect(report.tese).toBeNull();
    expect(report.secoes.every((s) => s.status === 'pendente')).toBe(true);
  });

  it('com o pipeline completo: tese, 3 achados, 3 ondas e todas as seções prontas', async () => {
    const out = await executar();

    const report = buildLeadReport({ input: BASE, collect: out.collect, dossier: out.dossier, modules: out.modules, failed: [] });

    expect(report.progresso).toEqual({ concluidas: 10, total: 10, etapaAtual: null });
    expect(report.tese).toBe('Tese de teste para o dossiê.');
    expect(report.decisaoDaSemana).toBe('Decisão de teste.');
    expect(report.achados).toHaveLength(3);
    expect(report.achados[0]?.base.tipo).toBe('HIPOTESE');
    expect(report.plano90Dias.map((o) => o.rotulo)).toEqual(['Dias 1–30 · Fundação', 'Dias 31–60 · Tração', 'Dias 61–90 · Escala']);
    expect(report.plano90Dias[0]?.foco.tipo).toBe('RECOMENDACAO');
    expect(report.secoes.every((s) => s.status === 'pronto')).toBe(true);
    expect(report.dadosAColetar).toContain('Extrato de vendas do ERP');
    expect(report.dadosAColetar).toContain('Dado para unit economics: CAC');
  });

  it('módulo que falhou vira seção indisponível e não bloqueia as demais', async () => {
    const out = await executar();

    const report = buildLeadReport({
      input: BASE,
      collect: out.collect,
      dossier: out.dossier,
      modules: { ...out.modules, motor_demanda: undefined },
      failed: ['motor_demanda'],
    });

    expect(report.secoes.find((s) => s.id === 'motor_demanda')).toMatchObject({ status: 'indisponivel', blocos: [] });
    expect(report.secoes.find((s) => s.id === 'funil_revops')?.status).toBe('pronto');
    expect(report.progresso.concluidas).toBe(9);
  });

  it('ICP declarado divergente dos clientes entra como contradição com o como validar', async () => {
    const out = await executar();
    const dossier: DossierOutput = {
      ...out.dossier,
      icpDeclaradoVsClientes: {
        ...out.dossier.icpDeclaradoVsClientes,
        alinhamento: 'DIVERGENTE',
        leitura: { text: 'Clientes de educação contra ICP SaaS.', status: 'HIPOTESE', evidenceIds: [], howToValidate: 'Confirmar o setor dos clientes.' },
      },
    };

    const report = buildLeadReport({ input: BASE, collect: out.collect, dossier, modules: out.modules, failed: [] });

    expect(report.contradicoes[0]).toEqual({
      tipo: 'HIPOTESE',
      texto: 'Clientes de educação contra ICP SaaS.',
      fontes: [],
      comoValidar: 'Confirmar o setor dos clientes.',
    });
  });

  it('o markdown segue a ordem da página: tese, plano por onda e aprofundamento', async () => {
    const out = await executar();
    const report = buildLeadReport({ input: BASE, collect: out.collect, dossier: out.dossier, modules: out.modules, failed: [] });

    const md = renderLeadReportMarkdown(report);

    expect(md.indexOf('## Tese')).toBeLessThan(md.indexOf('## Plano de 90 dias'));
    expect(md.indexOf('## Plano de 90 dias')).toBeLessThan(md.indexOf('## Aprofundar'));
    expect(md).toContain('### Dias 61–90 · Escala');
    expect(md).toContain('| Iniciativa | ICE | Impacto |');
  });
});
