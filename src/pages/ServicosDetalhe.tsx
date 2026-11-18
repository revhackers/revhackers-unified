
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, BarChart3, Settings, Users, Zap, TrendingUp, Target, Database, MessageSquare, LayoutTemplate, Cpu, X, Calendar } from 'lucide-react';
import Section from '@/components/ui/Section';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import BookingModal from '@/components/shared/BookingModal';
import SEO from '@/components/shared/SEO';

// --- DATA SOURCE ---
const servicosData = {
  // === NEW SERVICES (High-Level Copywriting) ===
  "tracao-midia-paga": {
    number: "01",
    title: "Tração & Mídia Paga",
    subtitle: "Chega de métricas de vaidade. Transformamos budget de mídia em pipeline de vendas previsível e qualificado.",
    icon: TrendingUp,
    heroCta: "/diagnostico",
    color: "from-white/5 to-white/10", // Neutral but premium
    accent: "text-revgreen",
    whatWeDo: [
      { title: "Arquitetura de Tráfego B2B", description: "Não compramos cliques, compramos intenção. Campanhas desenhadas para atingir decisores no momento de compra." },
      { title: "Account-Based Ads", description: "Mire nos logotipos que você quer fechar. Campanhas hiper-segmentadas para listas de contas alvo." },
      { title: "Criativos de Alta Conversão", description: "Ads que não parecem ads. Formatos nativos e copywriting direto que geram curiosidade e clique." },
      { title: "Tracking & Atribuição", description: "Saiba exatamente qual campanha, anúncio e palavra-chave gerou o contrato fechado." }
    ],
    howItWorks: [
      { step: "01", title: "Auditoria de Contas", description: "Identificamos onde você está queimando dinheiro hoje." },
      { step: "02", title: "Setup de Rastreamento", description: "Configuramos o tracking server-side para dados 100% confiáveis." },
      { step: "03", title: "Lançamento de Campanhas", description: "Estruturamos campanhas segregadas por nível de consciência do lead." },
      { step: "04", title: "Otimização Diária", description: "Ajustes de lances, negativação e testes A/B constantes." }
    ],
    results: [
      { value: "-60%", label: "Custo por Lead Qualificado" },
      { value: "4x", label: "ROI em 90 dias" },
      { value: "100%", label: "Rastreabilidade de Dados" }
    ]
  },
  "ecossistema-crm": {
    number: "02",
    title: "Ecossistema & CRM",
    subtitle: "A verdade sobre sua receita está nos dados. Centralize sua operação e elimine os 'pontos cegos' do funil.",
    icon: Database,
    heroCta: "/diagnostico",
    color: "from-white/5 to-white/10",
    accent: "text-revgreen",
    whatWeDo: [
      { title: "Implementação de CRM", description: "Configuração profissional (HubSpot, Salesforce, Pipedrive) alinhada ao seu processo de vendas real." },
      { title: "Integração Total", description: "Conectamos Marketing, Vendas e CS. Chega de planilhas soltas e dados desencontrados." },
      { title: "Dashboards de Revenue", description: "Tenha visão em tempo real de CAC, LTV, Churn e Pipeline Velocity." },
      { title: "Gestão de Pipeline", description: "Processos claros de passagem de bastão (Handoff) para garantir que nenhum lead se perca." }
    ],
    howItWorks: [
      { step: "01", title: "Mapeamento de Processos", description: "Desenhamos o fluxo ideal da sua operação comercial." },
      { step: "02", title: "Limpeza de Dados", description: "Higienização da base e padronização de campos." },
      { step: "03", title: "Implementação Técnica", description: "Setup de ferramentas e integrações via API/Webhook." },
      { step: "04", title: "Playbook de Vendas", description: "Treinamento do time para garantir a adoção do CRM." }
    ],
    results: [
      { value: "360°", label: "Visão do Cliente" },
      { value: "+40%", label: "Produtividade do Time" },
      { value: "Zero", label: "Perda de Dados" }
    ]
  },
  "automacao-inteligente": {
    number: "03",
    title: "Automação Inteligente + IA",
    subtitle: "Implementamos Agentes de IA treinados como SDRs de elite. Eles qualificam e conduzem o lead por todo o funil até o momento de compra, eliminando curiosos e permitindo que seu time foque apenas em quem quer comprar.",
    icon: Zap,
    heroCta: "/diagnostico",
    color: "from-white/5 to-white/10",
    accent: "text-revgreen",
    whatWeDo: [
      { title: "Agentes SDR via IA", description: "Desenvolvemos 'funcionários digitais' treinados com metodologias de vendas (Spin Selling, BANT) para atender e qualificar 24/7." },
      { title: "Filtro de Curiosos", description: "O agente identifica quem é apenas 'curioso' e quem é comprador. Seu time humano só fala com quem tem real intenção de compra." },
      { title: "Jornada Automatizada", description: "Conduzimos o lead do primeiro clique até o agendamento da reunião ou checkout, resolvendo dúvidas e quebrando objeções no caminho." },
      { title: "Eficiência Energética", description: "Pare de gastar energia com leads frios. Automatize o topo de funil e foque seus closers no fechamento." }
    ],
    howItWorks: [
      { step: "01", title: "Treinamento do Agente", description: "Alimentamos a IA com seus melhores scripts, objeções e dados do produto." },
      { step: "02", title: "Setup de Fluxos", description: "Desenhamos o caminho que o lead vai percorrer (WhatsApp/Email)." },
      { step: "03", title: "Ativação", description: "O agente assume o atendimento inicial instantaneamente." },
      { step: "04", title: "Handoff ou Venda", description: "Leads quentes são agendados; curiosos são nutridos automaticamente." }
    ],
    results: [
      { value: "Zero", label: "Tempo com Curiosos" },
      { value: "24/7", label: "SDR Ativo e Treinado" },
      { value: "+40%", label: "Taxa de Conversão" }
    ]
  },
  "founder-led-growth": {
    number: "04",
    title: "Founder-Led Growth",
    subtitle: "CPF compra de CPF. Transforme a marca pessoal do Fundador no maior canal de aquisição da empresa.",
    icon: Users,
    heroCta: "/diagnostico",
    color: "from-white/5 to-white/10",
    accent: "text-revgreen",
    whatWeDo: [
      { title: "Posicionamento de Autoridade", description: "Definimos sua narrativa única para se destacar no ruído do LinkedIn." },
      { title: "Content Engine", description: "Produção de conteúdo estratégico que gera demanda, não apenas likes." },
      { title: "Social Selling", description: "Estratégias para transformar conexões e engajamento em reuniões de vendas." },
      { title: "Escala de Rede", description: "Crescimento acelerado de conexões com o ICP (Perfil de Cliente Ideal) exato." }
    ],
    howItWorks: [
      { step: "01", title: "Diagnóstico de Perfil", description: "Análise da sua presença digital atual e benchmarks." },
      { step: "02", title: "Linha Editorial", description: "Definição de temas proprietários e tom de voz." },
      { step: "03", title: "Produção e Distribuição", description: "Rotina de publicação consistente e otimizada." },
      { step: "04", title: "Conversão", description: "Scripts e abordagens para levar o engajamento para o CRM." }
    ],
    results: [
      { value: "Top 1%", label: "Autoridade no Nicho" },
      { value: "+5k", label: "Novos Decisores Conectados" },
      { value: "High", label: "Ticket de Contratos" }
    ]
  },
  "web-conversion": {
    number: "05",
    title: "Web & Conversion",
    subtitle: "Transforme seu site em uma máquina de vendas. Design premium, velocidade extrema e arquitetura focada em conversão B2B.",
    icon: LayoutTemplate,
    heroCta: "/diagnostico",
    color: "from-white/5 to-white/10",
    accent: "text-revgreen",
    whatWeDo: [
      { title: "High-Performance Dev", description: "Sites ultra-rápidos (Score 90+) que ranqueiam melhor no Google." },
      { title: "Conversion Design", description: "Layouts que guiam o olhar do decisor para o botão de 'Agendar Demo'." },
      { title: "SEO Técnico", description: "Estrutura semântica perfeita para dominar as keywords do seu nicho." },
      { title: "CMS Headless", description: "Gestão de conteúdo flexível para seu time de marketing voar sem depender de TI." }
    ],
    howItWorks: [
      { step: "01", title: "UX/UI Audit", description: "Análise de fricção e oportunidades de melhoria no fluxo atual." },
      { step: "02", title: "Wireframe & Copy", description: "Estrutura de persuasão antes de qualquer linha de código." },
      { step: "03", title: "Desenvolvimento", description: "Stack moderna (Next.js/React) para performance de elite." },
      { step: "04", title: "Analytics Setup", description: "Tagueamento avançado para medir cada clique e scroll." }
    ],
    results: [
      { value: "+3x", label: "Conversão (Lead)" },
      { value: "<1s", label: "Carregamento" },
      { value: "100%", label: "Mobile Optimized" }
    ]
  },
  "ai-operations": {
    number: "06",
    title: "AI Operations",
    subtitle: "Escale sua operação sem escalar o headcount. Agentes de IA que assumem tarefas cognitivas complexas.",
    icon: Cpu,
    heroCta: "/diagnostico",
    color: "from-white/5 to-white/10",
    accent: "text-revgreen",
    whatWeDo: [
      { title: "Support Agents", description: "Atendimento N1 que resolve 80% dos chamados sem humano." },
      { title: "Pre-Sales AI", description: "Qualificação de leads inbound e agendamento automático de reuniões." },
      { title: "Content AI", description: "Geração de briefings, posts e artigos baseados na voz da sua marca." },
      { title: "Internal Ops", description: "Automação de onboarding, contratos e relatórios financeiros." }
    ],
    howItWorks: [
      { step: "01", title: "Mapeamento", description: "Onde seu time gasta mais tempo com tarefas repetitivas?" },
      { step: "02", title: "Custom Training", description: "Treinamos o modelo com seus dados proprietários (RAG)." },
      { step: "03", title: "Integração", description: "Conectamos o agente ao seu Slack, CRM e Email." },
      { step: "04", title: "Supervisão", description: "Human-in-the-loop para garantir qualidade e evolução contínua." }
    ],
    results: [
      { value: "-70%", label: "CAC Operacional" },
      { value: "24/7", label: "Disponibilidade" },
      { value: "Zero", label: "Erro Humano" }
    ]
  },

  // === LEGACY SERVICES (Mapped to keep compatibility if accessed) ===
  "automacao": {
    number: "03",
    title: "Automação de Revenue",
    subtitle: "Automatizamos processos comerciais para gerar mais resultados com menos esforço.",
    icon: Zap,
    color: "from-gray-500/20 to-gray-900/40",
    accent: "text-white",
    heroCta: "/diagnostico",
    whatWeDo: [
      { title: "Automação de Processos", description: "Eliminar tarefas manuais e repetitivas." }
    ],
    howItWorks: [
      { step: "01", title: "Diagnóstico", description: "Entendemos o cenário atual." }
    ],
    results: [
      { value: "+173%", label: "Leads Qualificados" }
    ]
  },
};

