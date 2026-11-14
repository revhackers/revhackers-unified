
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeFounderProfileAI, FounderAnalysisResult } from "@/api/founderAnalysis";
import { Brain, ArrowRight, Users, Loader2, AlertTriangle, Command } from 'lucide-react';
import { DiagnosticLayout } from '@/components/diagnostics/DiagnosticLayout';
import { ScoreGauge } from '@/components/diagnostics/ScoreGauge';
import { MetricCard } from '@/components/diagnostics/MetricCard';
import { DiagnosticActionSection } from '@/components/diagnostics/DiagnosticActionSection';
import { DiagnosticBookingModal } from '@/components/diagnostics/DiagnosticBookingModal';
import DiagnosticBookingEmbed from '@/components/diagnostics/DiagnosticBookingEmbed';
import { getDiagnosticInsights } from '@/utils/diagnosticMapping';
import { QuestionProgressBar } from '@/components/diagnostics/QuestionProgressBar';
import SEO from '@/components/shared/SEO';
import { GhlFormEmbed } from '@/components/shared/GhlFormEmbed';
import { GHL_FORMS } from '@/config/ghl';

// Questions centered on "Founder Authority & Bottleneck" - 4 dimensões, total = 100pts
const QUESTIONS = [
 {
 id: 1,
 question: "Quantas horas da sua semana são dedicadas a 'apagar incêndios' em tarefas operacionais?",
 options: [
 { label: "Quase zero. Atuo na estratégia (CEO de fato)", score: 25 },
 { label: "20-40% do tempo. Ainda controlo entregas críticas", score: 15 },
 { label: "A empresa para se eu tirar 15 dias de férias", score: 5 },
 { label: "100%. Eu sou o produto/serviço.", score: 0 }
 ],
 log: "O verdadeiro valor do founder não é a força bruta, é o poder de alavancagem."
 },
 {
 id: 2,
 question: "Quando um cliente B2B decide pesquisar o seu nome (não o da empresa), o que ele encontra?",
 options: [
 { label: "Uma máquina de influência: Materiais ricos, tese validada", score: 25 },
 { label: "Um perfil do LinkedIn atualizado e arrumado", score: 15 },
 { label: "Citações tímidas na página Institucional", score: 5 },
 { label: "Basicamente o fantasma do Orkut. Zero presença.", score: 0 }
 ],
 log: "Pessoas compram de pessoas. Sua autoridade reduz o atrito e abaixa o CAC da empresa."
 },
 {
 id: 3,
 question: "Seu esforço nas Redes Sociais gera tapinhas nas costas ou Pipeline de Vendas?",
 options: [
 { label: "Post gera leads qualificados e mensagens no Inbox para fechar", score: 25 },
 { label: "Engajamento ok, reputação sobe, mas vendas são raras", score: 15 },
 { label: "Tenho likes de colegas e funcionários apenas", score: 5 },
 { label: "Só tenho tempo de repostar artes da empresa", score: 0 }
 ],
 log: "Autoridade que não se traduz em captação de receita é apenas ego digital."
 },
 {
 id: 4,
 question: "Você vende um serviço 'como o do concorrente', ou possui uma metodologia proprietária inconfundível?",
 options: [
 { label: "Temos um framework único para resolver a dor, somos incomparáveis", score: 25 },
 { label: "Temos um bom pitch, mas o produto final é padrão de mercado", score: 15 },
 { label: "Diferenciamos por ter 'mais qualidade e atendimento'", score: 5 },
 { label: "A guerra é 100% no preço (Commodity)", score: 0 }
 ],
 log: "Sem fosso competitivo ('Moat'), você é forçado a ceder desconto para liderar mercado."
 }
];

type Step = 'questions' | 'lead-capture' | 'results';

