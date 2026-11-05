import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import Section from '@/components/ui/Section';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ReiDashboard from '@/components/rei/ReiDashboard';

// --- SCHEMAS ---
const section1Schema = z.object({
    fullName: z.string().min(2, "Nome obrigatório"),
    linkedinUrl: z.string().url("URL do LinkedIn inválida").optional().or(z.literal("")),
    currentRole: z.string().min(2, "Cargo atual obrigatório"),
    biography: z.string().min(10, "Conte um pouco da sua história"),
    superpowers: z.string().min(5, "Quais seus diferenciais estratégicos?"),
    brandPersonification: z.string().min(5, "Personificacao obrigatoria"),
});

const section2Schema = z.object({
    authorityTopics: z.string().min(5, "Tópicos obrigatórios"),
    perceptionGap: z.string().min(10, "Este campo é essencial"),
    industryMyths: z.string().min(5, "Qual dogma você quer derrubar?"),
    coreValues: z.string().min(5, "Valores inegociáveis"),
    marketFuture: z.string().optional(),
});

const section3Schema = z.object({
    targetAudience: z.string().min(5, "Público alvo obrigatório"),
    unspokenPain: z.string().min(10, "Qual é a dor oculta?"),
    journeyState: z.string().min(10, "Descreva a jornada."),
    antiClient: z.string().min(5, "Quais são as red flags?"),
    toneVoice: z.string().min(1, "Defina o tom de voz"),
    references: z.string().optional(),
});

const section4Schema = z.object({
    contentFrequency: z.string().min(1, "Disponibilidade obrigatória"),
    preferredFormats: z.string().min(1, "Formatos obrigatórios"),
    vocabulary: z.string().min(5, "Defina suas palavras chave."),
    approvalWorkflow: z.string().optional(),
});

const section5Schema = z.object({
    antiGoals: z.string().min(2, "Anti-Metas"),
    topicsToAvoid: z.string().optional(),
    successVision: z.string().min(5, "Visao obrigatória"),
    realLegacy: z.string().min(5, "Qual o legado?"),
});

const formSchema = section1Schema
    .merge(section2Schema)
    .merge(section3Schema)
    .merge(section4Schema)
    .merge(section5Schema);

type FormData = z.infer<typeof formSchema>;

const TONES = ["Totalmente Profissional/Corporativo", "Profissional mas Acessível", "Líder de Pensamento (Polêmico)", "Mentor/Educador"];
const FORMATS = ["Apenas Texto", "Foto + Texto", "Vídeos Curtos (Reels/TikTok)", "Vídeos Longos"];
const FREQUENCY = ["1x por semana", "2-3x por semana", "Diariamente", "Quando der na telha"];

const STEPS = [
    { id: 1, title: "Identidade & História" },
    { id: 2, title: "Autoridade & Crenças" },
    { id: 3, title: "Audiência & Psicologia" },
    { id: 4, title: "Motor de Conteúdo" },
    { id: 5, title: "Visão & Legado" },
];