const ServicosDetalhe = () => {
  const { slug } = useParams<{ slug: string }>();
  const service = slug ? servicosData[slug as keyof typeof servicosData] : null;
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{ title: string; description: string } | null>(null);

  if (!service) {
    return (
      <PageLayout>
        <Section variant="dark" className="py-32 min-h-screen flex flex-col justify-center items-center">
          <h1 className="text-2xl md:text-3xl text-white font-bold mb-4">Serviço não encontrado</h1>
          <Button asChild className="btn-green-flat">
            <Link to="/servicos">Voltar para Serviços</Link>
          </Button>
        </Section>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SEO
        title={`${service.title} - Consultoria RevHackers`}
        description={service.subtitle}
        canonical={`https://revhackers.com.br/servicos/${slug}`}
        breadcrumbs={[
          { name: "Home", url: "https://revhackers.com.br/" },
          { name: "Ecossistema", url: "https://revhackers.com.br/servicos" },
          { name: service.title, url: `https://revhackers.com.br/servicos/${slug}` }
        ]}
      />
      {/* 1. HERO SECTION - Black Standard Hero */}
      <section className="relative py-20 md:py-28 bg-black border-b border-zinc-900">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-[1.2] tracking-tight text-center max-w-3xl mx-auto">
            {service.title}
          </h1>
          <p className="text-zinc-300 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-2xl mx-auto text-center">
            {service.subtitle}
          </p>
          <div className="pt-2 flex justify-center">
            <Button
              onClick={() => setIsBookingOpen(true)}
              className="bg-[#00CC6A] text-zinc-950 hover:bg-[#00b35e] font-extrabold text-sm sm:text-base h-12 px-8 rounded-xl shadow-lg transition-all"
            >
              <span>Auditar Minha Operação →</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. O QUE FAZEMOS (What We Do), Fundo 100% Branco Puro */}
      <section className="py-20 bg-white text-zinc-900 border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <h2 className="text-zinc-900 text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              A Engenharia de Execução
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
              Conheça as entregas técnicas e os módulos que compõem este sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {service.whatWeDo.map((item, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-zinc-50/70 border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 transition-all flex flex-col justify-between space-y-4 cursor-pointer group"
                onClick={() => setSelectedService(item)}
              >
                <div className="space-y-2">
                  <h3 className="text-zinc-900 font-bold text-base tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-zinc-500 text-xs leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-zinc-200/60 flex items-center justify-between text-xs font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors">
                  <span>Saiba Mais</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. COMO FUNCIONA (How It Works), Timeline Horizontal 1px no Fundo Branco */}
      <section className="py-20 bg-white text-zinc-900 border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <h2 className="text-zinc-900 text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Teardown Logístico (Passo a Passo)
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
              Como implementamos e ativamos este módulo na sua operação B2B.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {service.howItWorks.map((step, i) => (
              <div key={i} className="border-t border-zinc-200 pt-5 space-y-2">
                <span className="text-zinc-400 font-sans font-semibold text-xs tracking-wider block">
                  {step.step} / Passo
                </span>
                <h3 className="text-zinc-900 font-bold text-base tracking-tight">
                  {step.title}
                </h3>
                <p className="text-zinc-500 text-xs leading-relaxed font-normal">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. RESULTADOS (Results), Fundo 100% Branco Puro com Números Pretos */}
      <section className="py-20 bg-white text-zinc-900 border-b border-zinc-200/80">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <h2 className="text-zinc-900 text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Eficiência Pós-Implementação
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
              Resultados médios auditados conquistados por operações parceiras.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {service.results.map((result, i) => (
              <div key={i} className="p-6 rounded-xl bg-zinc-50/70 border border-zinc-200/80 text-center space-y-2">
                <div className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
                  {result.value}
                </div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                  {result.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CTA FINAL, Fundo Branco Puro */}
      <section className="py-20 bg-white text-zinc-900">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-4">
          <h2 className="text-zinc-900 text-2xl sm:text-3xl font-extrabold tracking-tight">
            Está com o caixa sangrando?
          </h2>
          <p className="text-zinc-500 text-sm max-w-xl mx-auto leading-relaxed">
            Avaliaremos sua operação tecnicamente e te diremos exatamente porque seu marketing não fecha a conta. Call bruta e pontual.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => setIsBookingOpen(true)}
              className="bg-zinc-950 text-white hover:bg-zinc-800 font-bold text-sm h-12 px-8 rounded-xl shadow-xs transition-all"
            >
              Auditar Minha Operação →
            </Button>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
      />

      {/* Service Detail Popup - Design System Match */}
      {selectedService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Dark Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedService(null)}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-lg shadow-sm overflow-hidden border border-zinc-200"
          >
            {/* Header - Same as CallDiagnosticModal */}
            <div className="p-8 md:p-12 border-b border-zinc-100 flex justify-between items-start">
              <div className="space-y-2">
                <span className="text-xs font-sans font-bold text-revgreen uppercase tracking-wider">{service?.number}. {service?.title}</span>
                <h2 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">
                  {selectedService.title}
                </h2>
              </div>
              <button onClick={() => setSelectedService(null)} className="p-2 hover:bg-zinc-100 transition-colors">
                <X className="w-6 h-6 text-black" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 md:p-12 space-y-8">
              {/* Description */}
              <p className="text-lg text-zinc-500 font-light leading-relaxed">
                {selectedService.description}
              </p>

              {/* Context Badge */}
              <div className="border-l-2 border-revgreen pl-6 py-2">
                <span className="text-xxs font-bold uppercase tracking-wider text-zinc-400 block mb-1">Parte do Projeto</span>
                <span className="text-lg font-bold text-black tracking-tight">{service?.title}</span>
              </div>

              {/* CTA */}
              <Button
                onClick={() => {
                  setSelectedService(null);
                  setIsBookingOpen(true);
                }}
                className="w-full h-20 bg-black text-white hover:bg-revgreen hover:text-black font-bold uppercase tracking-[0.2em] text-xs transition-all duration-500 cursor-pointer rounded-lg"
              >
                <Calendar className="w-5 h-5 mr-4" />
                Agendar Diagnóstico de {selectedService.title}
                <ArrowRight className="w-5 h-5 ml-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      )}

    </PageLayout>
  );
};

export default ServicosDetalhe;
