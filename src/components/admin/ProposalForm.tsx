import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Wand2, ArrowLeft, RefreshCw, Save, ExternalLink, Upload, FileText, Video, X, ShieldAlert, ListTree, CheckCircle2, AlertCircle, Code, ChevronDown, Presentation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadImageToSupabase } from '@/utils/uploadImageToSupabase';
import { useAI } from '@/contexts/AIContext';
import { Card, CardContent } from "@/components/ui/card";
import { GHL_EMBED_BASE, GHL_CALENDARS } from '@/config/ghl';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Wand2, ArrowLeft, RefreshCw, Save, ExternalLink, Upload, FileText, Video, X, ShieldAlert, ListTree, CheckCircle2, AlertCircle, Code, ChevronDown, Presentation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadImageToSupabase } from '@/utils/uploadImageToSupabase';
import { useAI } from '@/contexts/AIContext';
import { Card, CardContent } from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

interface ProposalFormValues {
    title: string;
    slug: string;
    client_name: string;
    client_contact_name?: string;
    client_email?: string;
    client_logo: string;
    recording_url: string;
    transcript: string;
    summary: string;
    investment_total: string;
    status: 'draft' | 'sent' | 'approved' | 'rejected';
    category: 'proposal';
    mindmap_code: string;
    setup_fee: string;
    installment_value: string;
    installment_count: string;
    loom_url?: string;
    mindmap_url?: string;
    manual_transcript?: string;
    headline?: string;
    subheadline?: string;
    brief_explanation?: string;
    mindmap_embed?: string;
    detailed_scope?: string;
    payment_terms?: string;
    crm_data?: any;
    proposal_source?: 'call' | 'bid';
    bid_document_url?: string;
    call_detail_summary?: string;
    agenda_link?: string;
    booking_url?: string;
    payment_link?: string;
}

interface ProposalFormProps {
    initialData?: any;
    isEditing?: boolean;
    isModal?: boolean;
    opportunityContext?: import('@/hooks/useOpportunityIntelligence').OpportunityContext | null;
}

