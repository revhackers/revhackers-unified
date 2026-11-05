import { useState, useEffect, useCallback } from 'react';

import { runCompetitiveBenchmark, BenchmarkResult } from "@/api/cruxApi";
import { getDiagnosticInsights } from '@/utils/diagnosticMapping';
import SEO from '@/components/shared/SEO';

import { SiteScoreQuiz, QUESTIONS } from '@/components/scores/site/SiteScoreQuiz';
import { SiteScoreResult } from '@/components/scores/site/SiteScoreResult';

type Step = 'questions' | 'lead-capture' | 'results';

const SiteScore = () => {
  const [step, setStep] = useState<Step>('questions');
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [hasSubmittedLead, setHasSubmittedLead] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const insights = getDiagnosticInsights('site', score);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);

  const [targetUrl, setTargetUrl] = useState('');
  const [psiResults, setPsiResults] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');

  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['', '']);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const handleAnswer = (optionScore: number, optionIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIdx);
    setShowLog(true);

    const newScore = score + optionScore;
    setScore(newScore);
    setAnswers([...answers, optionScore]);

    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setShowLog(false);
        setSelectedOption(null);
        setCurrentQ(prev => prev + 1);
      } else {
        setStep('results');
      }
    }, 1500);
  };

  const handleSubmitted = useCallback(() => {
    setHasSubmittedLead(true);
  }, []);

  const finalScore = score;

  const seoComponent = (
    <SEO
      title="Auditoria de Site B2B - Diagnóstico de Performance Gratuito"
      description="Analise gratuitamente a performance, SEO e conformidade do seu site B2B com nossa auditoria técnica."
      canonical="https://revhackers.com.br/score-site"
      breadcrumbs={[
        { name: "Home", url: "https://revhackers.com.br/" },
        { name: "Diagnósticos", url: "https://revhackers.com.br/diagnostico" },
        { name: "Score Site", url: "https://revhackers.com.br/score-site" }
      ]}
    />
  );

  return (
    <>
      {seoComponent}
      {step === 'questions' ? (
        <SiteScoreQuiz
          currentQ={currentQ}
          selectedOption={selectedOption}
          showLog={showLog}
          onAnswer={handleAnswer}
        />
      ) : step === 'results' ? (
        <SiteScoreResult
          finalScore={finalScore}
          psiResults={psiResults}
          hasSubmittedLead={hasSubmittedLead}
          onSubmitted={handleSubmitted}
          viewMode={viewMode}
          setViewMode={setViewMode}
          currentScore={finalScore}
          psiSeoScore={finalScore}
          benchmarkResult={benchmarkResult}
          isBenchmarking={isBenchmarking}
          score={score}
          insights={insights}
          isBookingModalOpen={isBookingModalOpen}
          setIsBookingModalOpen={setIsBookingModalOpen}
        />
      ) : null}
    </>
  );
};

export default SiteScore;
