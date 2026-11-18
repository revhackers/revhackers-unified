import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Section from '@/components/ui/Section';
import { useState } from 'react';
import { getFeaturedCases, CaseStudy } from '@/api/cases';
import { motion } from 'framer-motion';

const CasesSection = () => {
  const [cases] = useState<CaseStudy[]>(() => getFeaturedCases());

  const scrollToTop = () => {
    window.scrollTo(0, 0);
  };

  return (
    <Section variant="light" className="bg-white relative py-20 border-t border-zinc-200/80">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header — Alinhado com o Padrão Ouro RevHackers (Sem verde no fundo claro) */}
        <div className="mb-12 max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-sans text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-950 tracking-tight leading-[1.15] mb-4 text-center"
          >
            Mais de R$ 50 milhões em pipeline gerado <span className="text-zinc-500">com redução média de 40% no CAC.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-zinc-600 text-base md:text-lg font-normal leading-relaxed max-w-2xl mx-auto text-center"
          >
            Resultados auditados em operações B2B que escalaram aquisição, conversão e retenção.
          </motion.p>
        </div>

        {/* Grid de Cases — Cards SaaS limpos em Padrão Editorial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cases.map((item, index) => {
              const anyItem = item as any;
              const description = anyItem.preview_description || "";

              return (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, duration: 0.4 }}
                >
                  <Link
                    to={`/cases/${item.slug}`}
                    onClick={scrollToTop}
                    className="group flex flex-col h-full bg-white border border-zinc-200/80 hover:border-zinc-400 rounded-xl overflow-hidden shadow-xs transition-all duration-300"
                  >
                    {/* Header do Card com Logo */}
                    <div className="h-40 overflow-hidden bg-zinc-50/70 flex items-center justify-center border-b border-zinc-100 p-6 relative">
                      <img
                        src={anyItem.client_logo || anyItem.logo}
                        alt={anyItem.title || anyItem.client_name}
                        className="max-w-[80%] max-h-[60px] w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-6 flex-1 flex flex-col bg-white">
                      <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        {anyItem.case_category || 'Estratégia B2B'}
                      </span>

                      <h3 className="text-base sm:text-lg font-bold text-zinc-950 mb-2 group-hover:text-zinc-700 transition-colors leading-snug">
                        {anyItem.title || anyItem.client_name}
                      </h3>

                      <p className="text-zinc-500 text-xs leading-relaxed mb-6 flex-1 line-clamp-3">
                        {description}
                      </p>

                      <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-950 group-hover:text-zinc-700 transition-colors">
                          Ver Estudo Completo
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

        {/* Global CTA — Botão Limpo SaaS */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 flex justify-center"
        >
          <Link
            to="/cases"
            onClick={scrollToTop}
            className="inline-flex items-center justify-center gap-2 h-11 px-8 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs rounded-lg transition-all shadow-xs"
          >
            <span>Ver Todos os Cases</span>
            <ArrowUpRight className="w-4 h-4 text-white" />
          </Link>
        </motion.div>
      </div>
    </Section>
  );
};

export default CasesSection;