const FounderScore = () => {
  const [step, setStep] = useState<Step>('questions');
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const [hasSubmittedLead, setHasSubmittedLead] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [analysisResult, setAnalysisResult] = useState<FounderAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);

  const currentQData = QUESTIONS[currentQ];

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
  }, [step, currentQ, selectedOption, currentQData]);

  const handleAnswer = (optionScore: number, optionIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIdx);
    setShowLog(true);

    const newScore = score + optionScore;
    const updatedAnswers = [...answers, optionScore];

    setScore(newScore);
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
    analyzeFounderProfileAI(linkedinUrl, answers, score)
      .then(result => setAnalysisResult(result))
      .catch(err => console.error(err))
      .finally(() => setIsAnalyzing(false));
  }, [linkedinUrl, answers, score]);

  const getResultMap = (s: number) => {
    if (s >= 80) return { title: "CEO Estrategista", msg: "Você opera como um CEO de verdade, focado no futuro e na cultura." };
    if (s >= 50) return { title: "CEO Híbrido", msg: "Você equilibra pratos entre operação e estratégia. O risco de burnout existe." };
    return { title: "CEO Operacional", msg: "Você é o gargalo. A empresa não cresce além da sua capacidade de horas." };
  };

  const getFinalScore = () => {
    return score;
  };

  const finalScore = getFinalScore();
  const resultDetails = getResultMap(finalScore);
  const insights = getDiagnosticInsights('founder', finalScore);

  return (
    <>
      <SEO
        title="Diagnóstico Founder - Avalie sua Autoridade Digital B2B"
        description="Descubra se você é um CEO Estrategista ou um Gargalo Operacional. Diagnóstico gratuito com análise sobre autoridade e liderança."
        canonical="https://revhackers.com.br/score-founder"
        breadcrumbs={[
          { name: "Home", url: "https://revhackers.com.br/" },
          { name: "Diagnósticos", url: "https://revhackers.com.br/diagnostico" },
          { name: "Score Founder", url: "https://revhackers.com.br/score-founder" }
        ]}
      />
      <DiagnosticLayout
        title={step === 'results' ? "" : "Diagnóstico Founder & Autoridade"}
        subtitle={step === 'results' ? "" : "Analise e entenda como transformar sua presença de liderança em um canal ativo de geração de demanda B2B"}
        variant={step === 'results' ? 'dark' : 'light'}
        centered={step === 'results'}
        hideHeader={step === 'results'}
        headerVariant="default"
      >
        {step === 'results' && <div className="fixed inset-0 bg-white -z-50 pointer-events-none" />}
        {step === 'questions' && (
          <div className="w-full max-w-3xl mx-auto space-y-4">
            <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xl p-5 sm:p-7 space-y-5 relative overflow-hidden backdrop-blur-xl">
              <div>
                <QuestionProgressBar current={currentQ} total={QUESTIONS.length} variant="light" />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 leading-snug">
                    {currentQData.question}
                  </h2>

                  <div className="grid grid-cols-1 gap-2.5">
                    {currentQData.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = selectedOption === idx;

                      return (
                        <button
                          key={idx}
                          disabled={selectedOption !== null}
                          onClick={() => handleAnswer(opt.score, idx)}
                          className={`group relative flex items-center justify-between p-3 sm:p-3.5 text-left transition-all duration-200 border rounded-xl shadow-xs cursor-pointer ${
                            isSelected
                              ? "bg-white text-zinc-900 border-zinc-950 ring-2 ring-[#00CC6A]"
                              : "bg-white border-zinc-200/80 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50/50"
                          } ${selectedOption !== null && selectedOption !== idx ? "opacity-40" : "opacity-100"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center text-xs font-sans font-bold rounded-lg border transition-colors ${
                              isSelected
                                ? "bg-[#00CC6A] text-black border-[#00CC6A]"
                                : "bg-zinc-100 border-zinc-200 text-zinc-600 group-hover:border-zinc-300 group-hover:text-zinc-900"
                            }`}>
                              {letter}
                            </div>
                            <span className="text-sm sm:text-base font-medium leading-normal">
                              {opt.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-zinc-400 group-hover:text-zinc-900 transition-colors ml-3 shrink-0">
                            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">{letter}</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {showLog && currentQData.log && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-950 text-xs sm:text-sm font-medium leading-relaxed flex items-start gap-2">
                      <span className="shrink-0 font-bold">💡 Insight:</span>
                      <span>{currentQData.log}</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 text-xs sm:text-sm text-zinc-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Command className="w-3.5 h-3.5" /> Pressione <kbd className="px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-700 font-semibold">A</kbd> <kbd className="px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-700 font-semibold">B</kbd> <kbd className="px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-700 font-semibold">C</kbd> ou <kbd className="px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-700 font-semibold">D</kbd> para responder
                </span>
                <span>100% Privado</span>
              </div>
            </div>
          </div>
        )}

 {step === 'results' && (
    <>
      {!hasSubmittedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 p-6 md:p-10 w-full max-w-4xl flex flex-col md:flex-row items-center md:items-stretch gap-8 md:gap-12 shadow-2xl rounded-2xl relative overflow-hidden my-auto max-h-[90vh]">
            {/* Coluna Esquerda: Teaser com Gatilho do CNPJ */}
            <div className="flex-1 flex flex-col justify-center text-center md:text-left space-y-5 md:border-r border-zinc-800 md:pr-10">
              <div className="inline-flex items-center gap-2 bg-zinc-800/80 px-3 py-1 border border-zinc-700/80 rounded-full w-fit mx-auto md:mx-0">
                <div className="w-2 h-2 rounded-full bg-[#00CC6A] animate-pulse"></div>
                <span className="text-xs font-bold text-zinc-200">Análise Prévia • Score {finalScore}/100</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
                Quer um Raio-X completo da sua empresa e concorrentes?
              </h3>

              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-normal">
                Preencha o formulário ao lado com o CNPJ da sua empresa para liberar o diagnóstico completo. Nosso sistema vai mapear o seu mercado, analisar seus concorrentes e trazer tudo o que eles estão fazendo em um diagnóstico completo para você seguir e implementar.
              </p>

              <div className="pt-1 flex flex-col gap-2 text-xs font-semibold text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00CC6A] shrink-0" />
                  <span>Mapeamento de mercado & inteligência competitiva</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00CC6A] shrink-0" />
                  <span>Preenchimento rápido via CNPJ da Empresa (Opcional)</span>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Formulário */}
            <div className="flex-1 w-full max-w-md flex flex-col justify-center">
              <GhlFormEmbed
                formId={GHL_FORMS.score}
                title="Liberar Diagnóstico"
                params={{
                  rh_diagnostic_type: 'founder',
                  rh_diagnostic_score: String(score),
                  rh_diagnostic_category: getResultMap(score).title,
                }}
                minHeight={620}
                onSubmitted={handleSubmitted}
              />
            </div>
          </div>
        </div>
      )}

      <div className={`space-y-12 transition-all duration-500 ${!hasSubmittedLead ? 'blur-md opacity-30 pointer-events-none' : ''}`}>

        {/* DASHBOARD HEADLINE */}
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 mb-3 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#00CC6A] animate-pulse"></span>
            <span className="text-xs font-bold text-zinc-300">Status: Auditoria Concluída</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">
            Diagnóstico <span className="text-[#00CC6A]">Founder & Autoridade</span>
          </h1>
          <p className="text-zinc-400 font-medium text-sm md:text-base max-w-xl mx-auto">
            Análise de posicionamento estratégico, autoridade digital e capacidade de descentralização.
          </p>
        </div>

        {/* TOP SCORE & AI ARCHEETYPE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
          <div className="lg:col-span-4 flex">
            <ScoreGauge
              score={finalScore}
              label="Founder Authority"
              description="Índice de autoridade e liberdade operacional."
            />
          </div>

          <div className="lg:col-span-8 flex flex-col justify-center bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-6 md:p-8 relative overflow-hidden backdrop-blur-xl">
            {/* AI Archetype Card */}
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#00CC6A]" />
                <span className="text-xs font-semibold tracking-wider uppercase">Processando Inteligência Digital...</span>
              </div>
            ) : (
              <div className="relative z-10 space-y-5">
                <div className="inline-flex items-center gap-2 bg-zinc-800/80 px-3 py-1 border border-zinc-700/70 rounded-full">
                  <Brain className="w-3.5 h-3.5 text-[#00CC6A]" />
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Arquétipo Identificado
                  </span>
                </div>

                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-white mb-2 tracking-tight">
                    {(analysisResult?.archetype || resultDetails.title).toUpperCase()}
                  </h2>
                  {analysisResult?.headline && (
                    <p className="text-base text-zinc-300 font-medium italic border-l-2 border-[#00CC6A] pl-3">
                      "{analysisResult.headline}"
                    </p>
                  )}
                </div>

                <p className="text-zinc-300 text-xs md:text-sm leading-relaxed bg-zinc-950/60 p-4 border border-zinc-800/80 rounded-xl">
                  {analysisResult?.analysis || resultDetails.msg}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="bg-zinc-950/40 border border-zinc-800/80 p-4 rounded-xl">
                    <h4 className="text-xs font-bold text-emerald-400 mb-2.5 flex items-center gap-2 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00CC6A]"></span> Vantagens Competitivas
                    </h4>
                    <ul className="space-y-1.5">
                      {(analysisResult?.strengths && analysisResult.strengths.length > 0 ? analysisResult.strengths : ["Foco executivo claro", "Tese de mercado definida"]).map((s, i) => (
                        <li key={i} className="text-zinc-300 text-xs font-medium flex items-center gap-2">
                          <span className="text-[#00CC6A] font-bold">0{i + 1}.</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800/80 p-4 rounded-xl">
                    <h4 className="text-xs font-bold text-amber-400 mb-2.5 flex items-center gap-2 uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Pontos Cegos
                    </h4>
                    <ul className="space-y-1.5">
                      {(analysisResult?.blindSpots && analysisResult.blindSpots.length > 0 ? analysisResult.blindSpots : ["Gargalo operacional concentrado", "Distribuição dependente de poucas pessoas"]).map((s, i) => (
                        <li key={i} className="text-zinc-300 text-xs font-medium flex items-center gap-2">
                          <span className="text-amber-400 font-bold">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* WHITE CONTENT SECTION FOR AUDIT DETAILS */}
        <div className="w-[100vw] relative left-[50%] right-[50%] -ml-[50vw] bg-white text-zinc-900 px-6 py-16 mt-16 border-t border-zinc-200">
          <div className="max-w-5xl mx-auto space-y-16">
            
            {/* Actionable Insight Banner */}
            <div className="border-l-4 border-[#00CC6A] bg-emerald-50/60 p-6 md:p-8 rounded-r-2xl border border-emerald-100 shadow-xs">
              <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>💡 Recomendação Estratégica Imediata</span>
              </h4>
              <p className="text-zinc-900 text-base md:text-lg font-semibold leading-relaxed">
                {analysisResult?.actionableInsight || insights.action}
              </p>
              <p className="text-zinc-600 text-xs md:text-sm mt-2 leading-relaxed">
                {insights.description}
              </p>
            </div>

            {/* PREMISSAS / PILLARES SECTION */}
            <section className="space-y-8">
              <div className="text-center md:text-left space-y-2">
                <p className="text-[#00CC6A] text-xs font-bold uppercase tracking-wider">
                  Detalhamento de Diagnóstico
                </p>
                <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">
                  Sua marca pessoal <span className="text-zinc-500 font-normal">vende ou dorme?</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {QUESTIONS.map((q, idx) => {
                  const userAnswerScore = answers[idx] ?? 0;
                  const userAnswerData = q.options.find(o => o.score === userAnswerScore);
                  const isCritical = userAnswerScore < 10;

                  return (
                    <div key={idx} className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200/90 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Pilar 0{idx + 1}
                        </span>
                        {isCritical ? (
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200">
                            Ajuste Crítico
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            Adequado
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm md:text-base font-bold text-zinc-900 leading-snug">
                        {q.question}
                      </h3>

                      <div className="bg-white border border-zinc-200/80 p-3 rounded-xl text-xs font-medium text-zinc-700">
                        <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Sua Escolha:</span>
                        "{userAnswerData?.label || 'Não Respondido'}"
                      </div>

                      <div className="pt-2 border-t border-zinc-200/60">
                        <p className="text-xs text-zinc-600 leading-relaxed">
                          <strong className="text-zinc-900 font-semibold">Insight:</strong> {q.log}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Final CTA Area */}
            <div className="pt-6">
              <DiagnosticActionSection
                title="Retome o Controle da Sua Operação."
                subtitle="Agende uma sessão estratégica gratuita de 30 minutos com nossos diretores para descentralizar a operação e escalar sua autoridade."
                onCtaClick={() => setIsBookingModalOpen(true)}
              />

              <DiagnosticBookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                diagnosticType="founder"
              />
            </div>
          </div>
        </div>
      </div>
    </>
 )}
 </DiagnosticLayout >
 </>
 );
};

export default FounderScore;
