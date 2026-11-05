import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, FileText, ChevronRight, Lock, CalendarClock, Briefcase, Zap, ShieldCheck, PenLine, Loader2, ArrowRight, Play, CheckCircle, Share2, Quote } from "lucide-react";
import { DynamicContract } from "./components/DynamicContract";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import DOMPurify from 'dompurify';
import { Checkbox } from "@/components/ui/checkbox";
import { casesData } from "@/data/casesData";
import PageLayout from "@/components/layout/PageLayout";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";



import { OnboardingRoadmap } from "@/components/roadmap/OnboardingRoadmap";
import { First90Days } from "@/components/roadmap/First90Days";
import { toast } from "@/components/ui/use-toast";
import { SignatureEngine } from "@/components/legal/SignatureEngine";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
interface ScopePhase {
    phase: string;
    duration: string;
    description: string;
    deliverables: string[];
    status?: string;
}

const RoadmapDisplay = ({ scope, proposal }: { scope: any, proposal: any }) => {
    let phases: ScopePhase[] | null = null;
    let htmlContent: string | null = null;

    try {
        if (typeof scope === 'string') {
            if (scope.trim().startsWith('[')) {
                phases = JSON.parse(scope);
            } else {
                htmlContent = scope;
            }
        } else if (Array.isArray(scope)) {
            phases = scope;
        }
    } catch (e) {
        htmlContent = scope;
    }

    if (htmlContent) {
        return (
            <div className="bg-white p-6 lg:p-12 rounded-[4px] border border-zinc-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-revgreen/20" />
                <div
                    className="deal-room-content prose prose-zinc prose-sm max-w-none prose-headings:font-bold prose-h3:text-lg prose-p:text-zinc-600 prose-li:text-zinc-600 prose-strong:text-zinc-900"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent || '') }}
                />
            </div>
        );
    }

    if (!phases) return null;

    return (
        <div className="relative space-y-8 pl-4 lg:pl-0">
            {/* Timeline Line */}
            <div className="absolute left-[27px] lg:left-1/2 top-4 bottom-4 w-0.5 bg-zinc-200 -translate-x-1/2 hidden lg:block" />
            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-zinc-200 -translate-x-1/2 lg:hidden" />

            {phases.slice(0, 5).map((phase, idx) => {
                const isEven = idx % 2 === 0;
                return (
                    <div key={idx} className={`relative flex flex-col lg:flex-row gap-8 lg:gap-0 items-start ${isEven ? 'lg:flex-row-reverse' : ''}`}>

                        {/* Empty Space for alignment */}
                        <div className="flex-1 hidden lg:block" />

                        {/* Center Node */}
                        <div className="z-10 bg-white p-1 border border-zinc-200 shadow-sm shrink-0 lg:mx-8 absolute left-[9px] lg:static lg:left-auto">
                            <div className="w-8 h-8 bg-zinc-900 text-white flex items-center justify-center text-sm font-bold">
                                {idx + 1}
                            </div>
                        </div>

                        {/* Content Card */}
                        <div className={`flex-1 w-full pl-12 lg:pl-0 ${isEven ? 'lg:pr-8 lg:text-right' : 'lg:pl-8 lg:text-left'}`}>
                            <div className="bg-white p-6 border border-zinc-200 shadow-sm transition-all group hover:-translate-y-1 duration-300">
                                <span className="inline-block text-xxs font-bold tracking-widest uppercase text-zinc-600 mb-2 bg-zinc-100 px-2 py-1">
                                    {phase.duration || `Fase ${idx + 1}`}
                                </span>
                                <h4 className="text-lg font-bold text-zinc-900 mb-3">{phase.phase}</h4>
                                <p className="text-sm text-zinc-500 leading-relaxed mb-4">{phase.description}</p>

                                {phase.deliverables && phase.deliverables.length > 0 && (
                                    <div className={`space-y-2 pt-4 border-t border-zinc-100 ${isEven ? 'lg:flex lg:flex-col lg:items-end' : ''}`}>
                                        {phase.deliverables.map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-zinc-700 font-medium">
                                                <CheckCircle2 className="w-3 h-3 text-zinc-400 shrink-0" />
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Success Node */}
            <div className="relative flex justify-center pt-8">
                <div className="z-10 bg-zinc-100 p-2 border border-zinc-200">
                    <div className="w-12 h-12 bg-zinc-900 text-white flex items-center justify-center">
                        <FolderKanban className="w-6 h-6 text-white" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function PublicDealRoom() {
    const { slug } = useParams();
    const [proposal, setProposal] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const testimonialsRef = useRef<HTMLDivElement>(null);

    // Signature State
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Hash SHA-256 via Web Crypto API (nao armazena CPF em plain text - LGPD)
    const hashSHA256 = async (value: string): Promise<string> => {
        const normalized = value.replace(/\D/g, ''); // remove pontuacao do CPF
        const buffer = new TextEncoder().encode(normalized);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleAcceptProposal = async (signerData: { name: string, role: string, cpf: string, email: string, hash: string }) => {
        setIsSubmitting(true);
        try {
            // Hash do CPF antes de persistir (LGPD compliance - nunca armazenar PII em plain text)
            const cpfHash = await hashSHA256(signerData.cpf);

            // 1. SAVE SIGNATURE
            const { error } = await supabase.from('proposals' as any).update({
                status: 'approved',
                crm_data: {
                    ...(proposal.crm_data || {}),
                    deal_signed: true,
                    signed_by: signerData.name,
                    signed_role: signerData.role,
                    signed_cpf_hash: cpfHash,          // hash SHA-256, nunca plain text
                    signed_email: signerData.email,
                    signed_user_agent: navigator.userAgent.substring(0, 255),
                    signed_at: new Date().toISOString(),
                    certificate_hash: signerData.hash
                }
            }).eq('id', proposal.id);
            if (error) throw error;

            toast({ title: "Assinatura Registrada", description: "Projeto aprovado com sucesso! Gerando cofre..." });

            setProposal((prev: any) => ({ ...prev, status: 'approved', crm_data: { ...(prev?.crm_data || {}), signed_by: signerData.name, certificate_hash: signerData.hash } }));
            setIsSubmitting(false);

        } catch (error: any) {
            console.error('Error accepting proposal:', error);
            toast({ title: "Erro na assinatura", description: error.message, variant: "destructive" });
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchProposal = async () => {
            const { data, error } = await supabase
                // @ts-ignore
                .rpc('get_proposal_by_slug', { slug_input: slug })
                .single();

            if (error) {
                console.error("Error loading proposal:", error);
            } else {
                setProposal(data);
            }
            setLoading(false);
        };

        fetchProposal();
    }, [slug]);

    // Auto-scroll testimonials carousel
    useEffect(() => {
        const container = testimonialsRef.current;
        if (!container) return;

        const interval = setInterval(() => {
            const scrollAmount = 420; // card width + gap
            const maxScroll = container.scrollWidth - container.clientWidth;

            if (container.scrollLeft >= maxScroll - 10) {
                container.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [proposal]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-900" />
            </div>
        );
    }

    if (!proposal) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white flex-col gap-4">
                <h1 className="text-xl font-black text-zinc-900 tracking-tight">Página não encontrada</h1>
                <p className="text-sm text-zinc-500">O link pode ter expirado ou estar incorreto.</p>
            </div>
        )
    }

    return (
        <PageLayout>
            <div className="bg-[#FDFDFD] text-zinc-900 font-sans selection:bg-[#03FC3B] selection:text-black pb-32 overflow-x-hidden pt-20">

                {/* Main Content Container */}
                <main className="pt-10 lg:pt-16 px-6 max-w-[1200px] mx-auto space-y-12">

                    {/* Section 1: Hero & Context - COMPACT */}
                    <section className="text-center space-y-6">
                        <div className="space-y-4 max-w-4xl mx-auto relative">
                            {/* Status Badge - Moved from Header */}
                            <div className="flex justify-center mb-6">
                                <Badge className={`px-3 py-1 text-xxs font-bold tracking-wider uppercase border-0 shadow-sm ${proposal.status === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-zinc-100 text-zinc-500'
                                    }`}>
                                    {proposal.status === 'active' ? 'Em Aberto' : proposal.status}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-center gap-3">
                                <span className="h-[1px] w-8 bg-zinc-300"></span>
                                <p className="text-xxs font-serif italic text-zinc-500 tracking-wide uppercase">
                                    Plano Estratégico Exclusivo
                                </p>
                                <span className="h-[1px] w-8 bg-zinc-300"></span>
                            </div>

                            <h1 className="text-3xl lg:text-5xl font-black tracking-tighter text-zinc-900 leading-[1.1] text-balance">
                                {proposal.title || proposal.headline || `Proposta de Implementação RevHackers X ${proposal?.client_name}`}
                            </h1>

                            <p className="text-base text-zinc-400 font-light tracking-tight">
                                Preparado para <span className="font-medium text-zinc-900 border-b border-zinc-200 pb-0.5">{proposal?.client_name}</span>
                            </p>
                        </div>
                    </section>

                    {/* Section 2: Video (The Centerpiece) */}
                    <section className="space-y-8">
                        <div className="group relative w-full aspect-[16/9] bg-zinc-900 rounded-[2px] border border-zinc-200 shadow-sm overflow-hidden transition-all duration-500">
                            {proposal.recording_url ? (
                                <iframe
                                    src={proposal.recording_url.includes('/embed')
                                        ? proposal.recording_url
                                        : proposal.recording_url.replace('/app/meetings/', '/app/embed/')}
                                    // Smart Crop Technique - Responsive
                                    className="relative z-10 w-full h-full md:w-[110%] md:h-[150%] md:-mt-[72px] md:-ml-[5%] border-none grayscale-[5%] group-hover:grayscale-0 group-hover:scale-[1.01] transition-all duration-1000 ease-out opacity-90 group-hover:opacity-100"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowFullScreen
                                    title="Recording"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-zinc-400 gap-2">
                                    <p className="text-xs uppercase tracking-widest text-zinc-600">Vídeo não disponível</p>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4 print:hidden">
                            {/* RECORDING BUTTON - THE GOLD */}
                            <Button
                                className="h-12 px-8 bg-zinc-900 hover:bg-black text-white uppercase tracking-widest text-xxs font-bold rounded-sm w-full md:w-auto flex items-center gap-2"
                                onClick={async () => {
                                    if (!proposal.meeting_link) {
                                        toast({ title: "Link indisponível", description: "Nenhum link de reunião configurado para este Deal.", variant: "destructive" });
                                        return;
                                    }

                                    toast({ title: "Iniciando Sessão...", description: "Registrando início e abrindo sala de conferência." });
                                    try {
                                        await supabase.from('deal_sessions' as any).insert({
                                            deal_id: proposal.id,
                                            started_at: new Date().toISOString(),
                                            user_agent: navigator.userAgent
                                        });
                                    } catch (e) {
                                        console.log('Session log optional/skipped');
                                    }

                                    window.open(proposal.meeting_link, '_blank');
                                }}
                            >
                                <span className="w-2 h-2 bg-white" />
                                Gravar Sessão (Iniciar)
                            </Button>

                            <Button
                                className="h-12 px-8 bg-zinc-900 text-white hover:bg-zinc-800 uppercase tracking-widest text-xxs font-bold rounded-sm w-full md:w-auto"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    toast({ title: "Link Copiado!", description: "O link da proposta foi copiado para sua área de transferência." });
                                }}
                            >
                                <Share2 className="w-3 h-3 mr-2" /> Compartilhar Proposta
                            </Button>
                        </div>

                    </section>

                    {/* Section 2.2: Dossiê Executivo (Markdown Summary) */}
                    {proposal.summary && (
                        <section className="bg-white p-8 lg:p-12 rounded-[4px] border border-zinc-200 shadow-sm relative overflow-hidden mt-8 max-w-5xl mx-auto">
                            <div className="absolute top-0 left-0 w-1 h-full bg-zinc-900" />
                            <div className="flex items-center gap-3 border-b border-zinc-100 pb-6 mb-8">
                                <FileText className="w-5 h-5 text-zinc-400" />
                                <h2 className="text-xl font-black text-zinc-900 tracking-tight">Resumo Executivo & Escopo</h2>
                            </div>
                            <div className="prose prose-zinc max-w-none prose-headings:font-bold prose-h3:text-lg prose-p:text-zinc-600 prose-li:text-zinc-600 prose-strong:text-zinc-900 prose-a:text-zinc-900">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {proposal.summary}
                                </ReactMarkdown>
                            </div>
                        </section>
                    )}


                    {/* Section 2.5: Onboarding Roadmap (Methodology) */}
                    <div className="space-y-12 py-8 bg-zinc-50/50 -mx-6 px-6 border-y border-zinc-100/50">
                        <OnboardingRoadmap />
                        <div className="max-w-4xl mx-auto h-[1px] bg-zinc-100"></div>
                        <First90Days />
                    </div>


                    {/* Section 3: Mindmap / Blueprint */}
                    {(() => {
                        let mindmapSrc = proposal.mindmap_url || proposal.mindmap_code;

                        // If the input is an iframe HTML, extract the src
                        if (mindmapSrc && mindmapSrc.includes('<iframe')) {
                            const srcMatch = mindmapSrc.match(/src=["']([^"']+)["']/);
                            if (srcMatch) mindmapSrc = srcMatch[1];
                        }

                        // Only convert Whimsical share URLs to embed (NOT already embed URLs)
                        if (mindmapSrc && mindmapSrc.includes('whimsical.com') && !mindmapSrc.includes('/embed/')) {
                            // Convert share URL like whimsical.com/my-board-ABC123 to embed/ABC123
                            const parts = mindmapSrc.split('/');
                            const lastPart = parts[parts.length - 1];
                            // Extract ID (might be after a dash or the whole last segment)
                            const id = lastPart.includes('-') ? lastPart.split('-').pop() : lastPart;
                            if (id) mindmapSrc = `https://whimsical.com/embed/${id}`;
                        }

                        const isValidUrl = mindmapSrc && (
                            mindmapSrc.includes('whimsical.com/embed') ||
                            mindmapSrc.includes('miro.com') ||
                            mindmapSrc.includes('figma.com')
                        );

                        if (!isValidUrl && !proposal.mindmap_embed) return null;

                        return (
                            <section className="space-y-6 pt-8 border-t border-zinc-100">
                                <div className="flex items-center justify-center gap-2 mb-8">
                                    <span className="w-2 h-2 bg-zinc-300"></span>
                                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-[0.2em] text-center">Arquitetura da Solução</h3>
                                </div>
                                <div className="w-full aspect-[16/9] bg-white rounded-[2px] border border-zinc-200 shadow-sm overflow-hidden transition-shadow duration-500">
                                    {isValidUrl ? (
                                        <iframe src={mindmapSrc} className="w-full h-full border-none" title="Blueprint" />
                                    ) : (
                                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(proposal.mindmap_embed || '') }} className="w-full h-full" />
                                    )}
                                </div>
                            </section>
                        );
                    })()}

                    {/* Section 4: Detailed Scope (IMPROVED LAYOUT) */}
                    {proposal.detailed_scope && (
                        <section id="roadmap" className="max-w-5xl mx-auto pt-8 space-y-12">
                            <div className="text-center space-y-4">
                                <h3 className="text-3xl font-black text-zinc-900 tracking-tighter">Roadmap de Execução</h3>
                                <p className="text-zinc-500 max-w-lg mx-auto text-sm">
                                    O detalhamento técnico das fases, entregáveis e objetivos estratégicos do projeto.
                                </p>
                            </div>

                            {/* ROADMAP DISPLAY COMPONENT */}
                            <RoadmapDisplay scope={proposal.detailed_scope} proposal={proposal} />
                        </section>
                    )}

                    {/* Testimonials Carousel (Before Pricing) */}
                    <section className="pt-16 pb-8 border-t border-zinc-100/50 print:hidden">
                        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-8">
                            <Quote className="w-5 h-5 text-zinc-400" />
                            <h2 className="text-xl font-black text-zinc-900 tracking-tight">O que dizem sobre nós</h2>
                        </div>

                        <div ref={testimonialsRef} className="flex overflow-x-auto pb-8 gap-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent px-1">
                            {Object.values(casesData)
                                .filter(c => c.quote && c.quote.length > 20)
                                .map((c, index) => (
                                    <div key={index} className="snap-center shrink-0 w-[85vw] md:w-[400px] bg-white p-8 rounded-[4px] border border-zinc-100 shadow-sm transition-all space-y-6 flex flex-col justify-between select-none">
                                        <div className="space-y-4">
                                            <Quote className="w-6 h-6 text-zinc-200" />
                                            <p className="text-sm text-zinc-600 leading-relaxed italic">
                                                "{c.quote}"
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 pt-4 border-t border-zinc-50">
                                            {c.authorImage ? (
                                                <img src={c.authorImage} alt={c.author} className="w-10 h-10 rounded-full object-cover grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-400">
                                                    {c.author.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs font-bold text-zinc-900">{c.author}</p>
                                                <p className="text-xxs text-zinc-500 uppercase tracking-wide">{c.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </section>

                    {/* Section 5: Calendar + Pricing Grid */}
                    <section className="pt-12 border-t border-zinc-100/50">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

                            {/* LEFT: Assinatura Digital (Substitui o Calendar) */}
                            <div className="lg:col-span-8 order-2 lg:order-1 flex flex-col space-y-5">
                                <div className="h-20 flex flex-col justify-end">
                                    <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest leading-none">Formalização do Acordo</h2>
                                    <p className="text-mini text-zinc-500 mt-2.5 leading-relaxed">Assinatura eletrônica e liberação imediata do espaço de trabalho.</p>
                                </div>
                                <div className="flex-grow">
                                    {proposal.status === 'paid' ? (
                                        <div className="w-full h-full min-h-[500px] bg-green-50/50 rounded-[4px] border border-green-200 overflow-hidden shadow-sm flex flex-col items-center justify-center p-12 text-center relative">
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-multiply"></div>
                                            <div className="z-10 bg-white p-4 shadow-sm border border-green-100 mb-6">
                                                <div className="w-20 h-20 bg-green-500 flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
                                                    <CheckCircle2 className="w-10 h-10 text-white" />
                                                </div>
                                            </div>
                                            <h3 className="z-10 text-3xl font-black text-green-900 tracking-tight mb-4">Projeto Aprovado & Pago Oficialmente</h3>
                                            <p className="z-10 text-base text-green-800/80 max-w-md mx-auto leading-relaxed mb-8">
                                                Sua máquina de receita já começou a ser arquitetada. A equipe estruturará o seu <b>Hub do Projeto</b> nas próximas horas.
                                            </p>
                                            <div className="z-10 flex flex-col items-center space-y-2 bg-white/80 backdrop-blur-sm p-4 border border-green-100">
                                                <p className="text-xs text-green-700 font-medium uppercase tracking-widest">Assinado por</p>
                                                <p className="text-sm font-bold text-zinc-900">{proposal.crm_data?.signed_by || 'Cliente'}</p>
                                                <p className="text-tiny text-zinc-500">{proposal.crm_data?.signed_role || 'Diretoria'}</p>
                                            </div>
                                        </div>
                                    ) : proposal.status === 'approved' ? (
                                        <div className="w-full h-full min-h-[500px] bg-zinc-50 border border-zinc-200 overflow-hidden shadow-sm flex flex-col items-center justify-center p-12 text-center relative max-w-xl mx-auto">
                                            <div className="z-10 bg-white p-4 border border-zinc-200 shadow-sm mb-6">
                                                <div className="w-20 h-20 bg-zinc-900 flex items-center justify-center">
                                                    <CheckCircle2 className="w-10 h-10 text-white" />
                                                </div>
                                            </div>
                                            <h3 className="z-10 text-3xl font-black text-zinc-900 tracking-tight mb-4">Acordo Oficializado</h3>
                                            <p className="z-10 text-sm text-zinc-600 max-w-md mx-auto leading-relaxed mb-8">
                                                A Assinatura Eletrônica sob o nome de <b>{proposal.crm_data?.signed_by || 'Cliente'}</b> foi registrada com sucesso.
                                                O time RevHackers entrará em contato para os próximos passos.
                                            </p>

                                            <div className="z-10 w-full flex flex-col items-center max-w-xs mx-auto">
                                                {proposal.crm_data?.certificate_hash && (
                                                    <Button 
                                                        onClick={() => window.open(`/legal/certificado/${proposal.crm_data.certificate_hash}`, '_blank')}
                                                        className="w-full h-12 bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200 mb-4 font-bold uppercase tracking-widest text-xxs shadow-sm rounded-sm transition-all"
                                                    >
                                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                                        Ver Certificado Legal
                                                    </Button>
                                                )}
                                                <p className="text-xxs text-zinc-500 mt-4 uppercase tracking-widest font-bold flex items-center gap-1">
                                                    <ShieldCheck className="w-3 h-3 text-zinc-400" /> Documento protegido e registrado
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full min-h-[500px] flex flex-col relative max-w-xl mx-auto">
                                            {/* Injecting the Deal Room Global Signature Shield */}
                                            <SignatureEngine 
                                                projectId={proposal.project_id}
                                                referenceType="proposal"
                                                referenceId={proposal.id}
                                                documentContentToHash={JSON.stringify({ 
                                                    scope: proposal.detailed_scope,
                                                    investment: proposal.investment_total,
                                                    terms: proposal.payment_terms
                                                })}
                                                onSuccess={(signerData) => handleAcceptProposal(signerData)}
                                            />
                                            
                                            <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col items-center">
                                                <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wide mb-3 block text-center">Contrato de Prestação de Serviços (SLA)</Label>
                                                <div className="w-full">
                                                    <DynamicContract proposal={proposal} />
                                                </div>
                                            </div>

                                            <div className="mt-8 flex items-center justify-center gap-2 text-xxs text-zinc-400 font-medium uppercase tracking-widest border-t border-zinc-100 pt-6">
                                                <ShieldCheck className="w-3.5 h-3.5" /> Site Seguro com Criptografia SSL 256-bit
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT: Pricing */}
                            <div className="lg:col-span-4 order-1 lg:order-2 flex flex-col space-y-5">
                                <div className="h-20 flex flex-col justify-end">
                                    <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest leading-none">Proposta Comercial</h2>
                                    <p className="text-mini text-zinc-500 mt-2.5 leading-relaxed">Valores e condições de investimento</p>
                                </div>
                                <div className="flex-grow flex flex-col bg-white rounded-[4px] border border-zinc-200 overflow-hidden shadow-sm">
                                    {/* Content Section */}
                                    <div className="flex-grow flex flex-col">
                                        {/* SERVIÇOS */}
                                        <div className="p-8">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Serviços RevHackers</h3>
                                                <span className="text-xxs text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                                                    {proposal.crm_data?.project_duration ? `${proposal.crm_data.project_duration} Meses` : '8 Semanas'}
                                                </span>
                                            </div>

                                            <div className="space-y-3 mb-5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-zinc-600">Setup Estratégico</span>
                                                    <span className="text-sm font-medium text-zinc-900">
                                                        R$ {Number(proposal.setup_fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-zinc-600">Fee Mensal ({proposal.installment_count}x)</span>
                                                    <span className="text-sm font-medium text-zinc-900">
                                                        R$ {Number(proposal.installment_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="border-t border-zinc-200 pt-4 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-semibold text-zinc-900">Total Serviços</span>
                                                    <span className="text-xl font-bold text-zinc-900">
                                                        R$ {Number(proposal.investment_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                                    </span>
                                                </div>
                                                <div className="bg-zinc-50 rounded px-3 py-2">
                                                    <p className="text-xs text-zinc-600">
                                                        Parcelável em até <span className="font-semibold">12x no cartão</span>
                                                    </p>
                                                    <p className="text-xxs text-zinc-500 mt-0.5">com juros da operadora</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* PLATAFORMA (if applicable) */}
                                        {(() => {
                                            const planId = proposal.crm_data?.funnel_plan || 'none';

                                            if (planId === 'none') return <div className="flex-grow" />;

                                            let basePrice = 697;
                                            if (planId.includes('497')) basePrice = 497;
                                            if (planId.includes('297')) basePrice = 297;
                                            if (planId.includes('997')) basePrice = 997;

                                            const discountPercent = proposal.crm_data?.platform_discount_percent || 0;
                                            const finalPrice = discountPercent > 0 ? basePrice * (1 - discountPercent / 100) : basePrice;
                                            const isAnnual = planId.includes('annual');

                                            return (
                                                <div className="p-8 border-t border-zinc-100 flex-grow flex flex-col">
                                                    <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-4">Plataforma Funnels</h3>

                                                    <div className="space-y-3 mb-5">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-zinc-600">Licença {isAnnual ? 'Anual' : 'Mensal'}</span>
                                                            <span className="text-sm font-medium text-zinc-900">
                                                                R$ {finalPrice.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/{isAnnual ? 'ano' : 'mês'}
                                                            </span>
                                                        </div>
                                                        {discountPercent > 0 && (
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-zinc-600">Desconto aplicado</span>
                                                                <span className="text-sm font-medium text-zinc-900">-{discountPercent}%</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isAnnual ? (
                                                        <div className="border-t border-zinc-200 pt-4 space-y-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm font-semibold text-zinc-900">Total Anual</span>
                                                                <span className="text-xl font-bold text-zinc-900">
                                                                    R$ {finalPrice.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                                                </span>
                                                            </div>
                                                            <div className="bg-zinc-50 rounded px-3 py-2">
                                                                <p className="text-xs text-zinc-600">
                                                                    Parcelável em <span className="font-semibold">12x sem juros</span> no cartão
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="border-t border-zinc-200 pt-4 space-y-3">
                                                            {proposal.crm_data?.funnel_promo_active ? (
                                                                <>
                                                                    <div className="flex justify-between items-center bg-[#03FC3B]/10 px-3 py-2 border border-[#03FC3B]/30">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xxs font-bold text-zinc-900 uppercase tracking-tight">Primeiro Mês</span>
                                                                            <span className="text-xs text-zinc-500">Bonificação Ativa</span>
                                                                        </div>
                                                                        <span className="text-lg font-bold text-zinc-900">GRÁTIS</span>
                                                                    </div>
                                                                    <p className="text-xxs text-zinc-500 text-center">
                                                                        R$ {finalPrice.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/mês após os primeiros 30 dias
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-sm font-semibold text-zinc-900">Mensalidade</span>
                                                                    <span className="text-xl font-bold text-zinc-900">
                                                                        R$ {finalPrice.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="mt-6 pt-6 border-t border-zinc-100">
                                                        <p className="text-xxs text-zinc-400 leading-tight">
                                                            Acesso completo à plataforma Funnels, incluindo CRM, dashboards em tempo real, automações ilimitadas e suporte prioritário.
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Terms - NOW INSIDE CARD */}
                                    <div className="p-8 pt-0 mt-auto">
                                        <div className="pt-4 border-t border-zinc-100/50">
                                            <p className="text-xxs text-zinc-400 uppercase tracking-widest font-bold mb-2">Condições Gerais</p>
                                            <p className="text-tiny text-zinc-500 leading-relaxed italic">
                                                * {proposal.payment_terms || "Pagamento do setup em D+5. Mensalidades via boleto ou cartão."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </PageLayout>
    );
}
