import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import ContactForm from '../shared/ContactForm';
import { getCurrentQuarterString } from '@/utils/dateUtils';

const ContactFormSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      id="solicitar-analise"
      className="relative py-24 bg-black border-t border-zinc-900 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left - Copy de autoridade */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="space-y-6"
          >
            <h2 className="font-sans text-[2rem] sm:text-[2.5rem] font-extrabold text-white leading-[1.15] tracking-tight">
              Montamos sua operação de vendas{' '}
              <span className="text-[#00CC6A]">do zero à escala.</span>
            </h2>
            <p className="text-zinc-400 text-base md:text-lg font-normal leading-relaxed max-w-lg">
              Desenhamos arquiteturas comerciais pesadas para empresas que buscam dominar o mercado com inteligência e precisão.
            </p>

            {/* Steps, Lista limpa com marcadores suaves */}
            <div className="space-y-5 pt-4 border-t border-zinc-900">
              {[
                { title: 'Diagnóstico Técnico', desc: 'Auditoria completa de tracking, CRM e atribuição.' },
                { title: 'Roadmap de 90 Dias', desc: 'Plano de execução focado em eficiência de CAC e LTV.' },
                { title: 'Execução Hands-on', desc: 'Time especializado implementando cada automação.' },
              ].map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00CC6A] mt-2 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-bold mb-0.5">{step.title}</p>
                    <p className="text-zinc-400 text-xs leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 text-xs font-medium text-zinc-500">
              Agenda {getCurrentQuarterString()} · <span className="text-zinc-300 font-semibold">Vagas limitadas</span>
            </div>
          </motion.div>

          {/* Right - Formulário no Padrão Claude Partner Network (Caixa Branca Puro) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          >
            <div className="bg-white border border-zinc-200/80 p-8 sm:p-10 rounded-2xl shadow-xs text-zinc-900">
              <div className="mb-6 space-y-1">
                <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                  Solicitar Análise
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500">
                  Preencha para análise técnica de perfil. Resposta em até 24h.
                </p>
              </div>

              <ContactForm formType="diagnosis" variant="light" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default ContactFormSection;