const ProposalForm = ({ initialData, isEditing = false, isModal = false, opportunityContext }: ProposalFormProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [meetingHistory, setMeetingHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const { agents } = useAI();

    const { register, handleSubmit, setValue, getValues, watch, reset, formState: { errors } } = useForm<ProposalFormValues>({
        defaultValues: {
            title: initialData?.title || '',
            slug: initialData?.slug || '',
            client_name: initialData?.client_name || '',
            client_contact_name: initialData?.client_contact_name || '',
            client_email: initialData?.client_email || '',
            client_logo: initialData?.client_logo || '',
            recording_url: initialData?.recording_url || '',
            transcript: initialData?.transcript || '',
            summary: initialData?.summary || '',
            investment_total: initialData?.investment_total || '',
            status: initialData?.status || 'draft',
            category: initialData?.category || 'proposal',
            mindmap_code: initialData?.mindmap_code || 'graph TD; A[Desafio] --> B[Solução];',
            setup_fee: initialData?.setup_fee || '',
            installment_value: initialData?.installment_value || '',
            installment_count: initialData?.installment_count || '6',
            loom_url: initialData?.loom_url || '',
            mindmap_url: initialData?.mindmap_url || '',
            manual_transcript: initialData?.manual_transcript || '',
            headline: initialData?.headline || '',
            subheadline: initialData?.subheadline || '',
            brief_explanation: initialData?.brief_explanation || '',
            mindmap_embed: initialData?.mindmap_embed || '',
            detailed_scope: initialData?.detailed_scope || '',
            payment_terms: initialData?.payment_terms || '',
            proposal_source: initialData?.proposal_source || 'call',
            bid_document_url: initialData?.bid_document_url || '',
            call_detail_summary: initialData?.call_detail_summary || '', // Registered new field
            booking_url: initialData?.booking_url || `${GHL_EMBED_BASE}/widget/booking/${GHL_CALENDARS.diagnostico}`,
            crm_data: initialData?.crm_data || {
                pain_points: [],
                budget_range: '',
                decision_makers: '',
                urgency: '',
                next_steps: '',
                qualified_score: 5,
                funnel_plan: 'none',
                funnel_promo_active: false,
                project_duration: initialData?.crm_data?.project_duration || '3',
                payment_link: initialData?.crm_data?.payment_link || ''
            },
            payment_link: initialData?.crm_data?.payment_link || ''
        }
    });

    // Sync initialData completely when it populates
    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            // Keep existing form state (like dirty fields), but merge initialData
            const currentValues = getValues();
            reset({
                ...currentValues,
                ...initialData,
                crm_data: {
                    ...currentValues.crm_data,
                    ...(initialData.crm_data || {})
                }
            });
        }
    }, [initialData, reset, getValues]);

    // Draft System completely eradicated at user request to prevent popup lock-ins

    const watchedTitle = watch('title');
    const watchedSource = watch('proposal_source');

    useEffect(() => {
        if (!isEditing && watchedTitle) {
            const baseSlug = watchedTitle
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            // Add timestamp to ensure uniqueness
            const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;
            setValue('slug', uniqueSlug);
        }
    }, [watchedTitle, isEditing, setValue]);

    // [NEW] Sync Title with Client Name
    const clientName = watch('client_name');
    useEffect(() => {
        if (!isEditing && clientName) {
            const currentTitle = watch('title');
            // If title is empty or matches pattern, update it
            if (!currentTitle || currentTitle.includes('Proposta REVHACKERS x')) {
                setValue('title', `Proposta REVHACKERS x ${clientName}`);
            }
        }
    }, [clientName, isEditing, setValue, watch]);

    // [NEW] HTML Conversion Helper
    const convertTextToHtml = (text: string) => {
        if (!text) return '';
        const lines = text.split('\n');
        let html = '';
        let inList = false;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // List Items
            if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                if (!inList) {
                    html += '<ul class="space-y-2 mb-6 list-none">';
                    inList = true;
                }
                const content = trimmed.substring(1).trim();
                html += `<li class="flex items-start gap-3"><span class="w-1.5 h-1.5 rounded-full bg-revgreen mt-2 shrink-0"></span><span class="text-zinc-700">${content}</span></li>`;
            } else {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }

                // Headers (Uppercase)
                if (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && !trimmed.includes(':')) {
                    html += `<h3 class="text-xl font-bold text-zinc-900 mt-8 mb-4 tracking-tight">${trimmed}</h3>`;
                }
                // Bold Keys (Key: Value)
                else if (trimmed.includes(':') && trimmed.split(':')[0].length < 30) {
                    const parts = trimmed.split(':');
                    html += `<p class="mb-3 text-zinc-600"><strong class="text-zinc-900">${parts[0]}:</strong> ${parts.slice(1).join(':')}</p>`;
                }
                // Paragraphs
                else {
                    html += `<p class="mb-4 text-zinc-600 leading-relaxed">${trimmed}</p>`;
                }
            }
        });

        if (inList) html += '</ul>';
        return html;
    };

    // AI Helper: Convert Text/HTML to JSON Cards
    const handleConvertToCards = async () => {
        const currentScope = getValues('detailed_scope');
        if (!currentScope) {
            toast({ title: 'Erro', description: "O campo de escopo está vazio.", variant: 'destructive' });
            return;
        }

        try {
            setLoading(true);
            toast({ title: 'Processando', description: "A IA está estruturando seu texto em Cards Visuais..." });

            const { data, error } = await supabase.functions.invoke('agent-chat', {
                body: {
                    messages: [{
                        role: 'system',
                        content: ` Você é um Consultor Estratégico de Receita (Revenue Operations).
MISSÃO: Transformar o contexto da proposta em um ROADMAP VISUAL de exatamente 8 SEMANAS.

REGRAS DE OURO:
1. O conteúdo deve ser 100% PERSONALIZADO para o cliente em questão, usando termos técnicos discutidos na call.
2. Não use placeholders ou textos genéricos.
3. Idioma: Português (Brasil).
4. Estruture em 5 fases lógicas que cubram as 8 semanas.

FORMATO JSON OBRIGATÓRIO (RETORNE APENAS O ARRAY):
[
  {
    "phase": "Fase 1: Título Criativo",
    "duration": "Semana 1",
    "description": "Explicação clara e objetiva do que será feito.",
    "deliverables": ["Entregável 1", "Entregável 2"],
    "status": "pending"
  }
]`
                    }, {
                        role: 'user',
                        content: `TEXTO PARA CONVERSÃO EM CARDS:\n\n${currentScope}\n\n---\nBaseado no texto acima, gere as 5 fases da implementação de 8 semanas no formato JSON solicitado.`
                    }],
                    model: 'gpt-4o'
                }
            });

            if (error) throw error;

            const content = data?.response || data?.choices?.[0]?.message?.content || "";
            let cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            // Try to extract array if wrapped
            const firstBracket = cleanJson.indexOf('[');
            const lastBracket = cleanJson.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1) {
                cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
            }

            // Validate
            JSON.parse(cleanJson);

            setValue('detailed_scope', cleanJson);
            toast({ title: 'Sucesso', description: "Texto convertido em Cards Visuais com sucesso!" });

        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: "Falha ao converter texto. Tente simplificar o conteúdo.", variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const updateFieldsWithMetadata = (m: any, force = false) => {
        if (!m) return;

        let cName = m.clientName;
        if (!cName && (m.name || m.title)) {
            const n = m.name || m.title;
            if (n.includes('with')) {
                const parts = n.split('with');
                cName = parts[parts.length - 1].trim();
            }
            else if (n.includes(' x ')) cName = n.split(' x ')[0].toLowerCase().includes('revhackers') ? n.split(' x ')[1].trim() : n.split(' x ')[0].trim();
            else if (n.includes('>')) cName = n.split('>')[1].trim();
            else if (n.includes('-')) {
                const parts = n.split('-');
                cName = parts[parts.length - 1].trim();
            } else {
                cName = n.replace('Reunião de ', '').replace('Kickoff ', '').trim();
            }
        }

        const shouldSet = (field: keyof ProposalFormValues) => {
            const current = watch(field);
            return force || !current || current === "" || current === "0" || current === 0;
        };

        const INTERNAL_NAMES = ['Giulliano', 'RevHackers', 'Bot', 'Notetaker'];
        const isInternal = (str: string) => str && INTERNAL_NAMES.some(i => str.toLowerCase().includes(i.toLowerCase()));

        // 1. Find Valid External Participant
        let validContactName = m.clientContactName;
        let validEmail = m.clientEmail;

        const allParticipants = m.participants || m.attendees || [];
        if (Array.isArray(allParticipants) && allParticipants.length > 0) {
            // Find first person who is NOT internal
            const externalPerson = allParticipants.find((p: any) => {
                const n = p.name || p.display_name || "";
                const e = p.email || p.emailAddress || "";
                return (n && !isInternal(n)) || (e && !isInternal(e));
            });

            if (externalPerson) {
                validContactName = externalPerson.name || externalPerson.display_name || validContactName;
                validEmail = externalPerson.email || externalPerson.emailAddress || validEmail;
            }
        }

        if (cName && shouldSet('client_name') && !isInternal(cName)) setValue('client_name', cName);

        if (validContactName && shouldSet('client_contact_name') && !isInternal(validContactName)) {
            setValue('client_contact_name', validContactName);
        }

        if (validEmail && shouldSet('client_email') && !isInternal(validEmail)) {
            setValue('client_email', validEmail);
        }

        // 5. Fallback: Parse Transcript if no metadata (API invalid/empty)
        if ((!validContactName || !validEmail) && m.transcript) {
            const speakerRegex = /^([^:\n]+):/gm;
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
            let match;
            const seenSpeakers = new Set<string>();

            // Limit scan to first 20k chars to avoid lag
            const txt = m.transcript.substring(0, 20000);

            while ((match = speakerRegex.exec(txt)) !== null) {
                const name = match[1].trim();
                // Filter out short names, internal names, and generic labels
                if (name.length > 2 && !isInternal(name) && !name.includes('Speaker') && !seenSpeakers.has(name)) { // Added 'Speaker' check
                    seenSpeakers.add(name);
                    validContactName = name;
                    break; // Found the first non-internal speaker!
                }
            }

            // B. Extract Email
            if (!validEmail) {
                const emails = txt.match(emailRegex);
                if (emails && emails.length > 0) {
                    const found = emails.find((e: string) => !isInternal(e) && !e.includes('notetaker'));
                    if (found) validEmail = found.toLowerCase();
                }
            }

            if (validContactName && shouldSet('client_contact_name')) {
                setValue('client_contact_name', validContactName);
                // Don't set 'Empresa de...' - leave blank for user to fill
            }

            if (validEmail && shouldSet('client_email')) {
                setValue('client_email', validEmail);
                // Try to extract company name from email domain
                if (shouldSet('client_name') && !validEmail.match(/gmail|outlook|hotmail|yahoo|icloud/i)) {
                    const domain = validEmail.split('@')[1]?.split('.')[0];
                    if (domain && domain.length > 2) {
                        setValue('client_name', domain.charAt(0).toUpperCase() + domain.slice(1));
                    }
                }
            }
        }

        if (m.transcript && shouldSet('transcript')) {
            setValue('transcript', m.transcript);
            setValue('manual_transcript', m.transcript);
        }

        if (m.crm_data) {
            setValue('crm_data', m.crm_data);
        }

        if (cName && (force || !watch('title') || watch('title').includes('Proposta'))) {
            setValue('title', `Proposta de Implementação RevHackers X ${cName}`);
        }
    };

    // Auto-fetch removido: reunioes agora vem de meeting_recordings via picker

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'document') => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        if (type === 'logo') setUploadingLogo(true);
        else setUploadingDoc(true);

        try {
            const publicUrl = await uploadImageToSupabase(file, 'revhackers-uploads');
            if (publicUrl) {
                if (type === 'logo') {
                    setValue('client_logo', publicUrl);
                    toast({ title: 'Logo enviado com sucesso!' });
                } else {
                    setValue('bid_document_url', publicUrl);
                    toast({ title: 'Documento enviado!', description: 'Extraindo dados estratégicos...' });
                }
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro no upload', variant: 'destructive' });
        } finally {
            if (type === 'logo') setUploadingLogo(false);
            else setUploadingDoc(false);
        }
    };

    // Sync Client Name to Title automatically
    const watchedClientName = watch('client_name');
    useEffect(() => {
        if (watchedClientName && (!watch('title') || watch('title').includes('Proposta'))) {
            setValue('title', `Proposta de Implementação RevHackers X ${watchedClientName}`);
        }
    }, [watchedClientName, setValue, watch]);

    const onSubmit = async (data: ProposalFormValues) => {
        setLoading(true);
        try {
            // [FIX] Ensure numeric fields are strings (DB Schema is text)
            // [FIX] Only include fields that definitely exist in DB
            const payload = {
                title: data.title,
                slug: data.slug,
                client_name: data.client_name,
                client_contact_name: data.client_contact_name || null,
                client_email: data.client_email || null,
                client_logo: data.client_logo || null,
                recording_url: data.recording_url || null,
                transcript: data.transcript || null,
                summary: data.summary || null,

                // CAST NUMBERS TO STRING
                investment_total: data.investment_total ? String(data.investment_total) : null,
                setup_fee: data.setup_fee ? String(data.setup_fee) : null,
                installment_value: data.installment_value ? String(data.installment_value) : null,
                installment_count: data.installment_count ? Number(data.installment_count) : null, // This might need to be cast if DB is text, checking... let's keep number if defined, or string if text. Previous code sent number. If DB is text, string is safer.

                status: data.status || 'draft',
                category: data.category || 'proposal',
                mindmap_code: data.mindmap_code || null,

                // [FIX] These fields might not exist in all migrations, check validity or keep if confident.
                // Assuming "loom_url" is not in provided migration, but "crm_data" is.
                // We'll move extra fields to crm_data to be safe if they are not columns

                headline: data.headline || null,
                subheadline: data.subheadline || null,
                brief_explanation: data.brief_explanation || null,
                detailed_scope: data.detailed_scope || null,
                payment_terms: data.payment_terms || null,

                // Merge extra UI fields into crm_data to persist them without schema errors
                crm_data: {
                    ...data.crm_data,
                    loom_url: data.loom_url || null,
                    bid_document_url: data.bid_document_url || null,
                    call_detail_summary: data.call_detail_summary || null,
                    booking_url: data.booking_url || null,
                    proposal_source: data.proposal_source || 'call',
                    payment_link: data.payment_link || null
                },

                // Link to opportunity (pre-sale pipeline)
                opportunity_id: initialData?.opportunity_id || opportunityContext?.opportunity_id || null,
            };

            let proposalId = initialData?.id;
            let slug = data.slug;

            if (isEditing && initialData?.id) {
                const { error } = await supabase.from('proposals').update(payload).eq('id', initialData.id);
                if (error) throw error;

                // Only clear draft if save successful
                localStorage.removeItem('revhackers_proposal_draft');
                toast({ title: 'Proposta atualizada!' });
                navigate('/admin/proposals');
            } else {
                const { data: newProposal, error } = await supabase.from('proposals').insert(payload).select().single();
                if (error) throw error;

                if (!newProposal) throw new Error("Falha ao criar proposta: Nenhum dado retornado.");

                proposalId = newProposal.id;
                slug = newProposal.slug;

                localStorage.removeItem('revhackers_proposal_draft');

                // Auto-advance opportunity to proposal_draft
                const oppId = initialData?.opportunity_id || opportunityContext?.opportunity_id;
                if (oppId) {
                    try {
                        const { advanceOpportunityStage } = await import('@/api/opportunities');
                        await advanceOpportunityStage(oppId, 'proposal_draft', 'Proposta criada automaticamente');
                        console.log(`[ProposalForm] Opportunity ${oppId} avancada para proposal_draft`);
                    } catch (advErr: any) {
                        console.warn('[ProposalForm] Auto-advance falhou (nao critico):', advErr?.message);
                    }
                }

                toast({ title: 'Proposta criada com sucesso!' });

                // AUTO-OPEN Public Page
                if (proposalId && slug) {
                    // Safe navigation
                    const targetUrl = `/p/${slug}`;
                    window.open(targetUrl, '_blank');
                    navigate(`/admin/proposals/edit/${proposalId}`);
                } else {
                    console.error("Missing ID or Slug for new proposal");
                    navigate('/admin/proposals');
                }
            }
        } catch (error: any) {
            console.error("Save Error:", error);
            toast({
                title: 'Erro ao salvar',
                description: error.message || "Verifique os campos e tente novamente.",
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };


    const fetchMeetingHistory = async () => {
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('meeting_recordings')
                .select('id, title, transcript, ai_insights, video_url, drive_file_id, created_at, happened_at')
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                setMeetingHistory(data.map((r: any) => {
                    // Construir URL do video: video_url direto, ou Google Drive embed via drive_file_id
                    const videoUrl = r.video_url
                        || (r.drive_file_id ? `https://drive.google.com/file/d/${r.drive_file_id}/view` : '');
                    return {
                        id: r.id,
                        name: r.title || 'Reuniao sem titulo',
                        title: r.title,
                        transcript: r.transcript,
                        insights: r.ai_insights,
                        url: videoUrl,
                        createdAt: r.happened_at || r.created_at,
                        duration: null,
                        // Extrair dados do cliente dos insights da IA
                        clientName: r.ai_insights?.client_info?.company || r.ai_insights?.client_info?.name || null,
                        clientContactName: r.ai_insights?.client_info?.name || null,
                        clientEmail: r.ai_insights?.client_info?.email || null,
                        crm_data: r.ai_insights,
                    };
                }));
            }
        } catch (e: any) {
            console.warn("Failed to fetch meeting history:", e);
            toast({ title: 'Erro ao buscar gravacoes', description: e.message || 'Verifique a tabela meeting_recordings.', variant: 'destructive' });
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleGenerateScope = async (input?: string | { text: string; type: 'transcript' | 'bid'; metadata?: any }) => {
        let transcript = '';
        let contextMetadata: any = null;

        if (input) {
            if (typeof input === 'string') {
                transcript = input;
            } else {
                transcript = input.text;
                contextMetadata = input.metadata;
            }
        }

        // Fallback to form watch if not passed explicitly
        if (!transcript) transcript = watch('transcript');

        // Fallback to opportunity meeting transcript
        if (!transcript && opportunityContext?.meeting?.transcript) {
            transcript = opportunityContext.meeting.transcript;
        }

        const crmData = watch('crm_data');
        const hasDiagnosis = crmData?.source === 'rei_diagnosis';
        const sourceDoc = watch('bid_document_url');

        if (!transcript && !sourceDoc && !hasDiagnosis) {
            toast({ title: 'Erro', description: 'Adicione uma fonte de dados (Transcrição, Documento ou Diagnóstico Prévio).', variant: 'destructive' });
            return;
        }

        setGenerating(true);
        try {
            // Construct Context Block
            let contextBlock = "";
            let diagnosisBlock = "";

            if (contextMetadata) {
                contextBlock = `
                CONTEXTO DA CALL (METADATA):
                - Título: ${contextMetadata.name || 'N/A'}
                - Duração: ${Math.round((contextMetadata.duration || 0) / 60)} min
                - Participantes: ${contextMetadata.participants ? contextMetadata.participants.map((p: any) => p.name).join(', ') : 'Não listado'}
                `;
            }

            if (hasDiagnosis) {
                diagnosisBlock = `
                DADOS DO DIAGNÓSTICO ESTRATÉGICO (REI):
                - ICP/Segmento: ${crmData.segmento || crmData.icpDescription || 'N/A'}
                - Principais Dores: ${crmData.desafios ? crmData.desafios.join(', ') : crmData.painDescription || 'N/A'}
                - Gatilho de Compra: ${crmData.buyingTrigger || 'N/A'}
                - Concorrentes: ${crmData.concorrentes || 'N/A'}
                - Objetivo Principal: ${crmData.objetivoPrincipal || 'N/A'}
                - Faturamento: ${crmData.faturamento || 'N/A'}
                - Time Comercial: SDRs: ${crmData.sdrCount || 0}, Closers: ${crmData.closerCount || 0}
                - Ferramentas: ${crmData.crm || 'N/A'}

                USE ESTES DADOS PARA PERSONALIZAR A PROPOSTA (Cite as dores específicas e como resolvemos).
                `;
            }

            // ── OPPORTUNITY INTELLIGENCE BLOCK ──
            // Injeta toda inteligencia disponivel da opportunity para hiper-personalizar a proposta
            let opportunityIntelBlock = "";
            const ctx = opportunityContext;
            if (ctx) {
                const parts: string[] = [];

                // Meeting AI Insights
                if (ctx.meeting?.ai_insights) {
                    const ins = ctx.meeting.ai_insights;
                    parts.push(`
INTELIGENCIA DA CALL (AI-Extraida - 100% factual, use como base):
- Resumo Executivo: ${ins.resumo_executivo || 'N/A'}
- Sentimento do Lead: ${ins.sentimento || 'N/A'}
- Score de Engajamento: ${ins.score_engajamento || 'N/A'}/100
- Objecoes Detectadas: ${(ins.objecoes_cliente || ins.objecoes_detectadas || []).join('; ') || 'Nenhuma'}
- Acoes Identificadas: ${(ins.acoes_identificadas || []).join('; ') || 'N/A'}
- Oportunidades: ${(ins.oportunidades_detectadas || []).join('; ') || 'N/A'}
- Riscos: ${(ins.riscos_identificados || []).join('; ') || 'N/A'}
- Topicos Principais: ${(ins.topicos_principais || []).join('; ') || 'N/A'}`);

                    // Strategic intelligence
                    const strat = ins.inteligencia_estrategica;
                    if (strat) {
                        parts.push(`
- Concorrentes Mencionados: ${(strat.concorrentes_mencionados || []).map((c: any) => typeof c === 'string' ? c : c.nome).join(', ') || 'N/A'}
- Desafios Especificos: ${(strat.desafios_especificos || []).join('; ') || 'N/A'}
- Objetivos Curto Prazo: ${(strat.objetivos_curto_prazo || []).join('; ') || 'N/A'}
- Stack Tecnologica: ${(strat.stack_tecnologica || []).join(', ') || 'N/A'}
- Benchmarks: ${(strat.referencias_benchmarking || []).join(', ') || 'N/A'}`);
                    }
                }

                // Enrichment Data (CNPJ + Site Performance)
                if (ctx.enrichment_data) {
                    const cnpj = ctx.enrichment_data.cnpj;
                    const sitePerf = ctx.enrichment_data.site_perf;

                    if (cnpj) {
                        parts.push(`
DADOS DA EMPRESA (Receita Federal):
- Razao Social: ${cnpj.razao_social || 'N/A'}
- Nome Fantasia: ${cnpj.nome_fantasia || 'N/A'}
- Porte: ${cnpj.porte || 'N/A'}
- Capital Social: R$ ${cnpj.capital_social ? Number(cnpj.capital_social).toLocaleString('pt-BR') : 'N/A'}
- CNAE Principal: ${cnpj.cnae_principal?.descricao || 'N/A'}
- Municipio/UF: ${cnpj.municipio || 'N/A'}/${cnpj.uf || 'N/A'}
- Data Abertura: ${cnpj.data_abertura || 'N/A'}
- Socios: ${(cnpj.qsa || []).map((s: any) => s.nome).join(', ') || 'N/A'}`);
                    }

                    if (sitePerf) {
                        parts.push(`
PERFORMANCE DO SITE (Google PageSpeed):
- URL: ${sitePerf.url || ctx.client_site || 'N/A'}
- Performance Score: ${sitePerf.performance_score}/100 (${sitePerf.rating || 'N/A'})
- SEO Score: ${sitePerf.seo_score}/100
- LCP: ${sitePerf.lcp || 'N/A'} | FCP: ${sitePerf.fcp || 'N/A'} | CLS: ${sitePerf.cls || 'N/A'}
- TTI: ${sitePerf.tti || 'N/A'} | Speed Index: ${sitePerf.speed_index || 'N/A'}`);
                    }
                }

                // Diagnostico vinculado
                if (ctx.diagnostico) {
                    parts.push(`
DIAGNOSTICO DO LEAD (Score: ${ctx.diagnostico.score || 'N/A'}):
- Tipo: ${ctx.diagnostico.tipo || 'N/A'}
- Respostas: ${ctx.diagnostico.respostas ? JSON.stringify(ctx.diagnostico.respostas).substring(0, 2000) : 'N/A'}`);
                }

                // Opportunity signals
                if (ctx.opportunity_data) {
                    const od = ctx.opportunity_data;
                    if (od.sinais_compra?.length || od.objecoes_detectadas?.length || od.score_fechamento) {
                        parts.push(`
SINAIS COMERCIAIS:
- Score de Fechamento: ${od.score_fechamento || 'N/A'}%
- Sinais de Compra: ${(od.sinais_compra || []).join('; ') || 'Nenhum'}
- Objecoes: ${(od.objecoes_detectadas || []).join('; ') || 'Nenhuma'}
- Investimento Estimado: R$ ${od.investimento_estimado ? `${od.investimento_estimado.range_min}-${od.investimento_estimado.range_max}` : 'N/A'}`);
                    }
                }

                // Site analysis
                if (ctx.site_analysis) {
                    parts.push(`
ANALISE DO SITE: ${JSON.stringify(ctx.site_analysis).substring(0, 1500)}`);
                }

                // Market data
                if (ctx.market_data) {
                    parts.push(`
DADOS DE MERCADO: ${JSON.stringify(ctx.market_data).substring(0, 1500)}`);
                }

                if (parts.length > 0) {
                    opportunityIntelBlock = `
═══════════════════════════════════════════════════
INTELIGENCIA COMPLETA DA OPORTUNIDADE (dados reais, use para personalizar)
═══════════════════════════════════════════════════
${parts.join('\n')}

INSTRUCOES CRITICAS:
- Use os dados REAIS acima para personalizar cada secao da proposta
- Cite concorrentes mencionados na analise competitiva
- Use os desafios especificos como base do diagnostico
- Alinhe o escopo com os objetivos de curto prazo do lead
- Se houver dados de site, proponha melhorias concretas com base nos scores
- Se houver CNPJ, adapte o porte da solucao ao porte da empresa
- NUNCA use o caractere em dash (traco longo). Use hifen simples (-)
═══════════════════════════════════════════════════
`;
                }
            }

            const { data, error } = await supabase.functions.invoke('agent-chat', {
                body: {
                    raw_mode: true,
                    messages: [{
                        role: 'system',
                            content: `🧠 ESTRATEGISTA SÊNIOR DE REVENUE OPERATIONS E CUSTOMER SUCCESS.

Sua tarefa é atuar como um Arquiteto de Soluções B2B de Altíssimo Nível. Você analisará a transcrição da call de vendas, o diagnóstico ou o briefing e redigirá uma PROPOSTA COMERCIAL ASSUSTADORAMENTE METICULOSA E VOLTADA Á APRESENTAÇÃO DE SLIDES (PITCH DECK).

⚠️ REGRA DE OURO: NÃO SEJA GENÉRICO. O formato agora é visual. Seja direto, cirúrgico e foque em engenharia de receita e ROI.

ESTRUTURA DE RESPOSTA (JSON STRICT):

1. "crm_data": Objeto contendo o "live_proposal". É AQUI QUE OS CHUNKS DOS SLIDES FICAM:
   A) "diagnosis_headline": Chamada principal do desafio (ex: Vazamento de Receita no Funil B2B)
   B) "diagnosis_subheadline": Subtítulo resumindo o contexto.
   C) "challenges": Array de até 4 objetos com "title" e "description", expondo a ferida.
   D) "primary_objective": O alvo central (ex: Dobrar a conversão de leads topo de funil).
   E) "roadmap_headline": Título da seção de Roadmap.
   F) "roadmap_subheadline": Subtítulo do roadmap.
   G) "roadmap": Array das fases reais. Ex:
      {
        "phase": "Fundação e Setup",
        "duration": "Semanas 1-2",
        "description": "Explicação macro do que será montado.",
        "deliverables": ["Configuração de CRM", "Mapeamento YAML"]
      }

2. "summary": Documento Markdown de backup.
3. "detailed_scope": Opcional, pode ser o mesmo roadmap stringificado.

Modelo de JSON Exato a ser retornado:
{
    "summary": "...",
    "headline": "Projeto Executivo: [Solução Principal]",
    "crm_data": {
        "live_proposal": {
            "diagnosis_headline": "...",
            "diagnosis_subheadline": "...",
            "challenges": [{"title": "O Desafio", "description": "Por que sangra dinheiro"}],
            "primary_objective": "...",
            "roadmap_headline": "Cronograma de Operações",
            "roadmap_subheadline": "...",
            "roadmap": [
                { "phase": "Mês 1", "duration": "Semana 1-4", "description": "...", "deliverables": ["..."] }
            ]
        }
    },
    "investment_total": 0,
    "setup_fee": 0,
    "installment_value": 0,
    "client_name": "[Nome da Empresa (Extrapolado da call)]",
    "client_contact_name": "[Pessoa decisora com quem falamos]",
    "client_email": "[email se encontrado]"
}`
                        }],
                        model: 'gpt-4o'
                }
            });

            if (error) throw error;

            const rawResponse = data?.response || data?.choices?.[0]?.message?.content || "";

            if (!rawResponse || rawResponse.length < 50) {
                throw new Error("Resposta da IA muito curta ou vazia. Tente novamente.");
            }

            // Clean the response
            let cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');

            if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
                console.error("Invalid JSON structure:", rawResponse.substring(0, 500));
                throw new Error("Formato de resposta inválido. Tente novamente.");
            }

            cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);

            let parsed;
            try {
                parsed = JSON.parse(cleanJson);
            } catch (parseError) {
                console.error("JSON Parse Error. Raw:", cleanJson.substring(0, 1000));
                throw new Error("Erro ao processar resposta da IA. Tente com uma transcrição menor.");
            }


            // Apply parsed values to form (handle objects)
            const toString = (val: any) => typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || '');

            if (parsed.summary) setValue('summary', toString(parsed.summary));
            if (parsed.call_summary) setValue('call_detail_summary', toString(parsed.call_summary));
            if (parsed.headline) setValue('headline', toString(parsed.headline));

            if (parsed.detailed_scope) {
                setValue('detailed_scope', toString(parsed.detailed_scope));
            } else if (parsed.crm_data?.live_proposal?.roadmap) {
                setValue('detailed_scope', toString(parsed.crm_data.live_proposal.roadmap));
            }

            if (parsed.investment_total) setValue('investment_total', String(parsed.investment_total));
            if (parsed.setup_fee) setValue('setup_fee', String(parsed.setup_fee));
            if (parsed.installment_value) setValue('installment_value', String(parsed.installment_value));

            // Handle client name - avoid "Empresa de..."
            if (parsed.client_name && !parsed.client_name.includes("Empresa de") && !["Não mencionado", "N/A"].includes(parsed.client_name)) {
                setValue('client_name', parsed.client_name);
            }
            if (parsed.client_contact_name && !["Não mencionado", "N/A"].includes(parsed.client_contact_name)) {
                setValue('client_contact_name', parsed.client_contact_name);
            }
            if (parsed.client_email && !["Não mencionado", "N/A"].includes(parsed.client_email)) {
                setValue('client_email', parsed.client_email);
            }

            if (parsed.crm_data) {
                setValue('crm_data', parsed.crm_data);
            }

            toast({ title: '✅ Proposta Extraída!', description: 'Revise os campos e ajuste se necessário.' });
        } catch (error: any) {
            console.error("AI GEN ERROR:", error);
            toast({ title: 'Erro na IA', description: error.message, variant: 'destructive' });
        } finally {
            setGenerating(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-7xl mx-auto pb-20 px-8">

            <div className="max-w-5xl mx-auto space-y-12 pb-32">

                {/* 1. SINGLE CARD: VIDEO + DATA SOURCE */}
                <div className="bg-white p-6 border border-zinc-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-tiny font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                            <div className="w-1 h-1 bg-zinc-800" />
                            Fonte de Dados & Review
                        </h2>
                        {watch('recording_url') && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(watch('recording_url'), '_blank')}
                                className="h-6 text-xxs font-bold uppercase text-zinc-400 hover:text-zinc-900"
                            >
                                Abrir Externo <ExternalLink className="w-2.5 h-2.5 ml-1" />
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* MEETING PICKER & CLIENT DATA */}
                        <div className="space-y-6">
                            {/* Meeting Picker Button */}
                            <div className="space-y-4 bg-zinc-50 p-4 border border-zinc-100">
                                <Label className="text-xxs font-bold uppercase text-zinc-400">Selecionar Reuniao Gravada</Label>

                                <Dialog open={historyOpen} onOpenChange={(open) => {
                                    setHistoryOpen(open);
                                    if (open) fetchMeetingHistory();
                                }}>
                                    <DialogTrigger asChild>
                                        <Button
                                            type="button"
                                            className="w-full h-12 bg-zinc-900 hover:bg-black text-white font-bold text-xs uppercase tracking-widest"
                                        >
                                            <Video className="w-4 h-4 mr-2" />
                                            {watch('recording_url') ? 'Trocar Reunião' : 'Escolher Reunião'}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
                                        <DialogHeader>
                                            <DialogTitle>Suas Reuniões Recentes</DialogTitle>
                                            <DialogDescription>Clique em uma reunião para selecionar e preencher os dados automaticamente.</DialogDescription>
                                        </DialogHeader>
                                        <div className="overflow-y-auto max-h-[60vh] space-y-2 py-4">
                                            {loadingHistory ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                                                    <span className="ml-2 text-sm text-zinc-500">Carregando reuniões...</span>
                                                </div>
                                            ) : meetingHistory.length === 0 ? (
                                                <div className="text-center py-12 text-zinc-400 text-sm">
                                                    Nenhuma gravacao encontrada. Use a extensao Chrome para gravar reunioes do Meet.
                                                </div>
                                            ) : (
                                                meetingHistory.map((meeting: any) => (
                                                    <div
                                                        key={meeting.id || meeting.url}
                                                        onClick={() => {
                                                            setValue('recording_url', meeting.url || '');
                                                            setHistoryOpen(false);
                                                            // Preenche campos com dados ja extraidos da gravacao
                                                            updateFieldsWithMetadata(meeting, true);
                                                            toast({
                                                                title: 'Gravacao Vinculada',
                                                                description: meeting.clientName || meeting.name || 'Dados carregados'
                                                            });
                                                            // Auto-gerar escopo se tem transcricao
                                                            if (meeting.transcript && meeting.transcript.length > 100) {
                                                                setTimeout(() => handleGenerateScope(meeting.transcript), 500);
                                                            }
                                                        }}
                                                        className="p-4 border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer transition-all group"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-zinc-100 flex items-center justify-center shrink-0">
                                                                <Video className="w-5 h-5 text-zinc-500" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-semibold text-zinc-900 truncate group-hover:text-black">
                                                                    {meeting.name || meeting.title || 'Reunião'}
                                                                </h4>
                                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                                    {meeting.createdAt ? new Date(meeting.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data N/A'}
                                                                    {meeting.duration && ` • ${Math.round(meeting.duration / 60)} min`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>

                                {watch('recording_url') && (
                                    <div className="p-3 bg-white border border-zinc-100 flex items-center justify-between">
                                        <span className="text-xs text-zinc-600 truncate flex-1">{watch('recording_url')}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setValue('recording_url', '')}
                                            className="h-6 w-6 shrink-0"
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xxs font-bold uppercase text-zinc-400">Empresa</Label>
                                    <Input {...register('client_name')} className="bg-white h-9 text-xs font-bold" placeholder="Ex: Nome da Empresa" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xxs font-bold uppercase text-zinc-400">Contato Principal</Label>
                                    <Input {...register('client_contact_name')} className="bg-white h-9 text-xs font-bold" placeholder="Nome do Decisor" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xxs font-bold uppercase text-zinc-400">E-mail</Label>
                                    <Input {...register('client_email')} className="bg-white h-9 text-xs" placeholder="email@empresa.com.br" />
                                </div>
                            </div>
                        </div>

                        {/* VIDEO PREVIEW / MEETING STATUS */}
                        {(() => {
                            const url = watch('recording_url') || '';
                            const hasTranscript = !!(watch('transcript') || watch('manual_transcript'));
                            const hasInsights = !!watch('crm_data');

                            // 1. Video embed if URL available
                            if (url) {
                                const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                if (driveMatch) {
                                    return (
                                        <div className="overflow-hidden border border-zinc-200 shadow-sm aspect-video bg-black">
                                            <iframe
                                                src={`https://drive.google.com/file/d/${driveMatch[1]}/preview`}
                                                className="w-full h-full"
                                                allow="autoplay; encrypted-media"
                                                allowFullScreen
                                            />
                                        </div>
                                    );
                                }
                                const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
                                if (loomMatch) {
                                    return (
                                        <div className="overflow-hidden border border-zinc-200 shadow-sm aspect-video bg-black">
                                            <iframe
                                                src={`https://www.loom.com/embed/${loomMatch[1]}`}
                                                className="w-full h-full"
                                                allowFullScreen
                                            />
                                        </div>
                                    );
                                }
                                const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                                if (ytMatch) {
                                    return (
                                        <div className="overflow-hidden border border-zinc-200 shadow-sm aspect-video bg-black">
                                            <iframe
                                                src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                                                className="w-full h-full"
                                                allow="autoplay; encrypted-media"
                                                allowFullScreen
                                            />
                                        </div>
                                    );
                                }
                                // Direct video file (webm, mp4 from Supabase Storage)
                                if (url.match(/\.(webm|mp4|ogg|mov)(\?|$)/i) || url.includes('storage/v1/object')) {
                                    return (
                                        <div className="overflow-hidden border border-zinc-200 shadow-sm aspect-video bg-black">
                                            <video
                                                src={url}
                                                className="w-full h-full object-contain"
                                                controls
                                                preload="metadata"
                                            />
                                        </div>
                                    );
                                }
                                // Fallback: clickable link
                                return (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="overflow-hidden relative shadow-sm border border-zinc-200 bg-zinc-900 aspect-video group flex items-center justify-center hover:bg-zinc-800 transition-all cursor-pointer"
                                    >
                                        <div className="text-center">
                                            <Video className="w-10 h-10 text-white/50 mx-auto mb-2" />
                                            <span className="text-white/80 text-xs font-medium">Clique para assistir</span>
                                            <div className="mt-1.5">
                                                <ExternalLink className="w-3.5 h-3.5 text-white/40 mx-auto" />
                                            </div>
                                        </div>
                                    </a>
                                );
                            }

                            // 2. No video but meeting data loaded - show status card
                            if (hasTranscript || hasInsights) {
                                return (
                                    <div className="border border-zinc-200 bg-zinc-950 flex flex-col items-center justify-center aspect-video p-6">
                                        <div className="w-12 h-12 bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3">
                                            <FileText className="w-5 h-5 text-[#00CC6A]" />
                                        </div>
                                        <span className="text-white font-black text-sm tracking-tight mb-1">Reuniao Vinculada</span>
                                        <div className="flex items-center gap-3 mt-2">
                                            {hasTranscript && (
                                                <span className="text-xxs font-black uppercase tracking-widest text-[#00CC6A] bg-zinc-800 border border-zinc-700 px-2.5 py-1">
                                                    Transcript OK
                                                </span>
                                            )}
                                            {hasInsights && (
                                                <span className="text-xxs font-black uppercase tracking-widest text-[#00CC6A] bg-zinc-800 border border-zinc-700 px-2.5 py-1">
                                                    AI Insights OK
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xxs text-zinc-500 mt-3 text-center max-w-[200px]">
                                            Video nao disponivel. Dados da call ja carregados.
                                        </p>
                                    </div>
                                );
                            }

                            // 3. Nothing yet - empty state
                            return (
                                <div className="border border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center text-zinc-300 aspect-video">
                                    <Video className="w-8 h-8 mb-2 text-zinc-200" />
                                    <span className="text-xs font-medium uppercase tracking-widest">Selecione uma Reuniao</span>
                                    <span className="text-xxs text-zinc-300 mt-1">ou cole a URL do video acima</span>
                                </div>
                            );
                        })()}
                    </div>
                </div>
                {/* 3. GENERATE ACTION */}
                <div className="flex flex-col items-center py-4 gap-2">
                    <Button
                        type="button"
                        onClick={() => handleGenerateScope()}
                        disabled={generating || (!watch('recording_url') && !watch('transcript') && !opportunityContext?.meeting?.transcript && watch('crm_data')?.source !== 'rei_diagnosis')}
                        className="h-12 px-8 bg-zinc-900 hover:bg-black text-white font-bold uppercase tracking-widest text-xs shadow-sm shadow-zinc-900/20 active:scale-95 transition-all disabled:opacity-40"
                    >
                        {generating ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando Call...</>
                        ) : (
                            <><Wand2 className="w-4 h-4 mr-2" /> Extrair Dados com IA</>
                        )}
                    </Button>
                    <p className="text-xxs text-zinc-400 text-center max-w-md">
                        A IA analisa a transcricao e preenche: Resumo Executivo, Escopo do Projeto, Dores do Cliente e valores sugeridos.
                    </p>
                </div>

                <div className="bg-white border border-zinc-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-zinc-100 bg-zinc-50/30">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center text-white font-bold text-xs">P</div>
                            <div>
                                <h3 className="text-zinc-900 font-bold text-lg leading-none">Estrutura da Proposta</h3>
                                <p className="text-zinc-400 text-xxs mt-1 font-bold uppercase tracking-wider">Dados estratégicos e cronograma de implementação</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <Label className="text-tiny font-bold uppercase tracking-wider text-zinc-400">Título Público da Proposta</Label>
                                <Input {...register('title')} className="text-lg font-bold bg-white border-zinc-200" placeholder="Ex: Proposta de Implementação RevHackers X Nome do Cliente" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-tiny font-bold uppercase tracking-wider text-zinc-400">Resumo Estratégico (Texto)</Label>
                                <Textarea {...register('summary')} className="min-h-[120px] text-sm bg-white" placeholder="Descreva os objetivos principais e o valor do projeto..." />
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-tiny font-bold uppercase tracking-wider text-zinc-400">Transcrição da Call</Label>
                            </div>
                            <Textarea
                                {...register('transcript')}
                                className="min-h-[200px] font-mono text-xs leading-relaxed border-zinc-200 bg-zinc-50/10 focus:bg-white transition-all p-4"
                                placeholder="Transcrição será carregada automaticamente..."
                            />
                        </div>


                        <div className="space-y-4 pt-8 border-t border-zinc-100/50">
                            <div className="flex items-start justify-between">
                                <div>
                                    <Label className="text-tiny font-bold uppercase tracking-wider text-zinc-400">Cronograma Visual (Roadmap)</Label>
                                    <p className="text-xxs text-zinc-400 font-medium mt-1">Estrutura de fases que será renderizada na proposta comercial do cliente.</p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleConvertToCards}
                                    disabled={loading}
                                    className="h-9 px-5 text-xs uppercase font-bold tracking-widest bg-zinc-900 border-zinc-900 text-white hover:bg-black shadow-sm transition-all"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                                    Gerar Roadmap IA
                                </Button>
                            </div>

                            {/* Renderização Visual do JSON */}
                            {(() => {
                                const raw = watch('detailed_scope');
                                let parsed: any[] = [];
                                let isValidJson = false;
                                
                                if (raw) {
                                    try {
                                        parsed = JSON.parse(raw);
                                        isValidJson = Array.isArray(parsed) && parsed.length > 0;
                                    } catch (e) {
                                        // Not valid JSON
                                    }
                                }

                                return (
                                    <div className="space-y-4">
                                        {!raw && !loading && (
                                            <div className="border border-dashed border-zinc-200 bg-zinc-50 p-8 flex flex-col items-center justify-center text-center">
                                                <ListTree className="w-8 h-8 text-zinc-300 mb-3" />
                                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Roadmap Vazio</p>
                                                <p className="text-xxs text-zinc-400 mt-1">Clique para gerar o roadmap baseado na inteligência da call.</p>
                                            </div>
                                        )}

                                        {isValidJson && (
                                            <div className="grid grid-cols-1 gap-4">
                                                {parsed.map((phase, idx) => (
                                                    <div key={idx} className="bg-white border border-zinc-200 p-5 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-zinc-900" />
                                                        <div className="flex flex-col md:flex-row gap-5">
                                                            <div className="md:w-1/4">
                                                                <span className="inline-block px-2.5 py-1 bg-zinc-100 text-zinc-600 text-3xs font-black uppercase tracking-widest mb-2 border border-zinc-200">
                                                                    {phase.duration || `Fase ${idx + 1}`}
                                                                </span>
                                                                <h4 className="text-sm font-bold text-zinc-900 leading-tight">
                                                                    {phase.phase?.replace(/^Fase \d+:\s*/i, '')}
                                                                </h4>
                                                            </div>
                                                            <div className="md:w-3/4 space-y-3">
                                                                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                                                                    {phase.description}
                                                                </p>
                                                                {phase.deliverables && phase.deliverables.length > 0 && (
                                                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                                        {phase.deliverables.map((d: string, i: number) => (
                                                                            <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 font-medium">
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-[#00CC6A] mt-0.5 shrink-0" />
                                                                                <span>{d}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {!isValidJson && raw && (
                                            <div className="p-4 bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-xs font-bold">
                                                <AlertCircle className="w-5 h-5 shrink-0" />
                                                <span>A IA retornou um formato inválido. Tente gerar novamente ou edite o texto abaixo.</span>
                                            </div>
                                        )}

                                        <details className="group border border-zinc-100 bg-zinc-50 mt-4 rounded-sm">
                                            <summary className="cursor-pointer p-3 text-2xs font-bold uppercase tracking-widest text-zinc-400 hover:bg-zinc-100 transition-colors list-none flex items-center justify-between">
                                                <span className="flex items-center gap-2"><Code className="w-3.5 h-3.5" /> Modo Desenvolvedor (Editar JSON)</span>
                                                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                                            </summary>
                                            <div className="p-4 border-t border-zinc-100">
                                                <Textarea
                                                    {...register('detailed_scope')}
                                                    className="min-h-[300px] font-mono text-xs leading-relaxed border-zinc-200 bg-white focus:bg-white transition-all p-4 shadow-sm"
                                                    placeholder="Formato JSON bruto..."
                                                />
                                            </div>
                                        </details>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* FUNNEL SUBSCRIPTION (OPTIONAL) */}
                        <div className="space-y-4 pt-8 border-t border-zinc-100/50">
                            <h3 className="text-xxs font-bold uppercase tracking-widest text-zinc-400">Ferramenta Funnel (Opcional)</h3>
                            <div className="p-6 bg-zinc-50 border border-zinc-100 grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-2 md:col-span-1">
                                    <Label className="text-xs font-medium text-zinc-700">Valor Plano Funnel (R$)</Label>
                                    <Input
                                        {...register('crm_data.funnel_plan')}
                                        type="number"
                                        className="bg-white h-10 w-full"
                                        placeholder="Ex: 697"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-zinc-700">Desconto (%)</Label>
                                    <Input
                                        {...register('crm_data.platform_discount_percent')}
                                        type="number"
                                        className="bg-white h-10"
                                        placeholder="0"
                                        min="0" max="100"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-zinc-700">Meses de Bônus</Label>
                                    <Input
                                        {...register('crm_data.platform_bonus_months')}
                                        type="number"
                                        className="bg-white h-10"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>

                                {/* Promo Checkbox - Only show if plan is selected */}
                                <div className="flex items-center space-x-2 pt-8 md:col-span-1">
                                    <input
                                        type="checkbox"
                                        id="funnel_promo"
                                        {...register('crm_data.funnel_promo_active')}
                                        className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <label
                                        htmlFor="funnel_promo"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                                    >
                                        🎁 1º Mês Grátis
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-zinc-700">Tempo de Projeto (Meses)</Label>
                                    <select
                                        {...register('crm_data.project_duration')}
                                        className="flex h-10 w-full border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                                    >
                                        <option value="3">3 Meses</option>
                                        <option value="6">6 Meses</option>
                                        <option value="12">12 Meses</option>
                                    </select>
                                </div>
                            </div>
                        </div>


                        {/* FINANCIALS & CLOSING */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-8 border-t border-zinc-100/50">
                            <div className="p-4 bg-zinc-50 border border-zinc-100 space-y-2">
                                <Label className="text-xxs uppercase font-bold text-zinc-400">Investimento Total (R$)</Label>
                                <Input {...register('investment_total')} type="number" className="font-bold text-zinc-900 bg-transparent border-none text-lg h-auto p-0" placeholder="60000" />
                            </div>
                            <div className="p-4 bg-zinc-50 border border-zinc-100 space-y-2">
                                <Label className="text-xxs uppercase font-bold text-zinc-400">Setup Fee (R$)</Label>
                                <Input {...register('setup_fee')} type="number" className="font-bold text-zinc-900 bg-transparent border-none text-lg h-auto p-0" placeholder="10000" />
                            </div>

                            <div className="p-4 bg-zinc-50 border border-zinc-100 space-y-2">
                                <Label className="text-xxs uppercase font-bold text-zinc-400">Valor Mensal (R$)</Label>
                                <Input {...register('installment_value')} type="number" className="font-bold text-zinc-900 bg-transparent border-none text-lg h-auto p-0" placeholder="10000" />
                            </div>
                            <div className="p-4 bg-zinc-50 border border-zinc-100 space-y-2">
                                <Label className="text-xxs uppercase font-bold text-zinc-400">Nº de Parcelas</Label>
                                <Input {...register('installment_count')} type="number" className="font-bold text-zinc-900 bg-transparent border-none text-lg h-auto p-0" placeholder="6" />
                            </div>
                        </div>

                        {/* Cobrança será definida em fluxo próprio futuro. */}
                        <div className="pt-8 border-t border-zinc-100/50">
                            <h3 className="text-xxs font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">Cobrança</h3>
                            <div className="p-6 bg-zinc-50 border border-zinc-100 flex flex-col items-center justify-center text-center">
                                <h4 className="text-sm font-bold text-zinc-900 mb-1">Fluxo de cobrança pendente</h4>
                                <p className="text-xs text-zinc-500 max-w-lg mb-4">
                                    A integração de pagamento foi removida. O novo fluxo de cobrança será definido separadamente antes de ser reativado.
                                </p>
                            </div>
                        </div>
                    </div >
                </div >

                <div className="flex justify-end pt-8">
                    <Button type="submit" disabled={loading} className="h-12 px-8 bg-zinc-900 hover:bg-black text-white font-bold uppercase tracking-widest text-xs shadow-sm shadow-zinc-900/20">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Proposta
                    </Button>
                </div>
            </div >
        </form >
    );
};

export default ProposalForm;
