import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, X, Loader2, RefreshCw, BarChart2, ShieldCheck, Sparkles, Layers, Target, Compass, Users, ArrowRight, Share2, TrendingUp, CheckCircle2 } from 'lucide-react';
import FrameworkCard from '@/components/growthmap/FrameworkCard';
import REIBridge from '@/components/growthmap/REIBridge';
import {
  generateFramework,
  getGrowthMap,
  saveFrameworkResult,
  buildInitialState,
  FRAMEWORK_CATALOG,
} from '@/api/growthmap';
import { getLatestReiResponse } from '@/api/reiResponses';
import { getReiProjectById } from '@/api/reiProjects';
import type { FrameworkResult, GrowthMapState } from '@/types/growthmap';
import AdminLayout from '@/components/layout/AdminLayout';

type PillarKey = 'inteligencia_estrategica' | 'concepcao_valor' | 'mvp_validacao' | 'escalabilidade';

const PILLAR_META: Record<PillarKey, { label: string; description: string; badge: string }> = {
  inteligencia_estrategica: { label: 'Inteligência Estratégica', description: 'TAM, concorrência, posicionamento e vetores de mercado', badge: 'PILAR 1' },
  concepcao_valor:          { label: 'Concepção de Valor',       description: 'ICP, proposta de valor e diferenciais competitivos', badge: 'PILAR 2' },
  mvp_validacao:            { label: 'MVP & Validação Ágil',      description: 'Priorização de experimentos e matriz ICE Score', badge: 'PILAR 3' },
  escalabilidade:           { label: 'Escalabilidade & Tração',   description: 'Funil AARRR, canais de aquisição e North Star Metric', badge: 'PILAR 4' },
};

