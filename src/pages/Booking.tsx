
import { useEffect, useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { CheckCircle, Clock, FileText, Zap } from 'lucide-react';
import SEO from '@/components/shared/SEO';
import ModernTechnicalBackground from '@/components/shared/ModernTechnicalBackground';
import { GhlBookingEmbed } from '@/components/shared/GhlBookingEmbed';
import { GHL_CALENDARS } from '@/config/ghl';


const nextSteps = [
  {
    icon: Clock,
    title: 'Confirmação em < 2h',
    desc: 'Você recebe um email de confirmação com as instruções de preparação.',
  },
  {
    icon: FileText,
    title: 'Diagnóstico Prévio',
    desc: 'Nossa equipe analisa sua operação antes da reunião para chegar com perguntas cirúrgicas.',
  },
  {
    icon: Zap,
    title: 'Plano de Ação no mesmo dia',
    desc: 'Na reunião, você sai com o mapa dos principais vazamentos da sua operação e os próximos passos.',
  },
];

const BookingPage = () => {
  const [leadContext, setLeadContext] = useState<{ company?: string; name?: string; material?: string }>({});

  useEffect(() => {
    window.scrollTo(0, 0);

    // Read search parameters for personalization
    const params = new URLSearchParams(window.location.search);
    const companyParam = params.get('company');
    const nameParam = params.get('name');
    const materialParam = params.get('material');

    if (companyParam || nameParam) {
      setLeadContext({
        company: companyParam || undefined,
        name: nameParam || undefined,
        material: materialParam || undefined
      });
    }
  }, []);

  return (
    <PageLayout>
      <SEO
        title={leadContext.company ? `Auditoria de Receita para ${leadContext.company}` : "Agendar Auditoria de Receita"}
        description="Agende uma auditoria técnica com a RevHackers para mapear vazamentos na sua operação B2B."
        canonical="https://revhackers.com.br/booking"
      />
      {/* Hero Section (BLACK HERO STANDARD) */}
      <section className="relative overflow-hidden py-20 md:py-28 bg-black border-b border-zinc-900">
        <ModernTechnicalBackground />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-5">
          {leadContext.company ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00CC6A]/10 border border-[#00CC6A]/30 text-[#00CC6A] text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#00CC6A] animate-pulse" />
              Sessão VIP de Arquitetura de Receita
            </div>
          ) : null}
          <h1 className="font-sans text-[2rem] sm:text-[2.75rem] md:text-[3.25rem] font-extrabold text-white leading-[1.1] tracking-tight text-center max-w-3xl mx-auto">
            {leadContext.company ? (
              <>Sessão de Implementação para a <span className="text-[#00CC6A]">{leadContext.company}</span></>
            ) : (
              <>Auditoria de Vazamento de Receita <span className="text-[#00CC6A]">& GTM Engineering</span></>
            )}
          </h1>
          <p className="text-zinc-400 text-base md:text-lg font-normal leading-relaxed max-w-2xl mx-auto text-center">
            {leadContext.name ? (
              <>{leadContext.name}, agende 30 minutos com nossos arquitetos para mostrarmos como aplicar este framework de receita na <strong>{leadContext.company}</strong> nos próximos 90 dias.</>
            ) : (
              <>Sessão técnica de 30 minutos com nossos arquitetos para auditar gargalos ocultos da sua operação e estruturar o plano de escala com GTM Engineering e AI-Powered ABM.</>
            )}
          </p>
        </div>
      </section>

      {/* Main Section — Fundo 100% Branco Puro e Minimalista */}
      <section className="py-16 sm:py-20 bg-white text-zinc-900 border-b border-zinc-200/80">
        <div className="w-full max-w-5xl mx-auto px-6">

          {/* Layout 2 colunas: info ultra-clean + calendário */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">

            {/* Coluna esquerda: contexto minimalista sem poluição */}
            <div className="lg:col-span-2 flex flex-col justify-center space-y-8">

              {/* Pré-Requisitos em Lista Limpa */}
              <div className="space-y-3">
                <span className="text-sm font-extrabold uppercase tracking-wider text-zinc-950 block mb-2">
                  PRÉ-REQUISITOS:
                </span>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2.5 text-zinc-950 font-extrabold">
                    <span className="w-2 h-2 rounded-full bg-zinc-950 shrink-0" />
                    Operação B2B (High Ticket) tracionando
                  </li>
                  <li className="flex items-center gap-2.5 text-zinc-950 font-extrabold">
                    <span className="w-2 h-2 rounded-full bg-zinc-950 shrink-0" />
                    Presença do Fundador / C-Level na sessão
                  </li>
                </ul>
              </div>

              {/* Métrica Única de Impacto */}
              <div className="border-t border-zinc-200/80 pt-6 space-y-1">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Resultado Auditado Misto</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">+R$ 480.000</p>
                <p className="text-xs text-zinc-500">em receita recuperada nas últimas auditorias.</p>
              </div>

            </div>

            {/* Coluna direita: calendário */}
            <div className="lg:col-span-3 bg-white overflow-hidden min-h-[680px] border border-zinc-200/80 rounded-xl shadow-xs">
              <GhlBookingEmbed calendarId={GHL_CALENDARS.diagnostico} title="Auditoria de Receita" minHeight={680} />
            </div>
          </div>

        </div>
      </section>
    </PageLayout>
  );
};

export default BookingPage;
