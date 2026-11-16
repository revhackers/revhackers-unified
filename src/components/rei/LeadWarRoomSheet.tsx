import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
    Loader2, Building2, Globe, Users, Sparkles, BrainCircuit,
    ArrowRight, CheckCircle2, Flame, UserCircle, Target, Briefcase, Activity, Linkedin, ShieldCheck,
    RefreshCw, Mail, Search, Edit3, Save, PlayCircle, FileText, UserPlus, Trash2, HeartHandshake, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ProposalForm from '@/components/admin/ProposalForm';
import { AIProvider } from '@/contexts/AIContext';
import { Stakeholder } from '@/types/pipeline';
import { leadWarRoomGcpAdapter } from '@/api/adapters/lead-war-room-gcp';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadSummary {
    id: string;
    name: string;
    company: string;
    type: string;
    urgencyScore: number;
    maturityPct: number;
    nextAction: string;
    daysSinceActivity: number;
    opportunity_data?: any;
    status?: string;
}

interface FullLeadData {
    client_name: string;
    client_company: string | null;
    client_email: string;
    client_site: string | null;
    trade_name: string | null;
    type: string;
    enrichment_data: any;
    market_data: any;
    site_analysis: any;
    opportunity_data?: any;
}

interface LeadWarRoomSheetProps {
    lead: LeadSummary | null;
    open: boolean;
    onClose: () => void;
    onQualified: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
    consulting: '360 Growth', founder: 'LinkedIn / Founder',
    dev: 'Site & Conversao', crm_ops: 'RevOps / CRM', funnels_impl: 'Funis de Aquisicao',
};

