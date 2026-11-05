import { GhlFormEmbed } from '@/components/shared/GhlFormEmbed';
import { GHL_FORMS } from '@/config/ghl';

interface SiteScoreResultGateProps {
  finalScore: number;
  psiResults: any;
  hasSubmittedLead: boolean;
  onSubmitted: () => void;
}

export const SiteScoreResultGate = ({
  finalScore,
  psiResults,
  hasSubmittedLead,
  onSubmitted
}: SiteScoreResultGateProps) => {
  if (hasSubmittedLead) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-md p-4 animate-in fade-in duration-300 overflow-y-auto">
      <div className="bg-white border border-zinc-200 p-8 w-full max-w-4xl flex flex-col md:flex-row items-center md:items-stretch gap-8 md:gap-12 shadow-sm relative my-auto max-h-[90vh]">
        <div className="flex-1 flex flex-col justify-center text-center md:text-left space-y-5 md:border-r border-zinc-200 md:pr-10">
          <div className="inline-flex items-center gap-2 bg-zinc-50 px-3 py-1 border border-zinc-200 rounded-full w-fit mx-auto md:mx-0">
            <div className="w-2 h-2 rounded-full bg-[#00CC6A] animate-pulse"></div>
            <span className="text-xs font-bold text-zinc-800">Análise Prévia • Score {finalScore}/100</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight leading-snug">
            Quer um Raio-X completo da sua empresa e concorrentes?
          </h3>

          <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed font-normal">
            Preencha o formulário ao lado com o CNPJ da sua empresa para liberar o diagnóstico completo. Nosso sistema vai mapear o seu mercado, analisar seus concorrentes e trazer tudo o que eles estão fazendo em um diagnóstico completo para você seguir e implementar.
          </p>

          <div className="pt-1 flex flex-col gap-2 text-xs font-semibold text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00CC6A] shrink-0" />
              <span>Mapeamento de mercado & inteligência competitiva</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00CC6A] shrink-0" />
              <span>Preenchimento rápido via CNPJ</span>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full max-w-md flex flex-col justify-center">
          <GhlFormEmbed
            formId={GHL_FORMS.score}
            title="Receber Relatório"
            params={{ diagnostic_type: 'site', diagnostic_score: String(finalScore), diagnostic_category: 'Auditoria Técnica' }}
            minHeight={620}
            onSubmitted={onSubmitted}
          />
        </div>
      </div>
    </div>
  );
};
