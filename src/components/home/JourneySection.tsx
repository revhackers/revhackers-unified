
import { Check } from 'lucide-react';
import Section from '@/components/ui/Section';


const journeySteps = [
  {
    step: "Passo 01: Dias 1 a 30",
    title: "Você Para de Adivinhar",
    desc: "Mapeamos os vazamentos reais da sua operação com dados auditados no seu CRM, não com intuição.",
    items: ["Auditoria de CRM e Pipeline", "Análise de Unit Economics", "Mapa dos Maiores Gargalos"]
  },
  {
    step: "Passo 02: Dias 30 a 60",
    title: "Sua Máquina Funciona",
    desc: "CRM integrado, IA filtrando leads e automações ativas. Sua equipe para de fazer trabalho manual.",
    items: ["Integração via API & Webhook", "Qualificação Automatizada", "Score de Leads Ativo"]
  },
  {
    step: "Passo 03: Dias 60 a 90",
    title: "Você Escala Sem Contratar",
    desc: "Com a base consolidada, escalamos seus resultados semana a semana sem precisar expandir a equipe.",
    items: ["Testes A/B em Canais", "Refinamento de Playbooks", "Reporting Executivo"]
  }
];

const JourneySection = () => {
  return (
    <Section variant="light" className="bg-white py-20 border-t border-zinc-200/80">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header Centralizado Padrão Ouro */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="font-sans text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-950 tracking-tight leading-[1.15] mb-4 text-center">
            Em 90 Dias, Sua Operação <span className="text-zinc-500">Funciona Sem Você.</span>
          </h2>
          <p className="text-zinc-600 text-base md:text-lg font-normal leading-relaxed max-w-xl mx-auto text-center">
            Três passos de execução cirúrgica. Do diagnóstico à escala previsível.
          </p>
        </div>

        {/* Pipeline Horizontal de 1px — Padrão RevHackers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {journeySteps.map((item, index) => (
            <div
              key={index}
              className="border-t-2 border-zinc-950 pt-6 flex flex-col justify-between h-full"
            >
              <div>
                <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                  {item.step}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-zinc-950 mb-3 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
                  {item.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-100">
                <ul className="space-y-2.5">
                  {item.items.map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-xs text-zinc-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default JourneySection;
