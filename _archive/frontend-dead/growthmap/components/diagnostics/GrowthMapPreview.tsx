import { useState } from 'react';
import { Lock, TrendingUp, Target, BarChart3, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GrowthMapPreviewProps {
  diagnosticScore?: number;
  diagnosticType?: string;
}

const FRAMEWORKS = [
  {
    id: 'competitive-positioning',
    name: 'Posicionamento Competitivo',
    icon: Target,
    description: 'Análise comparativa de preço, features e autoridade de mercado contra concorrentes diretos',
    sampleData: {
      yourPosition: 'Premium Niche',
      avgCompetitorPrice: 'R$ 4.500/mês',
      marketShare: '12%',
      differentiation: 'Automação + IA',
    },
  },
  {
    id: 'tam-sam-som',
    name: 'TAM SAM SOM',
    icon: TrendingUp,
    description: 'Dimensionamento de mercado total, endereçável e obtível com base no seu ICP',
    sampleData: {
      tam: 'R$ 8.2B',
      sam: 'R$ 1.1B',
      som: 'R$ 45M',
      growthRate: '23% ao ano',
    },
  },
  {
    id: 'industry-signals',
    name: 'Sinais de Mercado',
    icon: BarChart3,
    description: 'Monitoramento de eventos competitivos, funding, hiring e mudanças regulatórias',
    sampleData: {
      activeSignals: 18,
      fundingEvents: 3,
      competitorLaunches: 5,
      marketTrends: 'Consolidação',
    },
  },
];

export default function GrowthMapPreview({ diagnosticScore = 62, diagnosticType = 'growth' }: GrowthMapPreviewProps) {
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null);

  return (
    <section className="py-16 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00CC6A]/10 border border-[#00CC6A]/20 rounded-full mb-4">
            <span className="text-[#00CC6A] text-xs font-semibold tracking-wider uppercase">
              Preview do GrowthMap
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Veja 3 dos 37 frameworks estratégicos
          </h2>
          <p className="text-zinc-400 text-base max-w-2xl mx-auto">
            Baseado no seu diagnóstico {diagnosticType} (score {diagnosticScore}/100), 
            aqui está uma amostra do que o GrowthMap completo entrega.
          </p>
        </div>

        {/* Framework Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {FRAMEWORKS.map((fw) => {
            const Icon = fw.icon;
            const isExpanded = expandedFramework === fw.id;

            return (
              <div
                key={fw.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-[#00CC6A]/30 transition-colors cursor-pointer"
                onClick={() => setExpandedFramework(isExpanded ? null : fw.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#00CC6A]/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#00CC6A]" />
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{fw.name}</h3>
                <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{fw.description}</p>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Dados de exemplo:</p>
                    {Object.entries(fw.sampleData).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-zinc-500">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="text-white font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Locked Frameworks Teaser */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-zinc-500" />
            <h3 className="text-lg font-semibold text-white">+34 frameworks exclusivos</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              'Unit Economics',
              'CAC Breakdown',
              'LTV Projection',
              'Churn Analysis',
              'Sales Pipeline',
              'ICP Scoring',
              'Channel Mix',
              'Content Strategy',
              'Pricing Strategy',
              'Competitor SWOT',
              'Market Entry',
              'Expansion Plan',
            ].map((name) => (
              <div
                key={name}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-400 text-center"
              >
                {name}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="inline-block bg-gradient-to-r from-[#00CC6A]/10 to-[#00b35e]/10 border border-[#00CC6A]/20 rounded-xl p-8 max-w-2xl">
            <h3 className="text-2xl font-bold text-white mb-3">
              Quer acesso completo ao GrowthMap?
            </h3>
            <p className="text-zinc-400 mb-6">
              O GrowthMap é entregue como parte do programa <strong className="text-white">REI (Revenue Engine Intelligence)</strong> — 
              diagnóstico estratégico + implementação guiada em 90 dias.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => window.open('/booking', '_blank')}
                className="h-12 px-8 bg-[#00CC6A] hover:bg-[#00b35e] text-black font-semibold rounded-lg gap-2"
              >
                Agendar Call Estratégica
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('/growthmap', '_blank')}
                className="h-12 px-8 border-zinc-700 text-white hover:bg-zinc-800 rounded-lg"
              >
                Ver GrowthMap Completo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
