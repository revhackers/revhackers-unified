import { Trophy, Users } from 'lucide-react';
import { BenchmarkResult, formatMetricValue, getCategoryColor } from '@/api/cruxApi';

interface SiteScoreResultBenchmarkProps {
  benchmarkResult: BenchmarkResult | null;
  isBenchmarking: boolean;
}

export const SiteScoreResultBenchmark = ({
  benchmarkResult,
  isBenchmarking
}: SiteScoreResultBenchmarkProps) => {
  if (!benchmarkResult && !isBenchmarking) return null;

  return (
    <section className="mt-32">
      <div className="space-y-6 mb-12">
        <div className="inline-block bg-revgreen text-black px-4 py-1.5 text-xs font-sans font-bold">
          BENCHMARK_COMPETITIVO
        </div>
        <h2 className="text-3xl md:text-2xl md:text-3xl font-bold text-black leading-none italic">
          Você vs. <span className="text-zinc-500">Concorrentes</span>
        </h2>
        <p className="text-sm text-zinc-500 max-w-xl">
          Comparação baseada em dados reais de usuários Chrome (CrUX API). Métricas de P75 (percentil 75).
        </p>
      </div>

      {isBenchmarking ? (
        <div className="flex items-center justify-center py-16 gap-4 bg-zinc-50 border border-zinc-100">
          <div className="w-6 h-6 border-2 border-revgreen border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-zinc-500">Consultando dados reais de performance...</span>
        </div>
      ) : benchmarkResult && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-4 px-4 text-xs font-sans font-bold text-zinc-500 ">Site</th>
                <th className="text-center py-4 px-4 text-xs font-sans font-bold text-zinc-500 ">LCP</th>
                <th className="text-center py-4 px-4 text-xs font-sans font-bold text-zinc-500 ">CLS</th>
                <th className="text-center py-4 px-4 text-xs font-sans font-bold text-zinc-500 ">INP</th>
                <th className="text-center py-4 px-4 text-xs font-sans font-bold text-zinc-500 ">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-revgreen/10 border-b border-zinc-100">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-4 h-4 text-revgreen" />
                    <div>
                      <span className="font-bold text-black text-sm block">{new URL(benchmarkResult.clientSite.url).hostname}</span>
                      <span className="text-xs text-zinc-500 font-sans">SEU SITE</span>
                    </div>
                  </div>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="font-sans font-bold" style={{ color: getCategoryColor(benchmarkResult.clientSite.lcp.category) }}>
                    {formatMetricValue('lcp', benchmarkResult.clientSite.lcp.p75)}
                  </span>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="font-sans font-bold" style={{ color: getCategoryColor(benchmarkResult.clientSite.cls.category) }}>
                    {formatMetricValue('cls', benchmarkResult.clientSite.cls.p75)}
                  </span>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="font-sans font-bold" style={{ color: getCategoryColor(benchmarkResult.clientSite.inp.category) }}>
                    {formatMetricValue('inp', benchmarkResult.clientSite.inp.p75)}
                  </span>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-white text-zinc-900">
                    #{benchmarkResult.ranking.find((r) => r.url === benchmarkResult.clientSite.url)?.position ?? '-'} de {benchmarkResult.competitors.length + 1}
                  </span>
                </td>
              </tr>

              {benchmarkResult.competitors.map((competitor, idx) => (
                <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-zinc-600" />
                      <div>
                        <span className="font-medium text-zinc-700 text-sm block">{new URL(competitor.url).hostname}</span>
                        <span className="text-xs text-zinc-500 font-sans">CONCORRENTE {idx + 1}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    {competitor.error ? (
                      <span className="text-xs text-zinc-500">N/A</span>
                    ) : (
                      <span className="font-sans font-bold" style={{ color: getCategoryColor(competitor.lcp.category) }}>
                        {formatMetricValue('lcp', competitor.lcp.p75)}
                      </span>
                    )}
                  </td>
                  <td className="text-center py-4 px-4">
                    {competitor.error ? (
                      <span className="text-xs text-zinc-500">N/A</span>
                    ) : (
                      <span className="font-sans font-bold" style={{ color: getCategoryColor(competitor.cls.category) }}>
                        {formatMetricValue('cls', competitor.cls.p75)}
                      </span>
                    )}
                  </td>
                  <td className="text-center py-4 px-4">
                    {competitor.error ? (
                      <span className="text-xs text-zinc-500">N/A</span>
                    ) : (
                      <span className="font-sans font-bold" style={{ color: getCategoryColor(competitor.inp.category) }}>
                        {formatMetricValue('inp', competitor.inp.p75)}
                      </span>
                    )}
                  </td>
                  <td className="text-center py-4 px-4">
                    {competitor.error ? (
                      <span className="text-xs text-zinc-500">{competitor.error}</span>
                    ) : (
                      <span className="text-xs text-zinc-500">Analisado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-center gap-6 mt-6 text-xs font-sans text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00C853' }} />
              <span>Bom</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFAB00' }} />
              <span>Precisa Melhorar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF1744' }} />
              <span>Ruim</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