const ReiFounderPage = () => {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState(0);
    const [showDashboard, setShowDashboard] = useState(false);
    const [metrics, setMetrics] = useState<any>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
    });

    const handleNext = async () => {
        let fieldsToValidate: any[] = [];
        if (currentStep === 1) fieldsToValidate = Object.keys(section1Schema.shape);
        if (currentStep === 2) fieldsToValidate = Object.keys(section2Schema.shape);
        if (currentStep === 3) fieldsToValidate = Object.keys(section3Schema.shape);
        if (currentStep === 4) fieldsToValidate = Object.keys(section4Schema.shape);
        if (currentStep === 5) fieldsToValidate = Object.keys(section5Schema.shape);

        const isValid = await form.trigger(fieldsToValidate);

        if (isValid) {
            setDirection(1);
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
            window.scrollTo(0, 0);
        } else {
            toast({
                title: "Campos obrigatórios",
                description: "Por favor, preencha todos os campos abertos obrigatórios (*).",
                variant: "destructive"
            });
        }
    };

    const handleBack = () => {
        setDirection(-1);
        setCurrentStep((prev) => Math.max(prev - 1, 1));
        window.scrollTo(0, 0);
    };

    const calculateMetrics = (data: FormData) => {
        let growthScore = 50;
        let consistencyScore = 50;
        let authorityScore = 50;
        let uniquenessScore = 50;

        if (data.contentFrequency.includes("Diariamente")) consistencyScore += 45;
        else if (data.contentFrequency.includes("2-3x")) consistencyScore += 30;

        if (data.preferredFormats.includes("Vídeos")) { growthScore += 20; authorityScore += 10; }

        if (data.antiClient && data.antiClient.length > 50) uniquenessScore += 20;
        if (data.perceptionGap && data.perceptionGap.length > 50) authorityScore += 20;
        if (data.vocabulary && data.vocabulary.length > 30) uniquenessScore += 15;

        const totalScore = Math.round((growthScore + consistencyScore + authorityScore + uniquenessScore) / 4);

        return {
            score: totalScore,
            radarData: [
                { label: "AUTORIDADE", value: Math.min(100, authorityScore) },
                { label: "CONSISTÊNCIA", value: Math.min(100, consistencyScore) },
                { label: "CRESCIMENTO", value: Math.min(100, growthScore) },
                { label: "UNICIDADE", value: Math.min(100, uniquenessScore) },
            ],
            insights: [
                data.antiClient.length > 30 ? "FILTRO ATIVO: Você possui clareza sobre o Anti-ICP." : "RISCO CULTURAL: Falta definição estrita de red flags comerciais.",
                data.perceptionGap.length > 30 ? "ANÁLISE: O gap de percepção mapeado será a espinha dorsal." : "FALHA ESTRATÉGICA: Você precisa comunicar melhor a diferença entre o que vende e o que entrega.",
                "ESTRUTURA: A personificação de marca e o legado estão alinhados."
            ]
        };
    };

    const onSubmit = async (data: FormData) => {
        const calculated = calculateMetrics(data);
        setMetrics(calculated);
        setShowDashboard(true);
        window.scrollTo(0, 0);

    };

    const variants = {
        enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
        center: { zIndex: 1, x: 0, opacity: 1 },
        exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 })
    };

    if (showDashboard && metrics) {
        return (
            <PageLayout>
                <Section variant="dark" className="min-h-screen pt-28 pb-20">
                    <div className="container-custom max-w-6xl mx-auto">
                        <ReiDashboard
                            type="FOUNDER"
                            score={metrics.score}
                            radarData={metrics.radarData}
                            insights={metrics.insights}
                            onAction={() => toast({ title: "Plano Enviado", description: "Verifique seu e-mail." })}
                        />
                    </div>
                </Section>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            <Section variant="dark" className="min-h-screen pt-28 pb-20">
                <div className="container-custom max-w-4xl mx-auto">

                    <div className="mb-12">
                        <Link to="/rei" className="inline-flex items-center text-sm text-zinc-500 hover:text-revgreen mb-6 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Hub
                        </Link>
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tighter">
                            REI – Revenue Excellence Initiative
                            <span className="block text-lg md:text-xl text-revgreen font-normal font-mono-tech mt-2 tracking-wide uppercase">
                                Entrevista Founder Integral
                            </span>
                        </h1>

                        <div className="w-full bg-white/10 h-1.5 rounded-full mt-8 overflow-hidden">
                            <motion.div
                                className="h-full bg-revgreen"
                                initial={{ width: 0 }}
                                animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-xs font-mono-tech text-zinc-500 uppercase tracking-widest">
                            <span>Etapa {currentStep} de {STEPS.length}</span>
                            <span>{STEPS[currentStep - 1].title}</span>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-sm p-8 md:p-12 backdrop-blur-sm relative overflow-hidden">
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
                                {currentStep === 1 && (
                                    <div className="space-y-6">
                                        <h2 className="text-2xl font-bold text-white mb-8 border-l-4 border-revgreen pl-4">Identidade & História</h2>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Seu Nome *</label>
                                            <input {...form.register("fullName")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all placeholder:text-zinc-700" />
                                            {form.formState.errors.fullName && <p className="text-red-500 text-xs">{form.formState.errors.fullName.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Seu LinkedIn Atual</label>
                                            <input {...form.register("linkedinUrl")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all placeholder:text-zinc-700" />
                                            {form.formState.errors.linkedinUrl && <p className="text-red-500 text-xs">{form.formState.errors.linkedinUrl.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Cargo/Posição Atual *</label>
                                            <input {...form.register("currentRole")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all placeholder:text-zinc-700" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Mini-Bio / História de Origem *</label>
                                            <textarea {...form.register("biography")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="Resuma quem é você e como chegou aqui..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Seus Diferenciais Estratégicos *</label>
                                            <textarea {...form.register("superpowers")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="O que você faz melhor que 90% das pessoas?" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Se a sua marca pessoal fosse uma pessoa, onde ela seria vista, como se vestiria e como falaria? *</label>
                                            <textarea {...form.register("brandPersonification")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="Séria, fala baixo, veste cores sólidas... " />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="space-y-6">
                                        <h2 className="text-2xl font-bold text-white mb-8 border-l-4 border-revgreen pl-4">Autoridade & Crenças</h2>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Sobre quais tópicos você quer ser referência? *</label>
                                            <textarea {...form.register("authorityTopics")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="Ex: Vendas B2B, Liderança Remota, Futuro do Varejo..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Qual é a coisa mais importante que você quer que as pessoas entendam sobre o que faz — e que poucas realmente entendem? *</label>
                                            <textarea {...form.register("perceptionGap")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="Gap de percepção..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Existe alguma 'verdade popular' no seu nicho que você considera um mito perigoso? *</label>
                                            <textarea {...form.register("industryMyths")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="O que todo mundo aceita como verdade, mas você sabe que está errado?" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Seus Valores Inegociáveis *</label>
                                            <textarea {...form.register("coreValues")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">O que você acredita que vai mudar radicalmente no seu mercado nos próximos 5 anos — e por quê?</label>
                                            <textarea {...form.register("marketFuture")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="Sinalizações fracas do mercado..." />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 3 && (
                                    <div className="space-y-6">
                                        <h2 className="text-2xl font-bold text-white mb-8 border-l-4 border-revgreen pl-4">Audiência & Psicologia</h2>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Quem é o público-alvo principal? (Ex: Investidores, Talentos, Clientes) *</label>
                                            <textarea {...form.register("targetAudience")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Qual é a maior dor que o seu cliente sente mas raramente consegue verbalizar? *</label>
                                            <textarea {...form.register("unspokenPain")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="Ex: A dor real não é falta de leads, é o medo de não bater a meta e ser demitido..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">De onde você pega o cliente e para onde o conduz? (Estado de Entrada vs Saída) *</label>
                                            <textarea {...form.register("journeyState")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="De [Confusão/Custo alto] para [Clareza/Eficiência]." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Existe algum tipo de cliente que você aprendeu a NÃO atender mais? O que aconteceu? *</label>
                                            <textarea {...form.register("antiClient")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="Red flags de clientes que você demite..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Tom de Voz Desejado *</label>
                                            <select {...form.register("toneVoice")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all">
                                                <option value="">Selecione...</option>
                                                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Referências de Personal Branding? (Opcional)</label>
                                            <input {...form.register("references")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all" />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 4 && (
                                    <div className="space-y-6">
                                        <h2 className="text-2xl font-bold text-white mb-8 border-l-4 border-revgreen pl-4">Motor de Conteúdo</h2>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">DIsponibilidade para criar/revisar conteúdo *</label>
                                            <select {...form.register("contentFrequency")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all">
                                                <option value="">Selecione...</option>
                                                {FREQUENCY.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Formatos Preferidos *</label>
                                            <select {...form.register("preferredFormats")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all">
                                                <option value="">Selecione...</option>
                                                {FORMATS.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Quais palavras/expressões são muito suas, e quais você detesta que usem no mercado? *</label>
                                            <textarea {...form.register("vocabulary")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="Uso sempre: 'Tração'. Destesto: 'Sinergia'..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Como deve ser o fluxo de aprovação?</label>
                                            <textarea {...form.register("approvalWorkflow")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 5 && (
                                    <div className="space-y-6">
                                        <h2 className="text-2xl font-bold text-white mb-8 border-l-4 border-revgreen pl-4">Visão & Legado</h2>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">O que você NÃO quer ser/parecer? (Anti-Role Models) *</label>
                                            <textarea {...form.register("antiGoals")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Assuntos proibidos ou sensíveis?</label>
                                            <input {...form.register("topicsToAvoid")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Visão de Sucesso: Como você quer estar mercadologicamente daqui a 1 ano? *</label>
                                            <textarea {...form.register("successVision")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-300">Como você quer ser lembrado daqui a 20 anos? Qual é a missão que te faz continuar quando fica difícil? *</label>
                                            <textarea {...form.register("realLegacy")} className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:border-revgreen focus:ring-1 focus:ring-revgreen outline-none transition-all h-24" placeholder="O real legado..." />
                                        </div>
                                    </div>
                                )}

                            </motion.div>
                        </AnimatePresence>

                        <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/10">
                            <button
                                onClick={handleBack}
                                disabled={currentStep === 1}
                                className={`text-sm font-medium text-zinc-500 hover:text-white transition-colors flex items-center gap-2 ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                            >
                                <ArrowLeft className="w-4 h-4" /> Anterior
                            </button>

                            <Button
                                onClick={currentStep === STEPS.length ? form.handleSubmit(onSubmit) : handleNext}
                                className="bg-revgreen hover:bg-revgreen/90 text-black border-0"
                            >
                                {currentStep === STEPS.length ? 'Gerar Dashboard' : 'Próximo'} <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>

                    </div>
                </div>
            </Section>
        </PageLayout>
    );
};

export default ReiFounderPage;