function ScoreMini({ score, label }: { score: number; label: string }) {
    const color = score >= 90 ? '#00CC6A' : score >= 50 ? '#71717a' : '#a1a1aa';
    const r = 12;
    const circ = 2 * Math.PI * r;
    return (
        <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 shrink-0">
                <svg viewBox="0 0 28 28" className="w-full h-full -rotate-90">
                    <circle cx="14" cy="14" r={r} fill="none" stroke="#f4f4f5" strokeWidth="3" />
                    <circle
                        cx="14" cy="14" r={r} fill="none"
                        stroke={color} strokeWidth="3"
                        strokeDasharray={`${(score / 100) * circ} ${circ}`}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-zinc-900">{score}</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const LeadWarRoomSheet: React.FC<LeadWarRoomSheetProps> = ({
    lead, open, onClose, onQualified
}) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [fullData, setFullData] = useState<FullLeadData | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [qualifying, setQualifying] = useState(false);
    const [enriching, setEnriching] = useState(false);

    // War Room 2.0 States
    const [cnpjInput, setCnpjInput] = useState('');
    const [fetchingCnpj, setFetchingCnpj] = useState(false);
    
    // Notes History State
    const [warNotesList, setWarNotesList] = useState<any[]>([]);
    const [newNote, setNewNote] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    // Stakeholders State
    const [showStakeholderForm, setShowStakeholderForm] = useState(false);
    const [stakeholderToEdit, setStakeholderToEdit] = useState<Stakeholder | null>(null);
    const [localStakeholders, setLocalStakeholders] = useState<Stakeholder[]>([]);
    const [stType, setStType] = useState<'decision_maker'|'influencer'|'champion'|'blocker'|'other'>('decision_maker');
    const [stName, setStName] = useState('');
    const [stEmail, setStEmail] = useState('');
    const [stRole, setStRole] = useState('');
    const [savingStakeholder, setSavingStakeholder] = useState(false);

    // Viewer Modal State
    const [manualTradeName, setManualTradeName] = useState('');
    const [savingTradeName, setSavingTradeName] = useState(false);

    // Meeting Recordings State
    const [meetings, setMeetings] = useState<any[]>([]);

    // Carrega dados completos quando o sheet abre
    useEffect(() => {
        if (open && lead?.id) {
            loadFullData(lead.id);
            loadMeetings(lead.id);

            if (lead.opportunity_data?.stakeholders) {
                setLocalStakeholders(lead.opportunity_data.stakeholders);
            } else {
                setLocalStakeholders([]);
            }
        } else {
            setFullData(null);
            setLocalStakeholders([]);
            setMeetings([]);
            setCnpjInput('');
            setNewNote('');
        }
    }, [open, lead?.id]);

    useEffect(() => {
        const notes = fullData?.market_data?.war_notes;
        if (notes) {
            if (Array.isArray(notes)) {
                setWarNotesList(notes);
            } else if (typeof notes === 'string') {
                setWarNotesList([{ id: crypto.randomUUID(), author: 'Sistema (Legado)', date: new Date().toISOString(), content: notes }]);
            }
        } else {
            setWarNotesList([]);
        }
    }, [fullData]);

    const loadFullData = async (projectId: string) => {
        setLoadingData(true);
        try {
            const data = await leadWarRoomGcpAdapter.getProjectFullData(projectId);
            setFullData((data as any) || null);
            setManualTradeName((data as any)?.trade_name || '');
        } catch (e) {
            console.error('[LeadWarRoomSheet] loadFullData error:', e);
        } finally {
            setLoadingData(false);
        }
    };

    const loadMeetings = async (projectId: string) => {
        try {
            const data = await leadWarRoomGcpAdapter.getMeetings(projectId);
            setMeetings(data || []);
        } catch (e) {
            console.error('[LeadWarRoomSheet] loadMeetings error:', e);
        }
    };

    // ── Enriquecer agora ─────────────────────────────────────────────────────

    const handleEnrich = async () => {
        if (!lead?.id) return;
        setEnriching(true);
        try {
            await leadWarRoomGcpAdapter.enrichProject(lead.id);
            toast.success('Dados atualizados!');
            await loadFullData(lead.id);
        } catch (e: any) {
            toast.error('Falha no enriquecimento');
        } finally {
            setEnriching(false);
        }
    };

    // ── Injeção Manual de CNPJ (BrasilAPI - Offline do Edge Function) ──
    const handleFetchCnpjOffline = async () => {
        const clean = cnpjInput.replace(/\D/g, '');
        if (clean.length !== 14) return toast.error('CNPJ Invalido. Digite 14 numeros.');
        setFetchingCnpj(true);
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
            const data = await res.json();
            if (data.message) throw new Error(data.message);
            
            const enrich = fullData?.enrichment_data || {};
            const newData = { ...enrich, cnpj: data };
            await leadWarRoomGcpAdapter.updateProjectEnrichment(lead!.id, newData);
            
            toast.success('CNPJ Enriquecido com sucesso!');
            await loadFullData(lead!.id);
        } catch (e: any) {
            toast.error(e.message || 'Erro ao buscar CNPJ');
        } finally {
            setFetchingCnpj(false);
        }
    };

    // ── Atualizar Nome Fantasia Manual ──
    const handleSaveTradeName = async () => {
        if (!lead?.id || !manualTradeName.trim()) return;
        setSavingTradeName(true);
        try {
            await leadWarRoomGcpAdapter.updateProjectTradeName(lead.id, manualTradeName.trim());
            toast.success('Nome Fantasia guardado e propagado no funil!');
            await loadFullData(lead.id);
        } catch (e) {
            toast.error('Geral falhou na gravação.');
        } finally {
            setSavingTradeName(false);
        }
    };

    // ── Adicionar War Note na Timeline ──
    const handleAddNote = async () => {
        if (!lead?.id || !newNote.trim()) return;
        setSavingNotes(true);
        try {
            const authorName = user?.email?.split('@')[0] || 'Consultor';

            const newNoteObj = {
                id: crypto.randomUUID(),
                author: authorName,
                date: new Date().toISOString(),
                content: newNote.trim()
            };

            const updatedList = [...warNotesList, newNoteObj];            
            const mkt = fullData?.market_data || {};
            mkt.war_notes = updatedList;

            await leadWarRoomGcpAdapter.updateProjectMarketData(lead.id, mkt);
            setNewNote('');
            toast.success('Nota registrada no Dossiê!');
            await loadFullData(lead.id);
        } catch(e) {
            toast.error('Erro ao salvar nota.');
        } finally {
            setSavingNotes(false);
        }
    };

    // ── Adicionar Stakeholder ──
    const handleSaveStakeholder = async () => {
        if (!lead?.id || !stName.trim()) return;
        const st: Stakeholder = {
            id: crypto.randomUUID(),
            name: stName.trim(),
            email: stEmail.trim() || '',
            role: stRole.trim() || '',
            type: stType
        };
        const updated = [...localStakeholders, st];
        setLocalStakeholders(updated);
        
        try {
            const oppData = lead?.opportunity_data || {};
            await leadWarRoomGcpAdapter.updateOpportunityStakeholders(lead.id, oppData, updated);
            setStName(''); setStEmail(''); setStRole(''); setStType('decision_maker');
            setShowStakeholderForm(false);
            toast.success('Stakeholder adicionado!');
        } catch(e) {
            toast.error('Erro ao salvar no banco');
        }
    };

    // ── Remover Stakeholder ──
    const handleRemoveStakeholder = async (id: string) => {
        if (!lead?.id) return;
        setSavingStakeholder(true);
        try {
            const oppData = fullData?.opportunity_data || {};
            const existing = (oppData.stakeholders || []) as Stakeholder[];
            const updated = existing.filter(s => s.id !== id);
            await leadWarRoomGcpAdapter.updateOpportunityStakeholders(lead.id, oppData, updated);
            toast.success('Stakeholder removido.');
            await loadFullData(lead.id);
        } catch(e) {
            toast.error('Erro ao remover stakeholder.');
        } finally {
            setSavingStakeholder(false);
        }
    };

    // ── Qualificar como Cliente Pago ─────────────────────────────────────────

    const handleQualify = async () => {
        if (!lead?.id || !fullData) return;
        setQualifying(true);
        try {
            const nameToSearch = fullData.trade_name || fullData.client_company || lead.name;
            await leadWarRoomGcpAdapter.qualifyLead(lead.id, nameToSearch, fullData);

            toast.success(`Contrato Fechado: ${lead.name}`, {
                description: 'Iniciando Engenharia e Setup de Onboarding...',
            });

            onQualified();
            onClose();

            // 2. Redireciona o consultor cruzando a ponte para a "Caixa 3" (Onde ele seta prazo e trimestre)
            setTimeout(() => navigate(`/admin/rei/edit/${lead.id}`), 400);

        } catch (e: any) {
            console.error('[LeadWarRoomSheet] qualify error:', e);
            toast.error('Erro ao fechar contrato', { description: e.message });
        } finally {
            setQualifying(false);
        }
    };

    const cnpj      = fullData?.enrichment_data?.cnpj ?? null;
    const sitePerf  = fullData?.enrichment_data?.site_perf ?? null;
    const market    = fullData?.market_data ?? null;
    const osint     = fullData?.market_data?.linkedin_osint ?? null;
    const hasData   = !!cnpj || !!sitePerf || !!market || !!osint;

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[540px] p-0 flex flex-col overflow-hidden bg-white border-l border-zinc-200"
            >
                {/* ── Header ─────────────────────────────────────────────── */}
                <SheetHeader className="px-6 pt-6 pb-5 border-b border-zinc-100 shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded">
                                    {lead ? (TYPE_LABELS[lead.type] ?? lead.type) : '-'}
                                </span>
                                {lead && lead.urgencyScore >= 70 && (
                                    <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Flame className="w-2.5 h-2.5" /> urgente
                                    </span>
                                )}
                            </div>
                            <SheetTitle className="text-xl font-black text-zinc-900 tracking-tight leading-tight">
                                {lead?.name ?? 'Carregando...'}
                            </SheetTitle>
                            <SheetDescription className="text-xs font-medium text-zinc-400 mt-0.5">
                                War Room - Dossi de Vendas
                            </SheetDescription>
                        </div>
                        <button
                            onClick={handleEnrich}
                            disabled={enriching}
                            className="w-8 h-8 border border-zinc-200 rounded-lg flex items-center justify-center hover:bg-zinc-50 transition-colors shrink-0"
                            title="Atualizar CNPJ + Performance do Site"
                        >
                            {enriching
                                ? <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
                                : <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                            }
                        </button>
                    </div>

                    {/* Metricas rapidas */}
                    {lead && (
                        <div className="flex items-center gap-5 mt-4">
                            <ScoreMini score={lead.maturityPct} label="REI Score" />
                            {sitePerf && <ScoreMini score={sitePerf.performance_score ?? 0} label="Site PSI" />}
                            <div className="ml-auto text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Inativo</p>
                                <p className={cn('text-lg font-black', lead.daysSinceActivity > 7 ? 'text-zinc-500' : 'text-zinc-700')}>
                                    {lead.daysSinceActivity}d
                                </p>
                            </div>
                        </div>
                    )}
                </SheetHeader>

                {/* ── Scrollable body ────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                    {loadingData ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 text-zinc-300 animate-spin" />
                        </div>
                    ) : (
                        <div className="px-6 py-5 space-y-5">

                            {/* Proxima acao */}
                            {lead?.nextAction && (
                                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
                                    <Sparkles className="w-4 h-4 text-zinc-400 shrink-0" />
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Proxima Acao</p>
                                        <p className="text-sm font-bold text-zinc-900">{lead.nextAction}</p>
                                    </div>
                                </div>
                            )}

                            {/* Dados basicos do lead */}
                            {fullData && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Contatos e Stakeholders</p>
                                        <button 
                                            onClick={() => setShowStakeholderForm(true)}
                                            className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                                        >
                                            <UserPlus className="w-3 h-3" /> Adicionar
                                        </button>
                                    </div>

                                    {/* Primary Contact (Legacy fields) */}
                                    <div className="border border-zinc-200 p-3 bg-zinc-50 flex flex-col gap-1 relative">
                                        <div className="absolute top-0 right-0 px-2 py-0.5 bg-zinc-900 border-l border-b border-zinc-200">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white">Contato Principal</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-black text-zinc-900 mt-1">
                                            <UserCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                            <span className="truncate">{fullData.client_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                                            <Mail className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                            <span className="truncate">{fullData.client_email}</span>
                                        </div>
                                        {fullData.client_company && (
                                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                                                <Building2 className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                                <span className="truncate">{fullData.client_company}</span>
                                            </div>
                                        )}
                                        {fullData.client_site && (
                                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                                                <Globe className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                                <span className="truncate">{fullData.client_site}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Outros Stakeholders */}
                                    {localStakeholders.map((st: Stakeholder) => (
                                        <div key={st.id} className="border border-zinc-200 p-3 bg-white flex flex-col gap-1 relative group">
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => window.confirm('Remover stakeholder?') && handleRemoveStakeholder(st.id)} className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-red-500 mt-[-4px] mr-[-4px]">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="flex items-center flex-wrap gap-2 text-sm font-black text-zinc-800">
                                                <span className="truncate">{st.name}</span>
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border flex items-center gap-1",
                                                    st.type === 'decision_maker' ? 'border-[#03FC3B] bg-[#03FC3B]/10 text-zinc-900' :
                                                    st.type === 'influencer' ? 'border-yellow-400 bg-yellow-400/10 text-zinc-900' :
                                                    st.type === 'champion' ? 'border-zinc-400 bg-zinc-100 text-zinc-900' :
                                                    st.type === 'blocker' ? 'border-zinc-700 bg-zinc-200 text-zinc-900' :
                                                    'border-zinc-300 bg-zinc-100 text-zinc-600'
                                                )}>
                                                    {st.type === 'decision_maker' && <ShieldCheck className="w-2.5 h-2.5" />}
                                                    {st.type === 'influencer' && <Users className="w-2.5 h-2.5" />}
                                                    {st.type === 'champion' && <HeartHandshake className="w-2.5 h-2.5" />}
                                                    {st.type === 'blocker' && <EyeOff className="w-2.5 h-2.5" />}
                                                    {st.type === 'decision_maker' ? 'Decisor Econômico' :
                                                     st.type === 'influencer' ? 'Influenciador' :
                                                     st.type === 'champion' ? 'Campeão' :
                                                     st.type === 'blocker' ? 'Detrator' : 'Stakeholder'}
                                                </span>
                                            </div>
                                            {st.role && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                                                    <Briefcase className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                                    <span className="truncate">{st.role}</span>
                                                </div>
                                            )}
                                            {st.email && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                                                    <Mail className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                                    <span className="truncate">{st.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Stakeholder Ad hoc Form */}
                                    {showStakeholderForm && (
                                        <div className="border border-zinc-200 p-3 bg-zinc-50">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-3">Novo Stakeholder</p>
                                            <div className="space-y-3">
                                                <input 
                                                    type="text" value={stName} onChange={e => setStName(e.target.value)}
                                                    placeholder="Nome Completo *" className="w-full text-xs font-bold bg-white border border-zinc-200 p-2 outline-none focus:border-zinc-900" 
                                                />
                                                <input 
                                                    type="text" value={stRole} onChange={e => setStRole(e.target.value)}
                                                    placeholder="Cargo (Ex: Diretor MKT)" className="w-full text-xs bg-white border border-zinc-200 p-2 outline-none focus:border-zinc-900" 
                                                />
                                                <input 
                                                    type="email" value={stEmail} onChange={e => setStEmail(e.target.value)}
                                                    placeholder="E-mail" className="w-full text-xs bg-white border border-zinc-200 p-2 outline-none focus:border-zinc-900" 
                                                />
                                                <select 
                                                    value={stType} onChange={(e: any) => setStType(e.target.value)}
                                                    className="w-full text-xs font-bold bg-white border border-zinc-200 p-2 outline-none focus:border-zinc-900"
                                                >
                                                    <option value="decision_maker">👑 Decisor Econômico</option>
                                                    <option value="influencer">🗣️ Influenciador</option>
                                                    <option value="champion">🤝 Campeão (Advogado Interno)</option>
                                                    <option value="blocker">🛑 Detrator (Obstáculo)</option>
                                                    <option value="other">👤 Outro Comitê</option>
                                                </select>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <Button 
                                                        size="sm" onClick={handleSaveStakeholder} disabled={savingStakeholder || !stName.trim()}
                                                        className="h-8 flex-1 text-[9px] font-black uppercase tracking-widest bg-zinc-900 hover:bg-black text-white"
                                                    >
                                                        {savingStakeholder ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Save className="w-3 h-3 mr-1.5" />}
                                                        Salvar
                                                    </Button>
                                                    <Button 
                                                        size="sm" onClick={() => setShowStakeholderForm(false)}
                                                        className="h-8 w-12 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-500"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}

                            {/* CNPJ - Receita Federal */}
                            {cnpj ? (
                                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                                        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Receita Federal</span>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Razao Social',   value: cnpj.razao_social },
                                            { label: 'Situacao',       value: cnpj.situacao_cadastral },
                                            { label: 'Abertura',       value: cnpj.data_abertura ? new Date(cnpj.data_abertura).toLocaleDateString('pt-BR') : null },
                                            { label: 'Porte',          value: cnpj.porte },
                                            { label: 'Capital Social', value: cnpj.capital_social ? `R$ ${Number(cnpj.capital_social).toLocaleString('pt-BR')}` : null },
                                            { label: 'Municipio',      value: cnpj.municipio && cnpj.uf ? `${cnpj.municipio}/${cnpj.uf}` : null },
                                        ].filter(r => r.value).map(({ label, value }) => (
                                            <div key={label}>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
                                                <p className="text-xs font-bold text-zinc-800 mt-0.5 leading-snug">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {cnpj.cnae_principal && (
                                        <div className="px-4 pb-3 border-t border-zinc-50 pt-2">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">CNAE</p>
                                            <p className="text-xs font-bold text-zinc-800 mt-0.5">{cnpj.cnae_principal.codigo} - {cnpj.cnae_principal.descricao}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Injetar CNPJ / Enriquecer Receita</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            value={cnpjInput} onChange={e => setCnpjInput(e.target.value)}
                                            placeholder="Ex: 00.000.000/0001-00"
                                            className="flex-1 bg-white text-[13px] px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-400 transition-all shadow-sm"
                                        />
                                        <Button 
                                            onClick={handleFetchCnpjOffline} disabled={fetchingCnpj || !cnpjInput}
                                            className="bg-zinc-900 hover:bg-black text-white shrink-0 rounded-lg shadow-sm w-12"
                                        >
                                            {fetchingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] font-medium text-zinc-400 mt-2">Busca automática Societária, Econômica e Porte B2B</p>
                                </div>
                            )}

                            {/* FORÇAR NOME FANTASIA (MANUAL) */}
                            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Nome Fantasia (Manual)</span>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        value={manualTradeName} onChange={e => setManualTradeName(e.target.value)}
                                        placeholder="Se não tiver CNPJ, force a marca aqui..."
                                        className="flex-1 bg-white text-[13px] px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-400 transition-all shadow-sm"
                                    />
                                    <Button 
                                        onClick={handleSaveTradeName} disabled={savingTradeName || !manualTradeName.trim()}
                                        className="bg-zinc-900 hover:bg-black text-white shrink-0 rounded-lg shadow-sm w-12"
                                        title="Salvar Nome Fantasia"
                                    >
                                        {savingTradeName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-[10px] font-medium text-zinc-400 mt-2">Ao salvar, a entidade será atualizada em todo o RevOps.</p>
                            </div>

                            {/* GRAVAÇÕES DE REUNIÕES (REVNOTES AI) */}
                            {meetings.length > 0 && (
                                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <PlayCircle className="w-3.5 h-3.5 text-zinc-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Gravações de Pré-Venda (RevNotes AI)</span>
                                    </div>
                                    <div className="space-y-2">
                                        {meetings.map((m) => (
                                            <div key={m.id} className="bg-white border border-zinc-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
                                                <div className="min-w-0 pr-2">
                                                    <p className="text-[11px] font-black text-zinc-900 truncate">{m.title || 'Reunião C-Level'}</p>
                                                    <p className="text-[9px] font-medium text-zinc-400 mt-0.5">
                                                        {new Date(m.happened_at).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                                <Button 
                                                    size="sm"
                                                    onClick={() => window.open(`/admin/recording/${m.id}`, '_blank')}
                                                    className="shrink-0 h-7 px-3 bg-zinc-900 hover:bg-black text-white text-[9px] font-black uppercase tracking-widest gap-1.5"
                                                    title="Ver vídeo, inteligência extraída e transcrição"
                                                >
                                                    <PlayCircle className="w-3 h-3 text-[#FF004D]" /> Assistir RAW
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* WAR NOTES (Linha do Tempo de Reuniões) */}
                            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Histórico de Reunião (War Notes)</span>
                                </div>
                                
                                {/* Lista de Notas Históricas */}
                                {warNotesList.length > 0 && (
                                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                                        {warNotesList.map((note: any) => (
                                            <div key={note.id} className="bg-white border border-zinc-200 rounded-lg p-3 shadow-sm">
                                                <div className="flex justify-between items-center mb-1.5 opacity-80">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 truncate mr-2">{note.author}</span>
                                                    <span className="text-[9px] font-medium text-zinc-400 shrink-0">
                                                        {new Date(note.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] text-zinc-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Nova Nota Input */}
                                <div className="relative">
                                    <textarea 
                                        value={newNote} onChange={e => setNewNote(e.target.value)}
                                        placeholder="Registrar nova objeção ou orçamento mapeado..." 
                                        className="w-full bg-white text-zinc-700 text-[12px] placeholder:text-zinc-400 outline-none resize-none min-h-[90px] rounded-lg border border-zinc-200 p-3 pb-12 focus:border-zinc-400 transition-all shadow-sm"
                                    />
                                    <div className="absolute bottom-3 right-3">
                                        <Button 
                                            size="sm"
                                            onClick={handleAddNote} disabled={savingNotes || !newNote.trim()}
                                            className="h-7 text-[9px] font-black uppercase tracking-widest bg-zinc-900 text-white hover:bg-black rounded-md px-3 border border-transparent shadow-sm"
                                        >
                                            {savingNotes ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                                            Salvar Arquivo
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Site Performance */}
                            {sitePerf && (
                                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                                        <Globe className="w-3.5 h-3.5 text-zinc-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Performance do Site</span>
                                        <span className={cn(
                                            'ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded',
                                            (sitePerf.performance_score ?? 0) >= 90 ? 'text-[#00CC6A] bg-[#00CC6A]/10' :
                                            (sitePerf.performance_score ?? 0) >= 50 ? 'text-zinc-600 bg-zinc-100' : 'text-zinc-600 bg-zinc-100'
                                        )}>
                                            {sitePerf.rating ?? 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-4 grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Performance', value: sitePerf.performance_score != null ? `${sitePerf.performance_score}/100` : '-' },
                                            { label: 'SEO',         value: sitePerf.seo_score != null ? `${sitePerf.seo_score}/100` : '-' },
                                            { label: 'LCP',         value: sitePerf.lcp ?? '-' },
                                            { label: 'CLS',         value: sitePerf.cls ?? '-' },
                                            { label: 'FCP',         value: sitePerf.fcp ?? '-' },
                                            { label: 'TTI',         value: sitePerf.tti ?? '-' },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="bg-zinc-50 rounded-lg p-2 text-center">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
                                                <p className="text-sm font-black text-zinc-900 mt-0.5">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Inteligencia de Mercado (condensada) */}
                            {market && (
                                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                                        <BrainCircuit className="w-3.5 h-3.5 text-zinc-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Inteligencia de Mercado</span>
                                        <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-zinc-300">GPT-4.5</span>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {/* TAM/SAM/SOM */}
                                        {market.market_sizing && (
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { label: 'TAM', value: market.market_sizing.tam },
                                                    { label: 'SAM', value: market.market_sizing.sam },
                                                    { label: 'SOM', value: market.market_sizing.som },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="bg-zinc-50 rounded-lg p-2">
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
                                                        <p className="text-[10px] font-bold text-zinc-800 mt-0.5 leading-snug line-clamp-2">{value || '-'}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Top Persona */}
                                        {market.personas?.[0] && (
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1">
                                                    <Users className="w-3 h-3" /> ICP Principal
                                                </p>
                                                <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3">
                                                    <p className="text-xs font-black text-zinc-900">{market.personas[0].name} - {market.personas[0].role}</p>
                                                    <p className="text-[11px] font-medium text-zinc-500 mt-1 leading-snug">{market.personas[0].pain}</p>
                                                    <p className="text-[11px] text-zinc-400 italic mt-1.5 border-l-2 border-zinc-200 pl-2 leading-snug">"{market.personas[0].message}"</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Conselho estrategico */}
                                        {market.strategic_advice && (
                                            <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Conselho Estrategico</p>
                                                <p className="text-xs font-medium text-zinc-700 leading-relaxed">{market.strategic_advice}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* OSINT / LinkedIn Diagnostic (Foco do Vendedor) */}
                            {osint && (
                                <div className="border border-zinc-200 overflow-hidden shadow-sm">
                                    <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 bg-zinc-50">
                                        <Linkedin className="w-4 h-4 text-zinc-500" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Diagnóstico LinkedIn (OSINT)</span>
                                        {osint.authorityScore > 0 && (
                                            <span className="ml-auto text-[9px] font-black uppercase tracking-widest flex items-center gap-1 bg-white text-zinc-900 border border-zinc-200 px-2 py-0.5">
                                                <ShieldCheck className="w-3 h-3" /> Score {osint.authorityScore}/100
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {/* Header Humano */}
                                        <div className="flex items-start gap-4">
                                            {osint.profileImageUrl ? (
                                                <img src={osint.profileImageUrl} alt="Linkedin" className="w-12 h-12 rounded-full border border-zinc-200 shadow-sm shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                                    <UserCircle className="w-6 h-6 text-zinc-400" />
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="text-[13px] font-black text-zinc-900 tracking-tight leading-none mb-1">
                                                    {osint.fullName}
                                                </h4>
                                                <p className="text-[10px] font-medium text-zinc-500 leading-snug break-words line-clamp-2 pr-2">
                                                    {osint.headline}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Classificador GPT */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-white/80 border border-zinc-200 rounded-lg p-2.5 shadow-sm">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-0.5 flex items-center gap-1"><Target className="w-2.5 h-2.5" /> Arquétipo B2B</p>
                                                <p className="text-[11px] font-black text-zinc-900">{osint.archetype}</p>
                                            </div>
                                            <div className="bg-white/80 border border-zinc-200 rounded-lg p-2.5 shadow-sm">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-0.5 flex items-center gap-1"><Briefcase className="w-2.5 h-2.5" /> Estilo de Gestão</p>
                                                <p className="text-[11px] font-black text-zinc-800">{osint.managementStyle}</p>
                                            </div>
                                        </div>

                                        {/* Inteligência Executável */}
                                        <div className="bg-white/80 border border-zinc-200 rounded-lg p-3 shadow-sm">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-1"><BrainCircuit className="w-3 h-3 text-zinc-400" /> Diagnóstico & Playbook</p>
                                            <p className="text-xs font-medium text-zinc-700 leading-relaxed mb-2">{osint.summary}</p>
                                            
                                            <div className="bg-zinc-50 border-l-2 border-zinc-400 p-2 mt-2">
                                                <p className="text-[10px] text-zinc-800 italic leading-relaxed">
                                                    "{osint.actionableInsight}"
                                                </p>
                                            </div>
                                        </div>

                                        {/* Pain Points Visíveis (Blind Spots) */}
                                        {osint.blindSpots && osint.blindSpots.length > 0 && (
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center gap-1"><Activity className="w-2.5 h-2.5" /> Gaps Comerciais Identificados na Audiência</p>
                                                <ul className="space-y-1">
                                                    {osint.blindSpots.map((blind: string, i: number) => (
                                                        <li key={i} className="text-[10px] font-medium text-red-700/80 bg-red-50/50 border border-red-100/50 rounded px-2 py-1 leading-snug">
                                                            {blind}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!hasData && !loadingData && (
                                <div className="py-8 text-center">
                                    <BrainCircuit className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                                    <p className="text-sm font-black text-zinc-400 mb-1">Sem dados de inteligencia</p>
                                    <p className="text-xs font-medium text-zinc-300">Clique no refresh para carregar CNPJ e site.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer fixo - CTA ──────────────────────────────────── */}
                <div className="shrink-0 border-t border-zinc-100 px-6 py-5 bg-white space-y-3 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] relative z-10">
                    <Button
                        onClick={() => navigate(`/admin/proposals/new?${lead?.status === 'opportunity' ? 'opportunity_id' : 'project_id'}=${lead?.id}`)}
                        className="w-full bg-zinc-900 hover:bg-black text-white font-black uppercase tracking-widest text-[11px] rounded-xl h-12 gap-2 shadow-sm transition-all"
                    >
                        <FileText className="w-4 h-4 text-[#FF004D]" /> Criar Proposta
                    </Button>
                    <Button
                        onClick={handleQualify}
                        disabled={qualifying || !fullData}
                        className="w-full bg-[#00CC6A] hover:bg-[#00994f] text-white font-black uppercase tracking-widest text-[11px] rounded-xl h-12 gap-2 shadow-sm shadow-[#00CC6A]/20 transition-all"
                    >
                        {qualifying ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Registrando Acordo Financeiro...</>
                        ) : (
                            <>💰 Fechar Contrato & Iniciar Onboarding <ArrowRight className="w-4 h-4 ml-1" /></>
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default LeadWarRoomSheet;
