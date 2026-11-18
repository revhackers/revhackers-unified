
import { ArrowRight, Workflow, Database, Sliders, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useInView, type Variants } from 'framer-motion';
import { useRef } from 'react';

const services = [
  {
    icon: Workflow,
    title: 'Engenharia de Vendas',
    desc: 'Eliminamos disparos genéricos e automações cegas. Construímos réguas de prospecção inteligente direcionadas estritamente aos decisores certos no momento exato.',
    result: '3x mais respostas qualificadas em 30 dias',
    link: '/servicos/tracao-midia-paga',
  },
  {
    icon: Database,
    title: 'CRM & Arquitetura de Dados',
    desc: 'Seu CRM limpo, organizado e pontuado por intenção. O vendedor deixa de perder tempo organizando contatos e passa a focar apenas nas contas prontas para fechar.',
    result: 'Pipeline limpo e acionável em 14 dias',
    link: '/servicos/ecossistema-crm',
  },
  {
    icon: Sliders,
    title: 'Automação de Processos B2B',
    desc: 'Eliminamos até 80% da rotina operacional e follow-up manual dos closers. A tecnologia executa as etapas de registro enquanto o time foca na negociação.',
    result: '70% menos trabalho operacional por vendedor',
    link: '/servicos/automacao-inteligente',
  },
  {
    icon: GraduationCap,
    title: 'Habilitação Operacional',
    desc: 'Não entregamos apresentações ou PDFs teóricos. Sentamos junto com a sua equipe comercial e garantimos a execução autônoma do motor de receita na prática.',
    result: 'Equipe autônoma operando o sistema em 21 dias',
    link: '/servicos/founder-led-growth',
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: 'easeOut' },
  }),
};

const ServicesSection = () => {
  const scrollToTop = () => window.scrollTo(0, 0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      className="py-20 bg-white border-b border-zinc-200/80"
    >
      <div className="max-w-5xl mx-auto px-6">

        {/* Header, Centralizado sem badges pill */}
        <div className="mb-14 max-w-3xl mx-auto text-center space-y-3">
          <motion.h2
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="text-zinc-900 text-2xl md:text-3xl font-extrabold tracking-tight leading-tight"
          >
            Você contratou SDRs, comprou ferramentas e postou no LinkedIn por 6 meses.{' '}
            <span className="text-zinc-400">Quanto disso virou receita auditada?</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="text-zinc-500 text-sm md:text-base leading-relaxed max-w-2xl mx-auto"
          >
            Nós não vendemos horas de consultoria. Nós instalamos 4 sistemas que encontram e fecham receita travada na sua operação.
          </motion.p>
        </div>

        {/* Grid 2x2, High-End SaaS Engineering System */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, i) => {
            const monoBadges = ["01 // SALES ENGINE", "02 // DATA ARCHITECTURE", "03 // AUTO WORKFLOW", "04 // OPS ENABLEMENT"];
            return (
              <motion.div
                key={service.title}
                variants={fadeUp}
                custom={3 + i}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
              >
                <Link
                  to={service.link}
                  onClick={scrollToTop}
                  className="group flex flex-col h-full p-8 bg-white border border-zinc-200/80 rounded-2xl hover:border-zinc-950 shadow-xs hover:shadow-md transition-all duration-300 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-zinc-400 tracking-wider">
                      {monoBadges[i]}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 group-hover:bg-[#00CC6A] transition-colors" />
                  </div>

                  {/* Título */}
                  <h3 className="text-zinc-950 font-extrabold text-lg tracking-tight">
                    {service.title}
                  </h3>

                  {/* Descrição */}
                  <p className="text-zinc-600 text-xs leading-relaxed flex-1 font-normal">
                    {service.desc}
                  </p>

                  {/* Resultado concreto */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                    <span className="text-xs font-semibold text-zinc-950">
                      {service.result}
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 group-hover:translate-x-1 transition-all" strokeWidth={2} />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default ServicesSection;
