import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, CheckCircle2, Command } from 'lucide-react';
import { DiagnosticLayout } from '@/components/diagnostics/DiagnosticLayout';
import { GhlFormEmbed } from '@/components/shared/GhlFormEmbed';
import { GHL_FORMS } from '@/config/ghl';
import { ScoreGauge } from '@/components/diagnostics/ScoreGauge';
import { DiagnosticActionSection } from '@/components/diagnostics/DiagnosticActionSection';
import { BenchmarkBar } from '@/components/diagnostics/BenchmarkBar';
import { DiagnosticBookingModal } from '@/components/diagnostics/DiagnosticBookingModal';
import { QuestionProgressBar } from '@/components/diagnostics/QuestionProgressBar';
import { ShareButtons } from '@/components/diagnostics/ShareButtons';
import { getDiagnosticInsights } from '@/utils/diagnosticMapping';
import SEO from '@/components/shared/SEO';
import { analyzeDiagnosticAI, DiagnosticAnalysisResult } from '@/api/diagnosticAnalysis';

const QUESTIONS = [
 {
 id: 1,
 question: "Se você tivesse uma varinha mágica hoje, qual problema resolveria primeiro no seu negócio?",
 options: [
 { label: "Operação (Tudo roda, mas eu não durmo - gargalo sou eu)", score: 0 },
 { label: "Reter (Fechamos bem, mas churn tá alto)", score: 5 },
 { label: "Converter (Entra lead bom, mas o time não fecha)", score: 10 },
 { label: "Tracionar aquisição (Não entra lead suficiente)", score: 20 }
 ],
 log: "O maior limitador de crescimento raramente é onde os leads entram, é onde eles se perdem."
 },
 {
 id: 2,
 question: "Qual é a sua real clareza financeira sobre o Custo de Aquisição (CAC) 'Teto' versus o CAC Ideal?",
 options: [
 { label: "Sei de cor por canais/cohort. Monitoramos o limite (Break-even) semanalmente", score: 20 },
 { label: "Sei o custo médio. Mas não delimitei o 'teto' onde começo a tomar prejuízo bruto", score: 10 },
 { label: "Olho majoritariamente para o Custo Por Lead (CPL) na camada de aquisição Ads", score: 5 },
 { label: "Ignoro Unit Economics isolado. Só meço de forma primária gastos vs receita total", score: 0 }
 ],
 log: "A ausência ou desconhecimento do CAC Teto (Break-even) é o que cega a alavancagem de orçamentos e mata caixas."
 },
 {
 id: 3,
 question: "Como está distribuída a sua matriz de risco em Vendas e Marketing?",
 options: [
 { label: "100% distribuída (Inbound, Outbound, Indicação, Ads)", score: 20 },
 { label: "Temos dois canais principais funcionando bem", score: 10 },
 { label: "Dependemos quase 100% de tráfego pago (Meta/Google)", score: 5 },
 { label: "Vivemos de indicação e network", score: 0 }
 ],
 log: "Depender de indicação não é estratégia de venda, é rezar pelo melhor."
 },
 {
 id: 4,
 question: "Se dobrarmos a sua entrada de leads amanhã, sua operação quebra?",
 options: [
 { label: "Não, os processos já estão montados e automatizados", score: 20 },
 { label: "Quebra a entrega/produto", score: 10 },
 { label: "Quebra o time comercial (muito processo manual)", score: 5 },
 { label: "Eu surto, porque eu mesmo faço as duas coisas", score: 0 }
 ],
 log: "Você não controla o que você não processualiza. Sem processo, você tem limite físico de caixa."
 },
 {
 id: 5,
 question: "Em relação ao seu Perfil Ideal de Cliente (ICP), quão refinada é a segmentação do seu go-to-market hoje?",
 options: [
 { label: "Tese cirúrgica. Nossa engenharia processual qualifica firmemente nicho, dor e tamanho", score: 20 },
 { label: "Saber qual o ICP sabemos, mas nossa cópia e mídia atraem frequentes curiosos genéricos", score: 10 },
 { label: "Nosso ICP é um tiro muito vasto (Ex: 'Atendemos MPEs e médias do Brasil todo')", score: 5 },
 { label: "Nenhuma barreira de entrada. Qualquer um que se interessar pelo produto, deixamos entrar", score: 0 }
 ],
 log: "Comunicação para todos ecoa para ninguém. Alvo amplo é ausência fatal de posicionamento em B2B."
 },
 {
 id: 6,
 question: "Como você avalia a capacidade de conversão do seu Site / Landing Page principal?",
 options: [
 { label: "Alta conversão (Oferta clara, CRO otimizado e captura direta por IA/CRM)", score: 20 },
 { label: "Conversão mediana (Gera leads, mas a maioria não tem perfil ideal/ICP)", score: 10 },
 { label: "Baixa conversão (O site é institucional, pouca clareza de proposta de valor)", score: 5 },
 { label: "Não temos LP otimizada ou o site é desatualizado/lento", score: 0 }
 ],
 log: "Seu site é a porta de entrada da sua marca. Se a proposta de valor não for instantânea, você rasga orçamento de mídia."
 }
];

