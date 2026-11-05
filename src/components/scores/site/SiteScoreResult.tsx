import { DiagnosticLayout } from '@/components/diagnostics/DiagnosticLayout';
import { SiteScoreResultGate } from './SiteScoreResultGate';
import { SiteScoreResultDashboard } from './SiteScoreResultDashboard';
import { SiteScoreResultBenchmark } from './SiteScoreResultBenchmark';
import { SiteScoreResultInsights } from './SiteScoreResultInsights';
import { BenchmarkResult } from '@/api/cruxApi';

interface SiteScoreResultProps {
  finalScore: number;
  psiResults: any;
  hasSubmittedLead: boolean;
  onSubmitted: () => void;
  viewMode: 'mobile' | 'desktop';
  setViewMode: (mode: 'mobile' | 'desktop') => void;
  currentScore: number;
  psiSeoScore: number | null;
  benchmarkResult: BenchmarkResult | null;
  isBenchmarking: boolean;
  score: number;
  insights: { action: string; description: string };
  isBookingModalOpen: boolean;
  setIsBookingModalOpen: (isOpen: boolean) => void;
}

export const SiteScoreResult = ({
  finalScore,
  psiResults,
  hasSubmittedLead,
  onSubmitted,
  viewMode,
  setViewMode,
  currentScore,
  psiSeoScore,
  benchmarkResult,
  isBenchmarking,
  score,
  insights,
  isBookingModalOpen,
  setIsBookingModalOpen
}: SiteScoreResultProps) => {
  return (
    <DiagnosticLayout
      title=""
      subtitle=""
      variant="dark"
      hideHeader={true}
      centered={true}
      headerVariant="default"
    >
      <div className="fixed inset-0 bg-white -z-50 pointer-events-none" />

      <SiteScoreResultGate
        finalScore={finalScore}
        psiResults={psiResults}
        hasSubmittedLead={hasSubmittedLead}
        onSubmitted={onSubmitted}
      />

      <div className={`space-y-8 transition-all duration-700 w-full ${!hasSubmittedLead ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>
        <SiteScoreResultDashboard
          viewMode={viewMode}
          setViewMode={setViewMode}
          currentScore={currentScore}
          psiResults={psiResults}
          psiSeoScore={psiSeoScore}
        />

        <SiteScoreResultBenchmark
          benchmarkResult={benchmarkResult}
          isBenchmarking={isBenchmarking}
        />

        <SiteScoreResultInsights
          score={score}
          currentScore={currentScore}
          psiResults={psiResults}
          insights={insights}
          isBookingModalOpen={isBookingModalOpen}
          setIsBookingModalOpen={setIsBookingModalOpen}
        />
      </div>
    </DiagnosticLayout>
  );
};