function FrameworkDataView({ fw }: { fw: FrameworkResult }) {
  const d = fw.data;

  if (fw.id === 'aarrr' && d) {
    const stages = ['aquisicao', 'ativacao', 'retencao', 'receita', 'referencia', 'reativacao'] as const;
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage, i) => {
          const s = d[stage];
          if (!s) return null;
          return (
            <div key={stage} className="shrink-0 w-48 rounded-xl p-4 border border-zinc-800 bg-zinc-900/60">
              <div className="text-2xl font-bold mb-1 text-[#00CC6A]">{stage.charAt(0).toUpperCase()}</div>
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">{stage}</div>
              <div className="mb-2">
                <div className="text-[10px] text-zinc-500 uppercase">Métrica</div>
                <div className="text-xs text-zinc-300 line-clamp-2">{s.metric}</div>
              </div>
              <div className="mb-2">
                <div className="text-[10px] text-zinc-500 uppercase">Atual / Meta</div>
                <div className="text-xs font-sans font-bold text-white">{s.current_value ?? '—'} / {s.meta}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide bg-zinc-800 text-[#00CC6A] border border-zinc-700">
                {s.status}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <pre className="text-xs bg-zinc-950 p-4 rounded-xl overflow-x-auto text-zinc-300 border border-zinc-800 leading-relaxed font-sans">
      {JSON.stringify(d, null, 2)}
    </pre>
  );
}

export default function GrowthMap() {
  const { projectId } = useParams<{ projectId?: string }>();
  const activeProjectId = projectId || 'demo-growthmap';
  const [gState, setGState] = useState<GrowthMapState>(
    buildInitialState(activeProjectId, 'Funnels | CRM Brasileiro All-in-One', 'Solução completa de Marketing e Vendas')
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PillarKey>('inteligencia_estrategica');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reiResponsesRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    async function load() {
      if (!activeProjectId || activeProjectId === 'demo-growthmap') {
        setLoaded(true);
        return;
      }

      const [project, latestRei, data] = await Promise.all([
        getReiProjectById(activeProjectId).catch(() => null),
        getLatestReiResponse(activeProjectId).catch(() => null),
        getGrowthMap(activeProjectId),
      ]);

      const companyName = project?.client_company || project?.trade_name || project?.client_name || 'Empresa B2B';
      const companyDescription = project?.client_site || '';
      const reiResponses = (latestRei?.responses as Record<string, unknown> | null) ?? {};
      reiResponsesRef.current = reiResponses;
      const reiScore = latestRei?.maturity_percentage ?? undefined;

      if (data) {
        setGState({
          ...data,
          company_name: data.company_name || companyName,
          company_description: data.company_description || companyDescription,
          rei_score: reiScore ?? data.rei_score,
        });
      } else {
        setGState({
          ...buildInitialState(activeProjectId, companyName, companyDescription),
          rei_score: reiScore,
        });
      }
      setLoaded(true);
    }
    load();
  }, [activeProjectId]);

  const handleGenerate = useCallback(async (id: string) => {
    setGState(prev => ({
      ...prev,
      frameworks: { ...prev.frameworks, [id]: { ...prev.frameworks[id], status: 'generating' } },
    }));

    try {
      const result = await generateFramework({
        project_id: gState.project_id,
        framework_id: id,
        rei_responses: reiResponsesRef.current,
        company_name: gState.company_name,
        company_description: gState.company_description,
      });

      setGState(prev => ({
        ...prev,
        frameworks: { ...prev.frameworks, [id]: result },
      }));

      await saveFrameworkResult(gState.project_id, result);
    } catch (err) {
      console.error('[GrowthMap] generateFramework error:', err);
      setGState(prev => ({
        ...prev,
        frameworks: { ...prev.frameworks, [id]: { ...prev.frameworks[id], status: 'error' } },
      }));
    }
  }, [gState]);

  const handleGenerateAll = useCallback(async () => {
    setIsGeneratingAll(true);
    for (const f of FRAMEWORK_CATALOG) {
      if (gState.frameworks[f.id]?.status !== 'done') {
        await handleGenerate(f.id);
        await new Promise(r => setTimeout(r, 600));
      }
    }
    setIsGeneratingAll(false);
  }, [gState, handleGenerate]);

  const selectedFw = selectedId
    ? (gState.frameworks[selectedId] ?? FRAMEWORK_CATALOG.find(f => f.id === selectedId) as unknown as FrameworkResult)
    : null;

  if (!loaded) {
    return (
      <AdminLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#00CC6A]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-zinc-950 text-white font-sans relative overflow-hidden">
        {/* Subtle radial glow background */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#00CC6A]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 relative z-10">
          
          {/* Header Superior Nobibecode SaaS Moderno de Elite */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                
                <span className="text-xs text-zinc-500 font-sans">ID: {activeProjectId.slice(0, 8)}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                {gState.company_name}
              </h1>
              <p className="text-xs md:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Central de Inteligência Estratégica: análise preditiva de mercado, TAM/SAM/SOM, concorrência e matrizes de validação executiva.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateAll}
                disabled={isGeneratingAll}
                className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl h-10 px-5 text-xs font-bold gap-2 flex items-center transition-all shadow-xs"
              >
                {isGeneratingAll ? <Loader2 size={14} className="animate-spin text-[#00CC6A]" /> : null}
                <span>{isGeneratingAll ? "Processando Frameworks..." : "Rodar Inteligência Completa"}</span>
              </button>
            </div>
          </div>

          {/* Navegação por Pilares (Pills estilo Vercel / Linear) */}
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2 overflow-x-auto">
            {(Object.entries(PILLAR_META) as [PillarKey, { label: string; description: string; badge: string }][]).map(([key, meta]) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                    isActive
                      ? "bg-white text-zinc-950 border-white shadow-sm"
                      : "bg-zinc-900/40 text-zinc-400 border-zinc-800/80 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#00CC6A]" : "bg-zinc-600"}`} />
                  <span>{meta.badge} • {meta.label}</span>
                </button>
              );
            })}
          </div>

          {/* INDUSTRY INSIGHTS CARD (Design Elevado de Elite) */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-xl rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00CC6A]/40 to-transparent" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-4">
              <div>
                <span className="text-[10px] font-sans font-bold text-[#00CC6A] uppercase tracking-wider block">
                  {PILLAR_META[activeTab].badge} • INSIGHTS DE MERCADO & VETORES
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                  {PILLAR_META[activeTab].label}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {PILLAR_META[activeTab].description}
                </p>
              </div>
              <span className="text-[11px] font-sans text-zinc-500">Mapeamento em Tempo Real</span>
            </div>

            {/* Grid de Métricas Preditivas com Design Superior */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 space-y-2 text-center group hover:border-zinc-700 transition-colors">
                <span className="text-3xl font-extrabold text-white tracking-tight block">R$ 2,8 bi</span>
                <span className="text-[10px] font-sans font-bold text-[#00CC6A] uppercase tracking-wider block">TAM CRM/MARTECH BRASIL 2025</span>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Mercado em expansão acelerada (~18% a.a.), impulsionado pela digitalização de PMEs pós-pandemia.
                </p>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 space-y-2 text-center group hover:border-zinc-700 transition-colors">
                <span className="text-3xl font-extrabold text-white tracking-tight block">68%</span>
                <span className="text-[10px] font-sans font-bold text-[#00CC6A] uppercase tracking-wider block">PMES SEM CRM ESTRUTURADO</span>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Maioria das PMEs ainda utiliza planilhas manuais — oportunidade maciça de migração para soluções nativas.
                </p>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 space-y-2 text-center group hover:border-zinc-700 transition-colors">
                <span className="text-3xl font-extrabold text-white tracking-tight block">3x</span>
                <span className="text-[10px] font-sans font-bold text-[#00CC6A] uppercase tracking-wider block">CUSTO HUBSPOT VS LOCAL</span>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Softwares globais custam até 3x mais que plataformas nacionais, gerando gap direto de aquisição.
                </p>
              </div>
            </div>

            {/* Vetores de Crescimento & Desafios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 space-y-2">
                <span className="text-[11px] font-sans font-bold text-[#00CC6A] uppercase tracking-wider block flex items-center gap-1.5">
                  <Sparkles size={14} /> VETORES DE CRESCIMENTO PREDITIVO
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  <strong className="text-white">Adoção de Automações por IA:</strong> +2,5 mi de novos CNPJs abertos buscam processos automatizados para operar com times enxutos.
                </p>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 space-y-2">
                <span className="text-[11px] font-sans font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <ShieldCheck size={14} /> DESAFIOS & GAPS DE RETENÇÃO
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  <strong className="text-white">Churn de Onboarding Early-Stage:</strong> Plataformas de vendas sem onboarding assistido enfrentam perda de clientes nos primeiros 90 dias.
                </p>
              </div>
            </div>

            {/* Action Strip Inferior */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3.5 px-5 flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Compartilhe este relatório <strong className="text-white">GrowthMap</strong> com seu time executivo!</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link do GrowthMap copiado!");
                }}
                className="text-[#00CC6A] hover:underline font-bold flex items-center gap-1.5"
              >
                <span>Copiar Link do Diagnóstico</span>
                <Share2 size={13} />
              </button>
            </div>
          </div>

          {/* Grid de Frameworks do Pilar Selecionado */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Layers size={18} className="text-[#00CC6A]" />
                <span>Frameworks Operacionais do {PILLAR_META[activeTab].badge}</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FRAMEWORK_CATALOG.filter(f => f.pillar === activeTab).map(fw => {
                const fwState: FrameworkResult = gState.frameworks[fw.id] ?? {
                  id: fw.id, pillar: fw.pillar, title: fw.title, subtitle: fw.subtitle, status: 'pending',
                };
                return (
                  <FrameworkCard
                    key={fw.id}
                    framework={fwState}
                    onRegenerate={() => handleGenerate(fw.id)}
                    onClick={() => setSelectedId(fw.id)}
                  />
                );
              })}
            </div>
          </div>

        </div>

        {/* Drawer Lateral com Detalhes do Framework */}
        {selectedId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setSelectedId(null)}>
            <div className="w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 h-full p-6 space-y-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h3 className="text-xl font-bold text-white">{selectedFw?.title}</h3>
                <button onClick={() => setSelectedId(null)} className="text-zinc-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>

              {selectedFw && <FrameworkDataView fw={selectedFw} />}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