type Step = 'start' | 'questions' | 'lead-capture' | 'results';

const GrowthScore = () => {
 const [step, setStep] = useState<Step>('questions');
 const [currentQ, setCurrentQ] = useState(0);
 const [score, setScore] = useState(0);
 const [answers, setAnswers] = useState<number[]>([]);
 const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
 const [selectedOption, setSelectedOption] = useState<number | null>(null);
 const [showLog, setShowLog] = useState(false);
 const [analysisResult, setAnalysisResult] = useState<DiagnosticAnalysisResult | null>(null);
 const [isAnalyzing, setIsAnalyzing] = useState(false);
 const [hasSubmittedLead, setHasSubmittedLead] = useState(false);

 const insights = getDiagnosticInsights('growth', score);
 const currentQData = QUESTIONS[currentQ];

 // ClickUp / Linear style keyboard navigation (A, B, C, D)
 useEffect(() => {
 if (step !== 'questions' || selectedOption !== null) return;

 const handleKeyDown = (e: KeyboardEvent) => {
 const key = e.key.toUpperCase();
 const optionMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, '1': 0, '2': 1, '3': 2, '4': 3 };

 if (key in optionMap) {
 const optIndex = optionMap[key];
 if (currentQData.options[optIndex]) {
 handleAnswer(currentQData.options[optIndex].score, optIndex);
 }
 }
 };

 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [step, currentQ, selectedOption]);

 const handleAnswer = (optionScore: number, optionIndex: number) => {
 if (selectedOption !== null) return;
 setSelectedOption(optionIndex);
 setShowLog(true);

 const newScore = score + optionScore;
 setScore(newScore);
 const updatedAnswers = [...answers, optionScore];
 setAnswers(updatedAnswers);

 setTimeout(() => {
 setShowLog(false);
 setSelectedOption(null);
 if (currentQ < QUESTIONS.length - 1) {
 setCurrentQ(prev => prev + 1);
 } else {
 setStep('results');
 }
 }, 1200);
 };

  const handleSubmitted = useCallback(() => {
    setHasSubmittedLead(true);
    setIsAnalyzing(true);
    setStep('results');
    analyzeDiagnosticAI('growth', answers, score)
      .then(result => setAnalysisResult(result))
      .catch(() => {})
      .finally(() => setIsAnalyzing(false));
  }, [answers, score]);

 const getResultMap = (s: number) => {
 if (s >= 80) return { title: "Blindagem Parcial", msg: "Operação sólida, mas subutilizando Automação." };
 if (s >= 50) return { title: "Vazamento Sistêmico", msg: "Processos manuais destruindo margem líquida." };
 return { title: "Hemorragia de Caixa", msg: "Estrutura comercial travada, alta perda de leads." };
 };

 const teaserScore = score;

 return (
 <>
 <SEO
 title="Score 360° - Diagnóstico de Growth B2B Gratuito"
 description="Faça o diagnóstico gratuito de Growth e descubra onde sua operação B2B está vazando receita. Análise com IA em 5 perguntas estratégicas."
 canonical="https://revhackers.com.br/score"
 breadcrumbs={[
 { name: "Home", url: "https://revhackers.com.br/" },
 { name: "Diagnósticos", url: "https://revhackers.com.br/diagnostico" },
 { name: "Score 360°", url: "https://revhackers.com.br/score" }
 ]}
 />
 <DiagnosticLayout
 title={step === 'results' ? "" : "Diagnóstico 360° de Growth"}
 subtitle={step === 'results' ? "" : "Identifique vazamentos no seu funil de Vendas e Marketing em 1 minuto"}
 variant={step === 'results' ? 'dark' : 'light'}
 hideHeader={step === 'results'}
 centered={step === 'results'}
 headerVariant="default"
 >
 {step === 'results' && <div className="fixed inset-0 bg-white -z-50 pointer-events-none" />}
 
 {step === 'questions' && (
 <div className="w-full max-w-3xl mx-auto space-y-6">
 {/* Main Linear / Notion Card Container */}
 <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xl p-6 sm:p-10 space-y-8 relative overflow-hidden backdrop-blur-xl">
 {/* Question Header & Progress Bar */}
 <div className="space-y-4">
 <QuestionProgressBar current={currentQ} total={QUESTIONS.length} variant="light" />
 </div>

 {/* Animated Question Content */}
 <AnimatePresence mode="wait">
 <motion.div
 key={currentQ}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ duration: 0.25, ease: "easeOut" }}
 className="space-y-6"
 >
 <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 leading-snug">
 {currentQData.question}
 </h2>

 <div className="grid grid-cols-1 gap-3">
 {currentQData.options.map((opt, idx) => {
 const letter = String.fromCharCode(65 + idx);
 const isSelected = selectedOption === idx;

 return (
 <button
 key={idx}
 disabled={selectedOption !== null}
 onClick={() => handleAnswer(opt.score, idx)}
 className={`group relative flex items-center justify-between p-4 sm:p-5 text-left transition-all duration-200 border rounded-xl shadow-xs ${
 isSelected
 ? "bg-white text-zinc-900 border-zinc-950 ring-2 ring-[#00CC6A] ring-offset-1"
 : "bg-white border-zinc-200/90 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50/80 hover:shadow-xs"
 } ${selectedOption !== null && !isSelected ? "opacity-40" : "opacity-100"}`}
 >
 <div className="flex items-center gap-4">
 <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-xs font-sans font-bold rounded-lg border transition-all duration-200 ${
 isSelected
 ? "bg-[#00CC6A] text-black border-[#00CC6A]"
 : "bg-zinc-100 border-zinc-200 text-zinc-700 group-hover:bg-white group-hover:text-zinc-900 group-hover:border-zinc-950"
 }`}>
 {letter}
 </div>
 <span className="text-xs sm:text-sm font-semibold leading-relaxed">
 {opt.label}
 </span>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 {/* Keyboard Badge [A], [B], [C], [D] style Notion/ClickUp */}
 <span className={`hidden sm:inline-flex items-center justify-center font-sans text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
 isSelected
 ? "bg-zinc-50 text-zinc-600 border-zinc-200"
 : "bg-zinc-100 text-zinc-500 border-zinc-200 group-hover:border-zinc-300 group-hover:text-zinc-700"
 }`}>
 {letter}
 </span>
 <ArrowRight size={15} className={`transition-all ${isSelected ? "text-[#00CC6A] translate-x-0.5" : "text-zinc-600 group-hover:text-zinc-600 group-hover:translate-x-0.5"}`} />
 </div>
 </button>
 );
 })}
 </div>
 </motion.div>
 </AnimatePresence>

 {/* Notion Callout Box ao responder */}
 <AnimatePresence>
 {showLog && currentQData.log && (
 <motion.div
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 8 }}
 className="bg-zinc-50 border border-zinc-200/90 rounded-xl p-4 flex items-start gap-3 text-xs text-zinc-600"
 >
 <div className="w-2 h-2 rounded-full bg-[#00CC6A] mt-1 shrink-0 animate-pulse" />
 <div>
 <span className="font-bold text-zinc-900 block mb-0.5">Insight de Inteligência B2B</span>
 <p className="leading-relaxed text-zinc-600">{currentQData.log}</p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Keyboard shortcut hint footer (Linear / Notion UX) */}
 <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] font-sans text-zinc-500">
 <span className="flex items-center gap-1.5">
 <Command size={12} /> Pressione <kbd className="bg-zinc-100 border border-zinc-200 px-1 rounded text-zinc-700 font-bold">A</kbd> <kbd className="bg-zinc-100 border border-zinc-200 px-1 rounded text-zinc-700 font-bold">B</kbd> <kbd className="bg-zinc-100 border border-zinc-200 px-1 rounded text-zinc-700 font-bold">C</kbd> ou <kbd className="bg-zinc-100 border border-zinc-200 px-1 rounded text-zinc-700 font-bold">D</kbd> para responder
 </span>
 <span className="hidden sm:inline-block">100% Privado</span>
 </div>
 </div>
 </div>
 )}

  {step === 'results' && (
    <>
      {!hasSubmittedLead && (
        <div className="w-full max-w-6xl mx-auto my-8 sm:my-12 animate-fade-in px-4 sm:px-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-10 lg:p-12 shadow-sm flex flex-col lg:flex-row items-stretch gap-8 lg:gap-12">
            
            {/* Lado Esquerdo: Diagnóstico e Métricas */}
            <div className="flex-1 flex flex-col justify-between space-y-6 lg:border-r border-zinc-100 lg:pr-10">
              <div className="space-y-3">
                <p className="text-[#00CC6A] text-xs font-semibold tracking-wider uppercase">
                  Diagnóstico de Growth • Análise Concluída
                </p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 leading-snug">
                  Identificamos vazamentos significativos na sua operação comercial.
                </h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Com base no algoritmo de IA e nas respostas declaradas, calculamos a maturidade e o impacto financeiro acumulado em 12 meses.
                </p>
              </div>

              {/* Cards de Métricas com borda e acabamento refinado */}
              <div className="space-y-3">
                <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 sm:p-5 flex items-center justify-between shadow-2xs">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Score de Maturidade</span>
                    <span className="text-xs text-zinc-900 font-bold block">
                      {teaserScore >= 70 ? 'Operação Estruturada' : teaserScore >= 40 ? 'Vazamento de Processos' : 'Gargalo Crítico de Receita'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-0.5 bg-white border border-zinc-200 px-3 py-1.5 rounded-lg shadow-2xs">
                    <span className="text-2xl font-extrabold tracking-tight text-[#00CC6A]">{teaserScore}</span>
                    <span className="text-xs font-bold text-zinc-400">/100</span>
                  </div>
                </div>

                <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Vazamento Anual Projetado</span>
                  <div className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                    {( Math.max(120000, (100 - teaserScore) * 4850 + (answers[0] === 0 ? 140000 : 0) + (answers[1] === 0 ? 95000 : 0)) ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    <span className="text-xs font-normal text-zinc-500 ml-1">/ano</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed pt-0.5 border-t border-zinc-200/60 mt-2">
                    {answers[0] === 0 
                      ? "Gargalo operacional centralizado no fundador e processos manuais que consomem margem líquida." 
                      : answers[2] === 0 
                      ? "Vulnerabilidade crítica de receita por dependência de poucos canais de aquisição."
                      : "Desperdício de orçamento por ausência de teto rígido de CAC e triagem por IA."}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-4 text-xs text-zinc-400 font-medium">
                <span>✓ 6 Dimensões Auditadas</span>
                <span>•</span>
                <span>✓ Algoritmo de IA</span>
              </div>
            </div>

            {/* Lado Direito: Formulário Corporativo Expandido */}
            <div className="flex-1 w-full max-w-xl flex flex-col justify-start">
              <GhlFormEmbed
                formId={GHL_FORMS.score}
                title="Desbloquear Relatório Completo"
                params={{ diagnostic_type: 'growth', diagnostic_score: String(score), diagnostic_category: getResultMap(score).title }}
                minHeight={620}
                onSubmitted={handleSubmitted}
              />
            </div>

          </div>
        </div>
      )}

 <div className={`space-y-0 transition-all duration-700 ${!hasSubmittedLead ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>
 <div className="mb-12 text-center max-w-4xl mx-auto pt-8">
 <div className="inline-flex items-center gap-2 mb-4 bg-white border border-zinc-200 px-3 py-1">
 <span className="w-1.5 h-1.5 bg-revgreen shadow-[0_0_10px_#00CC6A]"></span>
 <span className="text-xs font-sans font-bold text-zinc-500 ">Status: Finalizado</span>
 </div>
 <h1 className="text-3xl md:text-3xl font-bold text-zinc-900 mb-2">
 Diagnóstico <span className="text-zinc-600">360</span>
 </h1>
 <p className="text-zinc-500 font-medium max-w-xl mx-auto">
 Análise estrutural do gargalo de retenção, vendas e tracionamento.
 </p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
 <div className="lg:col-span-4">
 <ScoreGauge
 score={score}
 label="Maturidade de Growth"
 description="Índice sintético baseado nas respostas declaradas."
 />
 </div>

 <div className="lg:col-span-8 flex flex-col">
 <div className="border border-zinc-200 p-8 bg-white h-full flex flex-col justify-center">
 {isAnalyzing ? (
 <div className="flex flex-col items-center justify-center gap-4 py-8">
 <div className="w-6 h-6 border-2 border-revgreen border-t-transparent rounded-full animate-spin" />
 <div className="text-center space-y-1">
 <span className="block text-xs font-sans text-zinc-600 ">IA Processando Análise</span>
 </div>
 </div>
 ) : analysisResult ? (
 <>
 <div className="flex items-center gap-2 mb-4">
 <span className="text-xs font-bold text-zinc-900 bg-zinc-100 px-3 py-1.5 border border-zinc-200">
 OPORTUNIDADE DE OTIMIZAÇÃO DETECTADA
 </span>
 </div>
 <p className="text-zinc-900 text-lg font-medium leading-relaxed mb-0">
 Sem Inteligência Artificial para qualificar e um CRM que obriga o follow-up, sua operação perde R$ {( (100 - score) * 3450 ).toLocaleString('pt-BR')} anualmente, no mínimo. {analysisResult.headline}
 </p>
 </>
 ) : (
 <div className="flex flex-col justify-center py-8">
 <p className="text-zinc-500 text-sm font-sans text-center">
 Análise será gerada após identificação
 </p>
 </div>
 )}
 </div>
 </div>
 </div>

 <div className="w-[100vw] relative left-[50%] right-[50%] -ml-[50vw] bg-white px-4 md:px-0 py-20 mt-16 border-t border-zinc-200">
 <div className="max-w-6xl mx-auto space-y-16">
 <BenchmarkBar userScore={score} type="growth" variant="light" />

 <DiagnosticActionSection
 title="Estanque o Vazamento de Caixa."
 subtitle="Apenas 3 slots mensais abertos. Avaliaremos tecnicamente se sua operação é elegível para plugar a Inteligência Artificial no CRM e sanar essa perda."
 onCtaClick={() => setIsBookingModalOpen(true)}
 />

 <DiagnosticBookingModal
 isOpen={isBookingModalOpen}
 onClose={() => setIsBookingModalOpen(false)}
 diagnosticType="growth"
 />

 <div className="flex justify-center pt-8">
 <ShareButtons score={score} type="Growth" />
 </div>
 </div>
 </div>
 </div>
 </>
 )}
 </DiagnosticLayout>
 </>
 );
};

export default GrowthScore;
