// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runGtmPipeline, SITE_INACESSIVEL, type PipelineInput } from '../../pipeline.js';
import { criticWith, fakeLlm } from './fixtures/fakeLlm.js';

// Texto acima de 1500 caracteres: a home não cai no caminho de render (que não existe nos testes).
const HOME_TEXT = 'Acme automatiza prospecção B2B para times comerciais com cadências multicanal e dados de decisores. '.repeat(25);
const HOME_HTML = `<html><body>${HOME_TEXT}</body></html>`;

/** fetch global falso: URLs fora do mapa falham como erro de rede. */
function stubFetch(pages: Record<string, string>): void {
  vi.stubGlobal('fetch', (async (input: string | URL | Request) => {
    const body = pages[String(input)];
    if (body === undefined) throw new TypeError('fetch failed');
    return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
  }) as unknown as typeof fetch);
}

const BASE: Omit<PipelineInput, 'providers'> = {
  companyName: 'Acme',
  websiteUrl: 'https://acme.test',
  declaredPhase: 'Primeira Tração Validada',
  competitors: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('runGtmPipeline', () => {
  it('entrega o parecer do crítico sem as travas de evidência e de número', async () => {
    stubFetch({ 'https://acme.test': HOME_HTML });
    // Texto com números que a guarda reprovaria (faixa sem fonte e LTV sem fonte): o crítico deve devolvê-lo intacto.
    const criticText = 'A conversão cai para 30-40% dos prospects que chegam à proposta, e o LTV é de R$ 125.000.';
    const { provider } = fakeLlm({ critic: () => criticWith(criticText) });

    const out = await runGtmPipeline({ ...BASE, providers: { bedrock: provider } });

    expect(out.critic.issuesFound[0]?.descricao).toBe(criticText);
    expect(out.qualityChecks.numericFindings.some((f) => f.path.startsWith('critic'))).toBe(false);
  });

  it('aborta com site_inacessivel antes de qualquer chamada de modelo', async () => {
    stubFetch({});
    const { provider, calls } = fakeLlm();

    await expect(runGtmPipeline({ ...BASE, providers: { bedrock: provider } })).rejects.toThrow(SITE_INACESSIVEL);
    expect(calls).toEqual([]);
  });

  it('informa ao dossiê que concorrente sem coleta não deve ser analisado', async () => {
    stubFetch({ 'https://acme.test': HOME_HTML });
    const { provider, prompts } = fakeLlm();

    const out = await runGtmPipeline({
      ...BASE,
      competitors: ['https://rival.test'],
      providers: { bedrock: provider },
    });

    expect(out.collectionResult.competitors).toEqual([{ url: 'https://rival.test', collected: false }]);
    const dossierPrompt = prompts.find((p) => p.kind === 'dossier')?.user ?? '';
    expect(dossierPrompt).toContain('- Concorrentes informados sem coleta (não analisar): https://rival.test');
    expect(dossierPrompt).toContain('- Concorrentes informados e coletados: nenhum');
  });

  it('calcula unit economics por código e entrega o cálculo como C1 ao dossiê, ao módulo e ao crítico', async () => {
    stubFetch({ 'https://acme.test': HOME_HTML });
    const { provider, prompts } = fakeLlm();

    await runGtmPipeline({
      ...BASE,
      crmOrFinancialInputs: { arpuMonthly: 2500, cacEstimated: 4000, churnMonthlyRate: 0.035, salesCycleDays: 90 },
      providers: { bedrock: provider },
    });

    const dossierPrompt = prompts.find((p) => p.kind === 'dossier')?.user ?? '';
    expect(dossierPrompt).toContain('[C1] (computed)');
    const unitPrompt = prompts.find((p) => p.kind === 'unit_economics')?.user ?? '';
    expect(unitPrompt).toContain('"status": "DADOS REAIS FORNECIDOS"');
    expect(unitPrompt).toContain('"paybackMeses": 1.6');
    const criticPrompt = prompts.find((p) => p.kind === 'critic')?.user ?? '';
    expect(criticPrompt).toContain('"calculado":');
  });
});
