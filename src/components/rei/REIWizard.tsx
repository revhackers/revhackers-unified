import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { saveReiDiagnostic } from '@/api/reiProjects';
import { REIType } from '@/types/rei';
import { ReiScoringService } from '@/services/ReiScoringService';

// Import dos Steps
import Step1Identificacao from './steps/Step1Identificacao';
import Step2Contexto from './steps/Step2Contexto';
import Step3Desafios from './steps/Step3Desafios';
import Step4Estrategia from './steps/Step4Estrategia';
import Step5Expectativas from './steps/Step5Expectativas';
import StepFounderLinkedIn from './steps/StepFounderLinkedIn';
import StepFounderDeepDive from './steps/StepFounderDeepDive';
import StepDevTechnical from './steps/StepDevTechnical';

// Import dos Steps CRM Ops Exclusivos
import StepCrmOps1Context from './steps/StepCrmOps1Context';
import StepCrmOps2TechStack from './steps/StepCrmOps2TechStack';
import StepCrmOps3AquisicaoSLA from './steps/StepCrmOps3AquisicaoSLA';
import StepCrmOps4Execucao from './steps/StepCrmOps4Execucao';
import StepCrmOps5Retencao from './steps/StepCrmOps5Retencao';
import ThankYouMessage from '@/components/shared/rei-form/ThankYouMessage';

interface REIWizardProps {
    projectId: string;
    type: REIType;
    onComplete?: (responseId: string) => void;
}

// Schema de validação UNIFICADO (todos os campos de todos os fluxos)
const wizardSchema = z.object({
    // Step 1 (Comum)
    email: z.string().email('Email inválido'),
    website_url: z.string().optional(),

    // --- FOUNDER PROTOCOL FIELDS ---
    linkedin_url: z.string().optional(),
    founder_name: z.string().optional(), // Tornar obrigatório via refine se quiser
    founder_role: z.string().optional(),
    founder_bio: z.string().optional(),
    founder_superpowers: z.string().optional(),

    authority_topics: z.string().optional(),
    industry_myths: z.string().optional(),
    target_audience: z.string().optional(),
    tone_voice: z.string().optional(),
    references: z.string().optional(),
    content_frequency: z.string().optional(),
    preferred_formats: z.string().optional(),
    approval_workflow: z.string().optional(),
    anti_goals: z.string().optional(),
    success_vision: z.string().optional(),
    topics_to_avoid: z.string().optional(),
    // -------------------------------

    // Step Dev (Technical)
    cms_preference: z.string().optional(),
    dev_features: z.array(z.string()).optional(),
    design_style: z.string().optional(),
    design_references: z.string().optional(),
    projectType: z.string().optional(),
    deadline: z.string().optional(),
    primaryGoal: z.string().optional(),
    brandGuidelines: z.string().optional(),
    contentStatus: z.string().optional(),
    inspirationSites: z.string().optional(),
    domainStatus: z.string().optional(),
    integrations: z.string().optional(),
    // ----------------------

    // Step 2 (Contexto - Consulting)
    segmento: z.string().optional(),
    segmento_outro: z.string().optional(),
    tamanho: z.string().optional(),
    ticketMedio: z.string().optional(),
    cicloVendas: z.string().optional(),
    mrr: z.string().optional(),
    modeloPrecificacao: z.string().optional(),
    taxaChurn: z.string().optional(),

    // Step 3 (Desafios - Consulting)
    desafios: z.array(z.string()).optional(),
    metaCrescimento: z.string().optional(),
    orcamento: z.string().optional(),
    prazo: z.string().optional(),
    metricaPrincipal: z.string().optional(),
    gargaloFunil: z.string().optional(),
    gargaloFunil_outro: z.string().optional(),
    processGap: z.string().optional(),
    implementationAttempts: z.string().optional(),
    executionConstraint: z.string().optional(),

    // Step 4 (Estratégia - Consulting)
    canaisAquisicao: z.array(z.string()).optional(),
    crm: z.string().optional(),
    crm_outro: z.string().optional(),
    timeGrowth: z.string().optional(),
    metricas: z.array(z.string()).optional(),
    gargalo: z.string().optional(),
    gargalo_outro: z.string().optional(),
    cacAtual: z.string().optional(),
    ltvAtual: z.string().optional(),
    marketingMaterials: z.string().optional(),

    // Step 5 (Expectativas - Consulting)
    expectativas: z.array(z.string()).min(1, 'Selecione pelo menos 1 expectativa').optional(),
    areasPrioridade: z.array(z.string()).min(1, 'Selecione pelo menos 1 área').max(3, 'Selecione no máximo 3 áreas').optional(),
    prontidao: z.string().optional(),
    quandoComecar: z.string().optional(),
    observacoes: z.string().optional(),

    // --- CRM OPS FIELDS ---
    revops_objetivo_principal: z.string().optional(),
    revops_segmento: z.string().optional(),
    revops_concorrente1_nome: z.string().optional(),
    revops_concorrente1_site: z.string().optional(),
    revops_concorrente2_nome: z.string().optional(),
    revops_concorrente2_site: z.string().optional(),
    revops_concorrente3_nome: z.string().optional(),
    revops_concorrente3_site: z.string().optional(),
    revops_tamanho_time: z.string().optional(),
    revops_ticket_medio: z.string().optional(),
    revops_mrr_atual: z.string().optional(),
    revops_cac_atual: z.string().optional(),
    revops_sales_cycle_days: z.string().optional(),
    revops_win_rate: z.string().optional(),
    revops_hub_central: z.string().optional(),
    revops_integracoes: z.string().optional(),
    revops_tech_debt_cost: z.string().optional(),
    revops_data_hygiene_owner: z.string().optional(),
    revops_shadow_it_index: z.string().optional(),
    revops_automacoes_core: z.string().optional(),
    revops_icp_framework: z.string().optional(),
    revops_lead_scoring: z.string().optional(),
    revops_sla_marketing_vendas: z.string().optional(),
    revops_routing_vip: z.string().optional(),
    revops_speed_to_lead_sla: z.string().optional(),
    revops_flow_cadencia: z.string().optional(),
    revops_pipeline_stagnation: z.string().optional(),
    revops_economic_buyer_mapped: z.string().optional(),
    revops_cpq_friction: z.string().optional(),
    revops_win_loss_analysis: z.string().optional(),
    revops_forecasting_accuracy: z.string().optional(),
    revops_onboarding_handoff: z.string().optional(),
    revops_health_score_tracking: z.string().optional(),
    revops_nrr_percentage: z.string().optional(),
    revops_expansion_playbook: z.string().optional(),
    revops_toxic_compensation: z.string().optional(),
    // Arrays Complexos (Kanban & Lost Reasons)
    revops_custom_pipelines: z.array(z.any()).optional(),
    revops_custom_lost_reasons: z.array(z.any()).optional(),
});

