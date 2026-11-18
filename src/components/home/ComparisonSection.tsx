
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Check, X, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { buildBookingUrl } from '@/utils/utm';

const criteria = [
  {
    label: 'Tempo até primeiros resultados',
    revhackers: '7 a 30 dias',
    interno: '90 a 180 dias',
    agencia: '60 a 120 dias',
    revhackersGood: true,
    internoGood: false,
    agenciaGood: false,
  },
  {
    label: 'Custo mensal estimado',
    revhackers: 'Engineering-level ROI',
    interno: 'R$25k a 60k/mês em salários',
    agencia: 'R$8k a 20k + fee variável',
    revhackersGood: true,
    internoGood: false,
    agenciaGood: null, // neutro
  },
  {
    label: 'Domínio de RevOps (CRM + IA + Ops)',
    revhackers: 'Especialidade central',
    interno: 'Depende do perfil contratado',
    agencia: 'Raramente coberto',
    revhackersGood: true,
    internoGood: null,
    agenciaGood: false,
  },
  {
    label: 'Integração CRM ↔ Marketing ↔ CS',
    revhackers: '✓ Nativo ao processo',
    interno: 'Requer múltiplos perfis',
    agencia: 'Fora do escopo usual',
    revhackersGood: true,
    internoGood: false,
    agenciaGood: false,
  },
  {
    label: 'Accountability por receita gerada',
    revhackers: 'Sim: métricas acordadas',
    interno: 'Difícil de isolar',
    agencia: 'Raramente formalizado',
    revhackersGood: true,
    internoGood: false,
    agenciaGood: false,
  },
  {
    label: 'Risco de desligamento / turnover',
    revhackers: 'Zero: time externo dedicado',
    interno: 'Alto: 3 a 6 meses para reposição',
    agencia: 'Médio: rotatividade de account',
    revhackersGood: true,
    internoGood: false,
    agenciaGood: null,
  },
];

function StatusIcon({ value }: { value: true | false | null }) {
  if (value === true) return <Check className="w-5 h-5 text-revgreen shrink-0" strokeWidth={2.5} />;
  if (value === false) return <X className="w-5 h-5 text-zinc-300 shrink-0" strokeWidth={2.5} />;
  return <Minus className="w-4 h-4 text-zinc-400 shrink-0" />;
}

const ComparisonSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section
      ref={ref}
      className="py-24 md:py-40 bg-white border-t border-zinc-100"
    >
      <div className="container-custom">

        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <span className="font-sans text-xs text-zinc-400 uppercase tracking-[0.2em] mb-6 block">
            Por que RevHackers
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight leading-[1.05] mb-6 text-balance">
            Por Que Não Contratar<br className="hidden md:block" /> Internamente?
          </h2>
          <p className="text-xl text-zinc-500 font-light leading-relaxed max-w-2xl mx-auto">
            Montar um time de RevOps interno leva de 6 a 12 meses e custa R$300k+ no primeiro ano. Veja o que cada caminho entrega de fato.
          </p>
        </div>

        {/* Comparison Table — Mobile: stacked cards */}
        <div className="max-w-2xl mx-auto space-y-6 md:hidden">
          {criteria.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.05 * i, ease: 'easeOut' }}
              className="border border-zinc-200 rounded-2xl overflow-hidden"
            >
              <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200">
                <span className="text-xs font-bold text-zinc-700 leading-snug">{row.label}</span>
              </div>

              <div className="bg-zinc-900 px-4 py-3.5 flex items-center gap-3">
                <StatusIcon value={row.revhackersGood} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#00CC6A] font-sans tracking-wider uppercase">RevHackers</span>
                  <span className="text-xs text-zinc-100 font-medium leading-snug">{row.revhackers}</span>
                </div>
              </div>

              <div className="bg-white px-4 py-3.5 flex items-center gap-3 border-b border-zinc-100">
                <StatusIcon value={row.internoGood} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400 font-sans tracking-wider uppercase">Time Interno</span>
                  <span className="text-xs text-zinc-500 font-medium leading-snug">{row.interno}</span>
                </div>
              </div>

              <div className="bg-white px-4 py-3.5 flex items-center gap-3">
                <StatusIcon value={row.agenciaGood} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400 font-sans tracking-wider uppercase">Agência Digital</span>
                  <span className="text-xs text-zinc-500 font-medium leading-snug">{row.agencia}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Comparison Table — Desktop: grid */}
        <div className="max-w-5xl mx-auto overflow-x-auto hidden md:block">

          {/* Column Headers */}
          <div className="grid grid-cols-4 gap-0 mb-0">
            <div className="col-span-1" />
            {/* RevHackers header — highlighted */}
            <div className="col-span-1 bg-zinc-900 px-6 py-5 text-center rounded-t-sm flex flex-col items-center justify-center">
              <img 
                src="/brand/revhackers-wordmark-white.png"
                alt="RevHackers" 
                className="w-28 md:w-36 max-w-full h-auto mx-auto mb-3 opacity-100"
              />
              <span className="text-[#00CC6A] text-[10px] font-sans tracking-wider uppercase">GTM Engineering</span>
            </div>
            <div className="col-span-1 bg-zinc-50 border-x border-t border-zinc-200 px-6 py-5 text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-700 block">Time Interno</span>
              <span className="text-zinc-400 text-xxs font-sans font-medium">Growth / Ops Manager</span>
            </div>
            <div className="col-span-1 bg-zinc-50 border-t border-r border-zinc-200 px-6 py-5 text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-700 block">Agência Digital</span>
              <span className="text-zinc-400 text-xxs font-sans">Marketing / Growth</span>
            </div>
          </div>

          {/* Rows */}
          {criteria.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.05 * i, ease: 'easeOut' }}
              className="grid grid-cols-4 gap-0 border-b border-zinc-100 last:border-b-0"
            >
              {/* Label */}
              <div className="col-span-1 bg-white px-4 py-5 flex items-center border-r border-zinc-100">
                <span className="text-xs font-bold text-zinc-700 leading-snug">{row.label}</span>
              </div>

              {/* RevHackers — highlighted column */}
              <div className="col-span-1 bg-zinc-900 px-6 py-5 flex items-center gap-3">
                <StatusIcon value={row.revhackersGood} />
                <span className="text-xs text-zinc-100 font-medium leading-snug">{row.revhackers}</span>
              </div>

              {/* Interno */}
              <div className="col-span-1 bg-white border-x border-zinc-100 px-5 py-5 flex items-center gap-3">
                <StatusIcon value={row.internoGood} />
                <span className="text-xs text-zinc-500 font-medium leading-snug">{row.interno}</span>
              </div>

              {/* Agência */}
              <div className="col-span-1 bg-white border-r border-zinc-100 px-5 py-5 flex items-center gap-3">
                <StatusIcon value={row.agenciaGood} />
                <span className="text-xs text-zinc-500 font-medium leading-snug">{row.agencia}</span>
              </div>
            </motion.div>
          ))}

        </div>

        {/* CTA abaixo da tabela */}
        <div className="mt-14 text-center">
          <p className="text-sm text-zinc-500 mb-6 font-medium max-w-lg mx-auto">
            Veja quanto sua operação está perdendo agora, antes de contratar qualquer pessoa.
          </p>
          <Button asChild size="lg" className="bg-zinc-950 text-white hover:bg-zinc-800 font-bold text-sm h-12 px-8 rounded-xl transition-all shadow-xs">
            <Link to={buildBookingUrl('homepage', 'comparison_cta')}>
              Auditar Minha Operação →
            </Link>
          </Button>
        </div>

      </div>
    </section>
  );
};

export default ComparisonSection;
