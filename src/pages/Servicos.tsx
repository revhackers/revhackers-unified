import React from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowUpRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import SEO from '@/components/shared/SEO';
import { RevCardIcon, RevIcon } from '@/components/shared/RevIconLibrary';
import ModernTechnicalBackground from '@/components/shared/ModernTechnicalBackground';

const engines = [
  {
    id: "MOTOR 01",
    title: "IA Operations & SDR Digital",
    subtitle: "Qualificação Autônoma & Agentes de IA",
    description: "Agentes autônomos baseados em LLMs avançados treinados no seu playbook para qualificar leads 24/7, responder dúvidas técnicas e agendar diretamente na agenda dos seus Closers.",
    tech: ["OpenAI API", "Agentic Workflows", "Vector DBs", "WhatsApp API"],
    icon: RevIcon.Cpu,
    slug: "ai-operations",
    badge: "IA & AUTOMAÇÃO"
  },
  {
    id: "MOTOR 02",
    title: "Engenharia de CRM & Revenue Operations",
    subtitle: "Arquitetura Comercial Blindada",
    description: "Reestruturação profunda da sua plataforma comercial (HubSpot, Salesforce, Pipedrive). Estágios de pipeline padronizados, automações de follow-up, SLA de passagem e dashboards nativos de velocidade.",
    tech: ["CRM Architecture", "Pipeline Logic", "Data Sync", "n8n / Make"],
    icon: RevIcon.Database,
    slug: "ecossistema-crm",
    badge: "REVOPS & DADOS"
  },
  {
    id: "MOTOR 03",
    title: "Tração & Mídia Paga B2B",
    subtitle: "Aquisição Preditiva de ICP",
    description: "Gestão técnica de tráfego injetando MQLs (Marketing Qualified Leads) hiper-qualificados direto no topo do funil. Estratégias de LinkedIn B2B, Google Search e ABM preditivo.",
    tech: ["LinkedIn B2B", "Google Search", "Meta Ads", "ABM Targeting"],
    icon: RevIcon.Trending,
    slug: "tracao-midia-paga",
    badge: "AQUISIÇÃO & TRÁFEGO"
  },
  {
    id: "MOTOR 04",
    title: "Founder-Led Growth & Web Conversion",
    subtitle: "Autoridade C-Level & Páginas de Alta Conversão",
    description: "Transformação da autoridade do fundador e do site da empresa em ímãs de conversão B2B. Posicionamento no LinkedIn, Social Selling e Landing Pages desenvolvidas para máxima taxa de agendamento.",
    tech: ["LinkedIn Authority", "Social Selling", "Next.js", "CRO Testing"],
    icon: RevIcon.Target,
    slug: "founder-led-growth",
    badge: "AUTORIDADE & CRO"
  }
];

const ecosystemSteps = [
  {
    step: "01",
    title: "Aquisição & Atração",
    desc: "Mídia Paga B2B e Founder-Led Growth capturam o ICP ideal.",
    icon: RevIcon.Trending
  },
  {
    step: "02",
    title: "Qualificação por IA",
    desc: "SDR Digital atende em segundos, enriquece dados e filtra curiosos.",
    icon: RevIcon.Cpu
  },
  {
    step: "03",
    title: "Operação no CRM",
    desc: "Pipeline blindado com automação de follow-up e SLA comercial.",
    icon: RevIcon.Database
  },
  {
    step: "04",
    title: "Fechamento & Escala",
    desc: "Dashboards de velocidade de receita indicam gargalos e expansão.",
    icon: RevIcon.Activity
  }
];