type WizardFormData = z.infer<typeof wizardSchema>;

export default function REIWizard({ projectId, type, onComplete }: REIWizardProps) {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const savedDataStr = typeof window !== 'undefined' ? localStorage.getItem(`rei_wizard_data_${projectId}`) : null;
    let initialData = {};
    if (savedDataStr) {
        try {
            initialData = JSON.parse(savedDataStr);
        } catch (e) {
            console.error("Failed to parse saved draft", e);
        }
    }

    const form = useForm<WizardFormData>({
        resolver: zodResolver(wizardSchema),
        mode: 'onChange',
        defaultValues: initialData
    });

    // --- LOGIC: DEFINE FLOW BASED ON TYPE ---
    const getFlowForType = (type: REIType) => {
        if (type === 'founder') {
            return [
                { id: 'identificacao', title: 'Identificação', component: Step1Identificacao, fields: ['email'] },
                { id: 'linkedin_identity', title: 'Identidade & Histórico', component: StepFounderLinkedIn, fields: ['linkedin_url', 'founder_name', 'founder_role', 'founder_bio', 'founder_superpowers'] },
                { id: 'founder_deepdive', title: 'Posicionamento & Conteúdo', component: StepFounderDeepDive, fields: ['authority_topics', 'industry_myths', 'target_audience', 'tone_voice', 'content_frequency', 'preferred_formats', 'anti_goals', 'success_vision'] },
                { id: 'expectativas', title: 'Expectativas', component: Step5Expectativas, fields: ['expectativas', 'areasPrioridade'] },
            ];
        } else if (type === 'site') {
            return [
                { id: 'identificacao', title: 'Identificação', component: Step1Identificacao, fields: ['email'] },
                { id: 'technical', title: 'Tech Briefing', component: StepDevTechnical, fields: ['projectType', 'primaryGoal', 'contentStatus'] },
                { id: 'expectativas', title: 'Expectativas', component: Step5Expectativas, fields: ['expectativas', 'areasPrioridade'] },
            ];
        } else if (type === 'crm_ops') {
            return [
                { id: 'identificacao', title: 'Identificação', component: Step1Identificacao, fields: ['email', 'website_url'] },
                { id: 'crm_context', title: 'Contexto B2B', component: StepCrmOps1Context, fields: ['revops_segmento', 'revops_empresa', 'revops_email', 'revops_objetivo_principal'] },
                { id: 'crm_tech', title: 'Arquitetura e Stack', component: StepCrmOps2TechStack, fields: ['revops_hub_central'] },
                { id: 'crm_sla', title: 'Aquisição e SLA', component: StepCrmOps3AquisicaoSLA, fields: ['revops_icp_framework'] },
                { id: 'crm_exec', title: 'Execução de Vendas', component: StepCrmOps4Execucao, fields: ['revops_flow_cadencia', 'revops_custom_pipelines', 'revops_custom_lost_reasons'] },
                { id: 'crm_retencao', title: 'Retenção e Expansão', component: StepCrmOps5Retencao, fields: ['revops_onboarding_handoff'] },
            ];
        }

        // Default: Consulting 360
        return [
            { id: 'identificacao', title: 'Identificação', component: Step1Identificacao, fields: ['email'] },
            { id: 'contexto', title: 'Contexto do Negócio', component: Step2Contexto, fields: ['segmento', 'tamanho', 'ticketMedio', 'cicloVendas'] },
            { id: 'desafios', title: 'Desafios & Objetivos', component: Step3Desafios, fields: ['desafios', 'metaCrescimento'] },
            { id: 'estrategia', title: 'Estratégia Atual', component: Step4Estrategia, fields: ['canaisAquisicao', 'crm', 'marketingMaterials'] },
            { id: 'expectativas', title: 'Expectativas', component: Step5Expectativas, fields: ['expectativas', 'areasPrioridade'] },
        ];
    };

    const flow = getFlowForType(type);
    const TOTAL_STEPS = flow.length;
    const currentStepConfig = flow[currentStep - 1];

    // --- PERSISTENCE LOGIC ---
    useEffect(() => {
        const savedStep = localStorage.getItem(`rei_wizard_step_${projectId}`);

        if (savedStep) {
            const step = parseInt(savedStep, 10);
            if (!isNaN(step) && step > 0 && step <= TOTAL_STEPS) {
                setCurrentStep(step);
            }
        }
    }, [projectId, TOTAL_STEPS]);

    // Save to localStorage on change
    useEffect(() => {
        const subscription = form.watch((value) => {
            // Check if it's not empty, to avoid wiping out on unmount or initial strange cycles
            if (Object.keys(value).length > 0 && Object.values(value).some(v => v !== undefined && v !== '')) {
                localStorage.setItem(`rei_wizard_data_${projectId}`, JSON.stringify(value));
            }
        });
        localStorage.setItem(`rei_wizard_step_${projectId}`, currentStep.toString());
        return () => subscription.unsubscribe();
    }, [form, projectId, currentStep]);

    // --- LOGIC: DEFINE FLOW BASED ON TYPE ---
    const handleNext = async () => {
        // Validate fields for current step
        const fieldsToValidate = currentStepConfig.fields as any;
        const isValid = await form.trigger(fieldsToValidate);

        if (isValid) {
            if (currentStep < TOTAL_STEPS) {
                setDirection(1);
                setCurrentStep(prev => prev + 1);
                window.scrollTo(0, 0);
            } else {
                form.handleSubmit(onSubmit, (errors) => {
                    console.error("Global Validation Errors:", errors);
                    toast({
                        title: "Erro de Validação",
                        description: "Existem campos inválidos em etapas anteriores. Revise o formulário.",
                        variant: "destructive"
                    });
                })();
            }
        } else {
            toast({
                title: "Atenção",
                description: "Verifique os campos obrigatórios.",
                variant: "destructive",
            });
        }
    };

    const handleBack = () => {
        setDirection(-1);
        setCurrentStep(prev => Math.max(prev - 1, 1));
        window.scrollTo(0, 0);
    };

    const onSubmit = async (data: WizardFormData) => {
        setIsSubmitting(true);
        try {
            // 1. Calculate Score based on Protocol Type (Logic Extracted!)
            const scoreResult = ReiScoringService.calculateScore(type, data);

            // 2. Save to DB with 4 arguments: projectId, type, formData, analysisResult
            const responseId = await saveReiDiagnostic(projectId, type, data, scoreResult);


            // 4. TRIGGER AUTO-ENRICHMENT (Living Documents)
            // Generates: Benchmark, Personas, Market Data, Draft Strategic Plan
            try {
                const { supabase } = await import('@/integrations/supabase/client');
                await supabase.functions.invoke('trigger-post-rei-enrichment', {
                    body: { projectId, reiType: type }
                });
            } catch (enrichError) {
                console.warn("Enrichment trigger failed (non-blocking):", enrichError);
            }

            // JOIN THE DOTS: Clear persistence
            localStorage.removeItem(`rei_wizard_data_${projectId}`);

            setIsCompleted(true);

            toast({
                title: "Diagnóstico Gerado",
                description: "Gerando plano estratégico automaticamente...",
                className: "bg-black text-white border-zinc-800"
            });

            if (onComplete && responseId) {
                // Pass projectId directly because the Result page expects ProjectId, not ResponseId
                onComplete(projectId);
            }
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            toast({
                title: "Erro ao Salvar",
                description: error.message || error.error_description || "Não foi possível salvar os dados. Verifique sua conexão.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEmailBlur = () => { };

    const progress = (currentStep / TOTAL_STEPS) * 100;

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 50 : -50,
            opacity: 0
        })
    };

    const CurrentComponent = currentStepConfig.component;

    if (isCompleted) {
        return (
            <div className="max-w-4xl mx-auto py-12">
                <ThankYouMessage />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back to Hub */}
            <div className="mb-12 text-center">
                <Link to="/admin/projects" className="inline-flex items-center text-xxs text-zinc-400 hover:text-black mb-10 transition-colors uppercase tracking-[0.2em] font-bold">
                    <ArrowLeft className="w-3 h-3 mr-2" /> Voltar aos Projetos
                </Link>

                {/* Header Clean */}
                <div className="flex flex-col items-center">
                    <h1 className="text-3xl md:text-5xl font-black text-black mb-4 tracking-tighter uppercase leading-none">
                        Protocolo: <span className="text-zinc-400">{
                            type === 'founder' ? 'Founder Led Sales' :
                                type === 'dev' ? 'Dev Web & Design' :
                                    type === 'funnel' ? 'Funnels & Automação' :
                                        type === 'site' ? 'Site Score' :
                                            type === 'crm_ops' ? 'CRM & RevOps' :
                                                'Consultoria 360º'
                        }</span>
                    </h1>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-md mx-auto bg-zinc-200 h-0.5 rounded-full mt-8 overflow-hidden">
                    <motion.div
                        className="h-full bg-black"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xxs text-zinc-400 uppercase tracking-widest max-w-md mx-auto">
                    <span>Etapa {currentStep} de {TOTAL_STEPS}</span>
                    <span>{currentStepConfig.title}</span>
                </div>
            </div>

            {/* Questions Card */}
            <div className="bg-white border border-zinc-200 rounded-sm p-6 md:p-8 relative overflow-hidden">
                <AnimatePresence mode='wait' custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                    >
                        <CurrentComponent form={form as any} onEmailBlur={handleEmailBlur} />
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-zinc-200">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className={`text-sm font-medium text-zinc-500 hover:text-black transition-colors flex items-center gap-2 ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                    >
                        <ArrowLeft className="w-4 h-4" /> Anterior
                    </button>

                    <Button
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className="bg-black hover:bg-zinc-800 text-white border-0"
                    >
                        {isSubmitting ? 'Salvando...' : currentStep === TOTAL_STEPS ? 'Enviar Diagnóstico' : 'Próximo'}
                        <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
