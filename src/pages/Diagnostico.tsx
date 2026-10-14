import PageLayout from '@/components/layout/PageLayout';
import Section from '@/components/ui/Section';
import { ArrowUpRight, BarChart2, Globe, TrendingUp, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '@/components/shared/SEO';
import ModernTechnicalBackground from '@/components/shared/ModernTechnicalBackground';

const DiagnosticoGateway = () => {
  const diagnostics = [
    {
      id: 'growth',
      title: 'Diagnóstico 360º de Growth',
      description: 'Avaliação completa dos canais de aquisição, retenção, tração e métricas de receita.',
      badge: 'POPULAR',
      icon: TrendingUp,
      path: '/score',
    },
    {
      id: 'revenue',
      title: 'Diagnóstico CRM & Revenue Ops',
      description: 'Mapeamento de gargalos no pipeline comercial, SLA de vendas e automações com IA.',
      badge: 'REVOPS',
      icon: BarChart2,
      path: '/score-revenue',
    },
    {
      id: 'founder',
      title: 'Diagnóstico de Autoridade do Fundador',
      description: 'Análise preditiva de presença digital, Social Selling e autoridade no LinkedIn.',
      badge: 'FOUNDER',
      icon: User,
      path: '/score-founder',
    },
    {
      id: 'site',
      title: 'Diagnóstico de Site & Landing Page',
      description: 'Auditoria de taxa de conversão (CRO), velocidade, SEO e infraestrutura digital.',
      badge: 'CRO',
      icon: Globe,
      path: '/score-site',
    },
  ];

  return (
    <PageLayout>
      <SEO
        title="Central de Diagnósticos"
        description="Descubra onde estão os vazamentos na sua operação B2B com diagnósticos gratuitos de Growth, CRM, Founder e Site."
        canonical="https://revhackers.com.br/diagnostico"
        breadcrumbs={[
          { name: "Home", url: "https://revhackers.com.br/" },
          { name: "Diagnósticos", url: "https://revhackers.com.br/diagnostico" }
        ]}
      />
      
      <section className="bg-black pt-28 pb-12 relative overflow-hidden">
        <ModernTechnicalBackground />
        <div className="max-w-5xl mx-auto px-6 relative z-10 space-y-4 text-center">
          <p className="text-[#00CC6A] text-xs font-mono font-bold tracking-widest uppercase">
            CENTRAL DE DIAGNÓSTICOS
          </p>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto">
            Diagnósticos Preditivos de <span className="text-[#00CC6A]">Maturidade Comercial.</span>
          </h1>

          <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Avalie a maturidade da sua operação B2B em 1 minuto. Nossa IA calcula os vazamentos e entrega seu plano de ação.
          </p>
        </div>
      </section>

      <section className="py-10 bg-zinc-50/50 min-h-[50vh]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {diagnostics.map((diag) => {
              const Icon = diag.icon;
              return (
                <Link
                  key={diag.id}
                  to={diag.path}
                  className="group bg-white border border-zinc-200/80 rounded-2xl p-6 hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00CC6A] transition-all duration-300 shadow-xs hover:shadow-md flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center border border-zinc-800">
                        <Icon size={20} className="text-[#00CC6A]" />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {diag.badge}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-zinc-900 group-hover:text-black tracking-tight leading-snug">
                      {diag.title}
                    </h2>

                    <p className="text-xs text-zinc-500 font-normal leading-relaxed">
                      {diag.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-zinc-900 group-hover:text-black">
                    <span>Iniciar Diagnóstico Gratuito</span>
                    <div className="w-6 h-6 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center group-hover:bg-zinc-950 group-hover:text-white transition-all">
                      <ArrowUpRight size={13} className="text-zinc-500 group-hover:text-[#00CC6A]" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <p className="mt-8 text-center text-sm text-zinc-600">
            Prefere falar direto com um especialista?{' '}
            <Link to="/booking" className="font-semibold text-zinc-900 underline underline-offset-4 hover:text-black">
              Agendar auditoria de receita
            </Link>
          </p>
        </div>
      </section>
    </PageLayout>
  );
};

export default DiagnosticoGateway;