const Servicos = () => {
  return (
    <PageLayout>
      <SEO
        title="Ecossistema de Soluções GTM & RevOps B2B"
        description="Conheça os 4 Motores do Ecossistema RevHackers: IA Operations, Engenharia de CRM, Tração B2B e Founder-Led Growth. Infraestrutura de receita integrada."
        canonical="https://revhackers.com.br/servicos"
        breadcrumbs={[
          { name: "Home", url: "https://revhackers.com.br/" },
          { name: "Ecossistema", url: "https://revhackers.com.br/servicos" }
        ]}
        faq={[
          { question: "Como os 4 Motores do Ecossistema funcionam juntos?", answer: "Os 4 Motores operam de forma integrada sob a Metodologia REI: a mídia paga e autoridade atraem o lead, a IA qualifica e enriquece os dados, o CRM operacionaliza a venda e os dashboards medem a velocidade de receita." },
          { question: "Preciso contratar os 4 Motores simultaneamente?", answer: "Não. Realizamos um diagnóstico preditivo inicial (Metodologia REI) para identificar qual motor está causando gargalo e priorizamos a implementação por ondas de impacto." },
          { question: "Quanto tempo leva para implementar o Ecossistema?", answer: "As primeiras ondas de automação e CRM entram no ar entre 14 e 30 dias, gerando clareza e previsibilidade imediata no pipeline." }
        ]}
      />

      {/* Hero Section, Alinhamento Total com o Título 'Ecossistema' */}
      <section className="relative flex flex-col justify-center items-center overflow-hidden pt-28 pb-12 bg-black border-b border-zinc-900 text-center">
        <ModernTechnicalBackground />
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col items-center text-center space-y-6">
          <div className="inline-flex items-center gap-2 border-l-2 border-[#00CC6A] pl-3">
            <span className="text-[#00CC6A] text-xs font-mono font-bold uppercase tracking-[0.2em]">Ecossistema de Engenharia de GTM</span>
          </div>

          <h1 className="font-sans text-[2.25rem] sm:text-[3rem] md:text-[3.5rem] font-extrabold text-white leading-[1.1] tracking-tight max-w-4xl mx-auto">
            O Ecossistema de Soluções para Escalar <span className="text-[#00CC6A]">Operações B2B de Alto Ticket.</span>
          </h1>

          <p className="text-zinc-400 text-base md:text-lg font-normal leading-relaxed max-w-2xl mx-auto">
            4 Motores Integrados de IA, CRM, Mídia e Autoridade operando sob a Metodologia REI para transformar dados dispersos em uma máquina de receita previsível.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center w-full">
            <Button asChild size="lg" className="bg-[#00CC6A] text-black hover:bg-[#00b35e] font-bold text-sm h-12 px-8 rounded-xl transition-all">
              <Link to="/booking">
                Auditar Meu Ecossistema
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 font-bold text-sm h-12 px-6 rounded-xl">
              <Link to="/metodologia">
                Ver Metodologia REI 40Q
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Fluxo do Ecossistema (Como os 4 Motores Se Conectam) */}
      <section className="py-20 bg-zinc-50 text-zinc-900 border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[#00CC6A] text-xs font-mono font-bold tracking-widest uppercase">
              ARQUITETURA DE INTEGRAÇÃO
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
              Como os 4 Motores Conectam Sua Operação
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm">
              Sem dados duplicados, sem perdas no handoff e com 100% de visibilidade de ponta a ponta.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ecosystemSteps.map((s) => (
              <div key={s.step} className="p-6 pt-8 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 relative overflow-hidden group hover:border-zinc-700 transition-all">
                {/* Numeral fantasma - assinatura tecnica, substitui o badge "ETAPA N" */}
                <span className="absolute top-1 right-3 text-6xl font-black text-white/[0.04] leading-none select-none">
                  {s.step}
                </span>
                {/* Marcadores de canto - prancheta tecnica */}
                <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-zinc-700" />
                <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-zinc-700" />

                <div className="relative flex items-center justify-between">
                  <RevCardIcon icon={s.icon} size={20} />
                  <span className="text-[10px] font-mono font-bold text-zinc-500 tracking-widest">
                    {s.step}
                  </span>
                </div>
                <h3 className="relative text-lg font-bold text-white tracking-tight">{s.title}</h3>
                <p className="relative text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Os 4 Motores do Ecossistema, Design System Preto & Verde */}
      <section className="py-24 bg-white text-zinc-900 border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-6 space-y-16">
          
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <span className="text-[#00CC6A] text-xs font-mono font-bold tracking-[0.2em] uppercase">
              Motores de GTM Engineering
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">
              Os 4 Pilares do Ecossistema RevHackers
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xl mx-auto">
              Cada motor resolve um gargalo específico na jornada de aquisição, qualificação, operação e retenção.
            </p>
          </div>

          {/* Grid de 2x2 Colunas Grandes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {engines.map((item) => (
              <div
                key={item.id}
                className="p-8 rounded-2xl bg-white border border-zinc-200/90 hover:border-zinc-300 hover:shadow-lg transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <RevCardIcon icon={item.icon} size={22} />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-md bg-zinc-950 text-[#00CC6A] border border-zinc-800">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-mono font-bold text-zinc-400 tracking-wider block mb-1">
                      {item.id}
                    </span>
                    <h3 className="text-xl font-bold text-zinc-900 tracking-tight leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs font-semibold text-zinc-600 mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>

                  <p className="text-xs md:text-sm text-zinc-500 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-100">
                  <div className="flex flex-wrap gap-1.5">
                    {item.tech.map((tech) => (
                      <span key={tech} className="text-[10px] font-semibold text-zinc-700 uppercase bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded-md">
                        {tech}
                      </span>
                    ))}
                  </div>

                  <Link
                    to={`/servicos/${item.slug}`}
                    className="inline-flex items-center text-xs font-bold text-zinc-900 uppercase tracking-wider hover:text-[#00CC6A] transition-colors gap-2 pt-2"
                  >
                    <span>Explorar Arquitetura do Motor</span>
                    <ArrowUpRight className="w-4 h-4 text-zinc-500" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-zinc-950 text-white border-t border-zinc-900">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-[#00CC6A]">
            <ShieldCheck size={24} />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Pronto para Instalar o Ecossistema na Sua Empresa?
          </h2>

          <p className="text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
            Realizamos uma auditoria preditiva dos seus gargalos atuais para desenhar o plano de implementação sob medida em 30 dias.
          </p>

          <div className="pt-2">
            <Button asChild size="lg" className="bg-[#00CC6A] text-black hover:bg-[#00b35e] font-bold text-xs uppercase tracking-wider h-12 px-8 rounded-xl transition-all">
              <Link to="/booking">
                Agendar Diagnóstico do Ecossistema
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Servicos;
