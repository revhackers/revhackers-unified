import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Command } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitPublicDiagnostic } from '@/api/publicDiagnostic';
import { buildGrowthLead, validateDiagnosticPayload } from '@/lib/diagnosticLeadPayload';
import { DiagnosticLayout } from '@/components/diagnostics/DiagnosticLayout';
import { DiagnosticForm, DiagnosticFormData } from '@/components/diagnostics/DiagnosticForm';
import { ScoreGauge } from '@/components/diagnostics/ScoreGauge';
import { DiagnosticActionSection } from '@/components/diagnostics/DiagnosticActionSection';
import { DiagnosticBookingModal } from '@/components/diagnostics/DiagnosticBookingModal';
import { QuestionProgressBar } from '@/components/diagnostics/QuestionProgressBar';
import SEO from '@/components/shared/SEO';
import { GROWTH_AXES, GROWTH_QUESTIONS } from '@/lib/growth-diagnostic/spec';
import type { GrowthAxisId } from '@/lib/growth-diagnostic/spec';
import { buildResult, normalizeOptionScore } from '@/lib/growth-diagnostic/scoring';

type Step = 'questions' | 'lead-capture' | 'results';

const DEMONSTRATIVO_SEAL = 'RESULTADO DEMONSTRATIVO — metodologia em validação';

const BAND_META: Record<string, { title: string; description: string }> = {
  critico: {
    title: 'Fragilidade de Ativos',
    description: 'Crescimento depende de variáveis externas ou esforço manual excessivo.',
  },
  alerta: {
    title: 'Maturidade em Progresso',
    description: 'Há tração, mas retenção e LTV ainda não estão maximizados por falta de dados.',
  },
  otimizado: {
    title: 'Maturidade de Crescimento',
    description: 'Processos sólidos e cultura de experimentação ativa.',
  },
};

