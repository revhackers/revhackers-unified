import { Progress } from '@/components/ui/progress';
import type { LeadReport } from '../../../gtm-blueprint/src/report/types';

interface ReportProgressProps {
  progresso: LeadReport['progresso'];
}

export function ReportProgress({ progresso }: ReportProgressProps) {
  const percent = Math.round((progresso.concluidas / progresso.total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-zinc-600">
        <span className="font-semibold text-zinc-900">
          {progresso.concluidas} de {progresso.total} concluídas
        </span>
        {progresso.etapaAtual && <span>{progresso.etapaAtual}</span>}
      </div>
      <Progress value={percent} aria-label="Progresso da análise" className="h-2 bg-zinc-200 [&>div]:bg-[#00CC6A]" />
    </div>
  );
}
