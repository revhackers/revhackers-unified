/**
 * Fonte unica das perguntas frequentes da home.
 * Usada tanto pelo JSON-LD (FAQPage, via <SEO faq>) quanto pelo conteudo visivel
 * (<FAQSection>): o markup estruturado precisa refletir texto visivel na pagina.
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export const HOME_FAQ: FaqItem[] = [
  {
    question: 'O que faz a RevHackers?',
    answer:
      'A RevHackers é uma consultoria de Revenue Operations que integra Marketing, Vendas e Customer Success através de IA, CRM e automações para escalar receita de empresas B2B no Brasil.',
  },
  {
    question: 'O que é um Revenue Leak?',
    answer:
      'Revenue Leaks são falhas silenciosas na operação comercial - leads qualificados que se perdem, follow-ups esquecidos, dados desconectados entre CRM e marketing - que causam perda de receita sem que a empresa perceba.',
  },
  {
    question: 'Como agendar uma auditoria gratuita?',
    answer:
      'Você pode agendar uma auditoria de receita gratuita diretamente pelo site em revhackers.com.br/booking. A auditoria mapeia vazamentos na operação B2B e apresenta um plano de ação personalizado.',
  },
];