const GrowthDiagnostic = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('questions');
  const [currentQ, setCurrentQ] = useState(0);
  const [normalizedAnswers, setNormalizedAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const currentQData = GROWTH_QUESTIONS[currentQ];
  const currentAxisLabel =
    GROWTH_AXES.find((axis) => axis.id === currentQData.axisId)?.label ?? currentQData.axisId;

  useEffect(() => {
    if (step !== 'questions' || selectedOption !== null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const optionMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
      if (key in optionMap) {
        const optIndex = optionMap[key];
        if (currentQData.options[optIndex]) {
          handleAnswer(optIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, currentQ, selectedOption, currentQData]);

  const handleAnswer = (optionIndex: number) => {
    if (selectedOption !== null) return;
    const opt = currentQData.options[optionIndex];
    const normalized = normalizeOptionScore(opt.score, opt.max);
    setSelectedOption(optionIndex);

    const updated = [...normalizedAnswers, normalized];
    setNormalizedAnswers(updated);

    setTimeout(() => {
      setSelectedOption(null);
      if (currentQ < GROWTH_QUESTIONS.length - 1) {
        setCurrentQ((prev) => prev + 1);
      } else {
        setStep('lead-capture');
      }
    }, 600);
  };

  const result = useMemo(() => {
    const answers = Object.fromEntries(
      GROWTH_QUESTIONS.map((question, index) => [question.axisId, normalizedAnswers[index] ?? 0]),
    ) as Record<GrowthAxisId, number>;
    return buildResult(answers);
  }, [normalizedAnswers]);

  const bandMeta = BAND_META[result.band];

  const handleFormSubmit = async (data: DiagnosticFormData) => {
    setIsSubmitting(true);
    try {
      await submitPublicDiagnostic(
        { ...data, phone: '' },
        { answers: normalizedAnswers, diagnostic_type: 'growth', source: 'growth-diagnostic' },
        result.overall,
        {
          level: bandMeta.title,
          description: bandMeta.description,
          action: 'Diagnóstico Growth',
          color: 'revgreen',
        },
        'score_captured',
      );
      // W6: validação do payload contra os contratos GHL em MODO MOCK (sem rede).
      // O envio real continua via submitPublicDiagnostic acima; isto nunca bloqueia o fluxo.
      const contractCheck = validateDiagnosticPayload(
        'resultado',
        buildGrowthLead(data, result.overall, bandMeta.title),
        'score_captured',
      );
      if (contractCheck.errors.length > 0) {
        console.warn('[growth] payload fora do contrato GHL (mock):', contractCheck.errors);
      }

      toast({
        className: 'bg-white border-zinc-200 text-zinc-900',
        title: 'DIAGNÓSTICO PROCESSADO',
        description: 'Seu relatório demonstrativo foi gerado com sucesso.',
      });
      setStep('results');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro de Processamento',
        description: 'Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Diagnóstico Growth — Avaliação Demonstrativa B2B"
        description="Diagnóstico growth avançado em 11 eixos: estratégia, aquisição, CRM, automação e maturidade de dados. Resultado demonstrativo, metodologia em validação."
        canonical="https://revhackers.com.br/diagnostico-growth"
        breadcrumbs={[
          { name: 'Home', url: 'https://revhackers.com.br/' },
          { name: 'Diagnósticos', url: 'https://revhackers.com.br/diagnostico' },
          { name: 'Diagnóstico Growth', url: 'https://revhackers.com.br/diagnostico-growth' },
        ]}
      />
      <DiagnosticLayout
        title={step === 'results' ? '' : 'Diagnóstico Growth Avançado'}
        subtitle={step === 'results' ? '' : 'Avalie 11 eixos da sua operação B2B em 2 minutos'}
        variant={step === 'results' ? 'dark' : 'light'}
        hideHeader={step === 'results'}
        centered={step === 'results'}
        headerVariant="default"
      >
        {step === 'results' && <div className="fixed inset-0 bg-white -z-50 pointer-events-none" />}

        {step === 'questions' && (
          <div className="w-full max-w-3xl mx-auto space-y-6">
            <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xl p-6 sm:p-10 space-y-8 relative overflow-hidden backdrop-blur-xl">
              <div className="space-y-4">
                <QuestionProgressBar current={currentQ} total={GROWTH_QUESTIONS.length} variant="light" />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <p className="text-[#00CC6A] text-xs font-semibold tracking-wider uppercase">
                      Eixo: {currentAxisLabel}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 leading-snug">
                      {currentQData.text}
                    </h2>
                    {import.meta.env.DEV && (<p className="text-[11px] text-zinc-400">Fonte da pergunta: {currentQData.source}</p>)}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {currentQData.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = selectedOption === idx;

                      return (
                        <button
                          key={idx}
                          disabled={selectedOption !== null}
                          onClick={() => handleAnswer(idx)}
                          className={`group relative flex items-center justify-between p-4 sm:p-5 text-left transition-all duration-200 border rounded-xl shadow-xs ${
                            isSelected
                              ? 'bg-white text-zinc-900 border-zinc-950 ring-2 ring-[#00CC6A] ring-offset-1'
                              : 'bg-white border-zinc-200/90 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50/80 hover:shadow-xs'
                          } ${selectedOption !== null && !isSelected ? 'opacity-40' : 'opacity-100'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-xs font-sans font-bold rounded-lg border transition-all duration-200 ${
                                isSelected
                                  ? 'bg-[#00CC6A] text-black border-[#00CC6A]'
                                  : 'bg-zinc-100 border-zinc-200 text-zinc-700 group-hover:bg-white group-hover:text-zinc-900 group-hover:border-zinc-950'
                              }`}
                            >
                              {letter}
                            </div>
                            <span className="text-xs sm:text-sm font-semibold leading-relaxed">{opt.label}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`hidden sm:inline-flex items-center justify-center font-sans text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                isSelected
                                  ? 'bg-zinc-50 text-zinc-600 border-zinc-200'
                                  : 'bg-zinc-100 text-zinc-500 border-zinc-200 group-hover:border-zinc-300 group-hover:text-zinc-700'
                              }`}
                            >
                              {letter}
                            </span>
                            <ArrowRight
                              size={15}
                              className={`transition-all ${isSelected ? 'text-[#00CC6A] translate-x-0.5' : 'text-zinc-600 group-hover:text-zinc-600 group-hover:translate-x-0.5'}`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] font-sans text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Command size={12} /> Pressione{' '}
                  <kbd className="bg-zinc-100 border border-zinc-200 px-1 rounded text-zinc-700 font-bold">A</kbd>{' '}
                  <kbd className="bg-zinc-100 border border-zinc-200 px-1 rounded text-zinc-700 font-bold">B</kbd>{' '}
                  <kbd className="bg-zinc-100 border border-zinc-200 px-1 rounded text-zinc-700 font-bold">C</kbd> ou{' '}
                  <kbd className="bg-zinc-100 border border-zinc-200 px-1 rounded text-zinc-700 font-bold">D</kbd> para
                  responder
                </span>
                <span className="hidden sm:inline-block">100% Privado</span>
              </div>
            </div>
          </div>
        )}

        {step === 'lead-capture' && (
          <div className="w-full max-w-6xl mx-auto my-8 sm:my-12 animate-fade-in px-4 sm:px-6">
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-10 lg:p-12 shadow-sm flex flex-col lg:flex-row items-stretch gap-8 lg:gap-12">
              <div className="flex-1 flex flex-col justify-between space-y-6 lg:border-r border-zinc-100 lg:pr-10">
                <div className="space-y-3">
                  <p className="text-[#00CC6A] text-xs font-semibold tracking-wider uppercase">
                    Diagnóstico Growth • 11 eixos respondidos
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 leading-snug">
                    Suas respostas foram registradas. Desbloqueie o resultado por eixo.
                  </h2>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    O relatório lista cada eixo com recomendação e fonte. Scoring em validação — nenhum rótulo tem
                    validade metodológica.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 font-semibold">
                  {DEMONSTRATIVO_SEAL}
                </div>

                <div className="pt-2 flex items-center gap-4 text-xs text-zinc-400 font-medium">
                  <span>✓ 11 Eixos Auditados</span>
                  <span>•</span>
                  <span>✓ Recomendações com Fonte</span>
                </div>
              </div>

              <div className="flex-1 w-full max-w-xl flex flex-col justify-start">
                <DiagnosticForm
                  onSubmit={handleFormSubmit}
                  isSubmitting={isSubmitting}
                  title="Desbloquear Relatório por Eixo"
                  subtitle="Preencha os dados corporativos abaixo para liberar o resultado demonstrativo."
                  variant="light"
                  diagnosticType="Growth"
                />
              </div>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-0">
            <div className="mb-12 text-center max-w-4xl mx-auto pt-8">
              <div className="inline-flex items-center gap-2 mb-4 bg-amber-50 border border-amber-200 px-3 py-1">
                <span className="w-1.5 h-1.5 bg-amber-500"></span>
                <span className="text-xs font-sans font-bold text-amber-900">{DEMONSTRATIVO_SEAL}</span>
              </div>
              <h1 className="text-3xl md:text-3xl font-bold text-zinc-900 mb-2">
                Diagnóstico <span className="text-zinc-600">Growth</span>
              </h1>
              <p className="text-zinc-500 font-medium max-w-xl mx-auto">
                {bandMeta.title}: {bandMeta.description}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-4">
                <ScoreGauge
                  score={result.overall}
                  label="Maturidade Growth (demonstrativo)"
                  description="Média aritmética dos 11 eixos, sem pesos validados."
                />
              </div>

              <div className="lg:col-span-8 flex flex-col">
                <div className="border border-zinc-200 p-8 bg-white h-full flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-zinc-900 bg-zinc-100 px-3 py-1.5 border border-zinc-200">
                      LEITURA POR EIXO — SCORING NÃO VALIDADO
                    </span>
                  </div>
                  <p className="text-zinc-900 text-lg font-medium leading-relaxed mb-0">
                    Resultado geral {result.overall}/100 ({bandMeta.title}). Abaixo, cada eixo com recomendação e
                    arquivo-fonte para auditoria da metodologia candidata.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
              {GROWTH_AXES.map((axis) => {
                const axisScore = result.axisScores[axis.id];
                const recommendation = result.recommendations[axis.id];
                return (
                  <div key={axis.id} className="border border-zinc-200 bg-white p-6 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-sm font-bold text-zinc-900">{axis.label}</h3>
                      <span className="text-xs font-bold text-zinc-500">{axisScore}/100</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[#00CC6A]" style={{ width: `${axisScore}%` }} />
                    </div>
                    <p className="text-sm font-semibold text-zinc-800">{recommendation.title}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{recommendation.text}</p>
                    {import.meta.env.DEV && (<p className="text-[11px] text-zinc-400">Fonte: {recommendation.source}</p>)}
                  </div>
                );
              })}
            </div>

            <div className="w-[100vw] relative left-[50%] right-[50%] -ml-[50vw] bg-white px-4 md:px-0 py-20 mt-16 border-t border-zinc-200">
              <div className="max-w-6xl mx-auto space-y-16">
                <DiagnosticActionSection
                  title="Valide este diagnóstico com um especialista."
                  subtitle="Sessão gratuita para revisar eixo a eixo o que é gargalo real e o que é ruído do scoring demonstrativo."
                  onCtaClick={() => setIsBookingModalOpen(true)}
                />

                <DiagnosticBookingModal
                  isOpen={isBookingModalOpen}
                  onClose={() => setIsBookingModalOpen(false)}
                  diagnosticType="growth"
                />
              </div>
            </div>
          </div>
        )}
      </DiagnosticLayout>
    </>
  );
};

export default GrowthDiagnostic;
