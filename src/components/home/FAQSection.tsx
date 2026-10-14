import { Link } from 'react-router-dom';
import type { FaqItem } from '@/data/homeFaq';

interface FAQSectionProps {
  items: FaqItem[];
}

/**
 * Perguntas frequentes com <details>/<summary> nativo: o texto das respostas fica
 * sempre no DOM (legivel por buscadores e motores de IA) e funciona sem JavaScript.
 */
const FAQSection = ({ items }: FAQSectionProps) => {
  if (items.length === 0) return null;

  return (
    <section className="py-20 bg-zinc-50" aria-labelledby="faq-titulo">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 id="faq-titulo" className="text-2xl md:text-3xl font-bold mb-4 tracking-tight text-zinc-900">
            Perguntas Frequentes
          </h2>
          <p className="text-lg text-zinc-600">
            Respostas diretas sobre a RevHackers e sobre como começar.
          </p>
        </div>

        <div className="max-w-3xl mx-auto divide-y divide-zinc-200 border-y border-zinc-200">
          {items.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00CC6A] [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span aria-hidden="true" className="text-zinc-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-zinc-600 leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-600">
          Quer ver onde sua operação perde receita?{' '}
          <Link to="/diagnostico" className="font-semibold text-zinc-900 underline underline-offset-4 hover:text-black">
            Faça um diagnóstico gratuito
          </Link>
        </p>
      </div>
    </section>
  );
};

export default FAQSection;
