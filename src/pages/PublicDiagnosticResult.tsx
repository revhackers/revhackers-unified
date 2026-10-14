import { useEffect, useState } from 'react';
import GrowthMapPreview from '@/components/diagnostics/GrowthMapPreview';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, AlertTriangle, Rocket, CheckCircle2, ShieldCheck, BarChart2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PageLayout from '@/components/layout/PageLayout';
import SEO from '@/components/shared/SEO';
import Section from '@/components/ui/Section';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function PublicDiagnosticResult() {
    const { id } = useParams();
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadResult = async () => {
            if (!id || id === 'demo' || id === 'preview') {
                // Demo / Fallback Data
                setResult(getDemoData());
                setLoading(false);
                return;
            }

            try {
                const { data: diagRows, error: diagError } = await supabase
                    .rpc('get_diagnostico_public_result', { p_id: id });
                const diagData = Array.isArray(diagRows) ? diagRows[0] : diagRows;

                if (!diagError && diagData) {
                    const respostas = (diagData as any).respostas || {};
                    const details = respostas.result_details || {};

                    setResult({
                        id: (diagData as any).id,
                        created_at: (diagData as any).created_at,
                        empresa: respostas.lead_company || respostas.lead_name || 'Sua Empresa B2B',
                        tipo_diagnostico: respostas.diagnostic_type || (diagData as any).tipo || 'Diagnóstico de Growth 360°',
                        score: (diagData as any).score || 62,
                        nivel_maturidade: respostas.maturity_level || details.title || details.level || 'Vazamento Sistêmico',
                        detalhes_resultado: details,
                        respostas,
                    });
                    return;
                }

                // Fallback: legacy flow
                const { data, error } = await supabase
                    .from('rei_responses')
                    .select('*, project:rei_projects(*)')
                    .eq('id', id)
                    .single();

                if (error || !data) {
                    // Fallback to Demo Data instead of showing error
                    setResult(getDemoData());
                    return;
                }

                const project = (data as any).project as any;
                const responses = (data as any).responses as any;
                const details = responses?.result_details || {};

                setResult({
                    id: (data as any).id,
                    created_at: (data as any).created_at,
                    empresa: project?.client_name || 'Sua Empresa B2B',
                    tipo_diagnostico: responses?.diagnostic_type || (data as any).source || 'Diagnóstico de Growth 360°',
                    score: (data as any).total_score || 65,
                    nivel_maturidade: (data as any).maturity_level || 'Vazamento Sistêmico',
                    detalhes_resultado: details,
                    respostas: responses,
                });
            } catch (error) {
                console.error('Erro ao carregar resultado:', error);
                setResult(getDemoData());
            } finally {
                setLoading(false);
            }
        };

        loadResult();
    }, [id]);

    const getDemoData = () => ({
        id: 'demo-result',
        created_at: new Date().toISOString(),
        empresa: 'Empresa B2B (Demonstração)',
        tipo_diagnostico: 'Diagnóstico 360° de Growth',
        score: 62,
        nivel_maturidade: 'Vazamento Sistêmico',
        detalhes_resultado: {
            title: 'Vazamento Sistêmico no Pipeline',
            description: 'Sua operação apresenta gargalos na qualificação de leads, alta latência no tempo de primeiro contato (SLA de vendas) e subutilização de automações no CRM. Isso gera perda contínua de margem líquida e CAC elevado.',
            action: 'Plugar Inteligência Artificial no CRM para qualificação de leads em tempo real e estabelecer SLA de contato inferior a 5 minutos.'
        }
    });

    if (loading) {
        return (
            <PageLayout>
                <Section className="min-h-screen bg-zinc-950 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-[#00CC6A] border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-zinc-400 text-xs font-mono animate-pulse uppercase tracking-widest">
                            Gerando Relatório Preditivo...
                        </div>
                    </div>
                </Section>
            </PageLayout>
        );
    }

    const score = result?.score || 62;
    const leakageEstimate = (100 - score) * 3450;

    // Data for Radar Chart (5 Dimensões de Growth B2B)
    const radarData = [
        { subject: 'Aquisição', A: Math.min(100, score + 10), fullMark: 100 },
        { subject: 'Conversão', A: Math.max(20, score - 15), fullMark: 100 },
        { subject: 'Retenção', A: Math.min(90, score + 5), fullMark: 100 },
        { subject: 'Processos', A: Math.max(10, score - 20), fullMark: 100 },
        { subject: 'ICP', A: Math.min(100, score + 15), fullMark: 100 },
    ];

    // Data for Projection Bar Chart
    const projectionData = [
        { name: 'Atual (Perdas)', valor: Math.round(leakageEstimate / 1000) },
        { name: 'Com IA & RevOps', valor: Math.round((leakageEstimate * 0.15) / 1000) },
    ];

    return (
        <PageLayout>
            <SEO title={`Relatório Preditivo - ${result.empresa}`} description="Diagnóstico de Maturidade de Growth & Unit Economics da sua operação B2B." />
            
            <div className="bg-white text-zinc-900 min-h-screen pt-24 pb-20 border-b border-zinc-100">
                <div className="max-w-6xl mx-auto px-6 space-y-10">

                    {/* Top Action Header */}
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-6">
                        <Link to="/diagnostico" className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
                            <ArrowLeft size={14} className="mr-1.5" /> Central de Diagnósticos
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-[#00CC6A] text-xs font-semibold tracking-wider uppercase">
                                Relatório Preditivo
                            </span>
                        </div>
                    </div>

                    {/* Dashboard Header */}
                    <div className="space-y-3 text-center md:text-left">
                        <p className="text-[#00CC6A] text-xs font-semibold tracking-wider uppercase">
                            Diagnóstico Oficial • {result.empresa}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
                            Maturidade de Growth & Unit Economics
                        </h1>
                        <p className="text-sm md:text-base text-zinc-500 max-w-2xl leading-relaxed">
                            Mapeamento de gargalos no funil de vendas, vazamentos financeiros e plano de correção operacional com Inteligência Artificial.
                        </p>
                    </div>

                    {/* Main Dashboard Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* Card 1: Score Gauge & Radar (Left 5 Cols) */}
                        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-sm">
                            <div className="space-y-4 text-center">
                                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Índice Sintético de Crescimento</span>
                                <div className="relative flex items-center justify-center">
                                    <div className="text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-900">
                                        {score}
                                    </div>
                                    <span className="text-sm font-bold text-zinc-400 ml-1">/100</span>
                                </div>
                                <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-100 text-[#00CC6A] border border-zinc-200">
                                    {result.nivel_maturidade}
                                </span>
                            </div>

                            {/* Radar Chart */}
                            <div className="h-56 w-full pt-4">
                                <h4 className="text-center text-xs font-semibold text-zinc-500 mb-2 uppercase">Equilíbrio por Dimensão</h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#e4e4e7" />
                                        <PolarAngleAxis dataKey="subject" stroke="#71717a" tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }} />
                                        <Radar name="Pontuação" dataKey="A" stroke="#00CC6A" fill="#00CC6A" fillOpacity={0.3} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Card 2: Financial Projection & Leakage (Right 7 Cols) */}
                        <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-8 shadow-sm">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={18} className="text-red-500" />
                                    <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                                        Vazamento Anual Estimado
                                    </span>
                                </div>

                                <div className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
                                    {leakageEstimate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-xs text-zinc-400 font-normal">/ano em margem perdida</span>
                                </div>

                                <p className="text-sm text-zinc-600 leading-relaxed border-l-2 border-[#00CC6A] pl-4">
                                    {result.detalhes_resultado?.description || "Incapacidade de qualificar leads em tempo real e falta de automação no CRM geram desperdício contínuo de orçamento publicitário e tempo da equipe."}
                                </p>
                            </div>

                            {/* Bar Chart Projeção de Recuperação */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase">Impacto da Correção em Milhares (R$ k)</h4>
                                <div className="h-36 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={projectionData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <XAxis type="number" stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" stroke="#a1a1aa" tick={{ fill: '#27272a', fontSize: 11, fontWeight: 500 }} width={120} />
                                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '8px', color: '#18181b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                            <Bar dataKey="valor" fill="#00CC6A" radius={[0, 6, 6, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Action CTA */}
                            <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="space-y-0.5 text-center sm:text-left">
                                    <span className="text-sm font-bold text-zinc-900 block">Deseja estancar essa perda?</span>
                                    <span className="text-xs text-zinc-500 block font-normal">Agende uma auditoria técnica de 30 minutos com nossos especialistas.</span>
                                </div>

                                <Button
                                    asChild
                                    className="w-full sm:w-auto h-11 px-6 bg-[#00CC6A] hover:bg-[#00b35e] text-black font-semibold text-sm rounded-lg gap-2 shrink-0 transition-colors"
                                >
                                    <Link to={result.id === 'demo-result' ? '/booking' : `/booking?company=${encodeURIComponent(result.empresa)}`}>
                                        <span>Agendar Diagnóstico</span>
                                        <Rocket size={16} />
                                    </Link>
                                </Button>
                            </div>

                        </div>
                    </div>

                    {/* Lower Grid: Checklist & Action Items */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-3 shadow-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-[#00CC6A]" />
                                <h4 className="text-sm font-bold text-zinc-900">1. Diagnóstico de Canais</h4>
                            </div>
                            <p className="text-xs text-zinc-600 leading-relaxed">
                                Diversificar a matriz de risco para não depender 100% de indicação ou tráfego pago instável.
                            </p>
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-3 shadow-sm">
                            <div className="flex items-center gap-2">
                                <BarChart2 size={18} className="text-[#00CC6A]" />
                                <h4 className="text-sm font-bold text-zinc-900">2. Automação no CRM</h4>
                            </div>
                            <p className="text-xs text-zinc-600 leading-relaxed">
                                Implementar SLA de primeiro contato em até 5 minutos via WhatsApp com qualificação por IA.
                            </p>
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-3 shadow-sm">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-[#00CC6A]" />
                                <h4 className="text-sm font-bold text-zinc-900">3. CAC Teto & Break-even</h4>
                            </div>
                            <p className="text-xs text-zinc-600 leading-relaxed">
                                Delimitar o custo limite de aquisição por cohort para garantir margem líquida positiva.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
            
            {/* GrowthMap Preview - 3 frameworks grátis */}
            <GrowthMapPreview 
              diagnosticScore={score} 
              diagnosticType={result.tipo_diagnostico}
            />
        </PageLayout>
    );
}
