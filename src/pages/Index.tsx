import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import HeroSection from '@/components/home/HeroSection';
import PartnersSection from '@/components/home/PartnersSection';
import ServicesSection from '@/components/home/ServicesSection';
import CasesSection from '@/components/home/CasesSection';
import JourneySection from '@/components/home/JourneySection';
import ComparisonSection from '@/components/home/ComparisonSection';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import ContactFormSection from '@/components/home/ContactFormSection';
import SEO from '@/components/shared/SEO';
import FAQSection from '@/components/home/FAQSection';
import { HOME_FAQ } from '@/data/homeFaq';

const Index = () => {
  return (
    <PageLayout>
      <SEO
        title="Home"
        description="Instalamos sua máquina de receita B2B com ABM e IA em 90 dias. Engenharia de GTM dentro do seu CRM, não relatório em PDF."
        canonical="https://revhackers.com.br/"
        faq={HOME_FAQ}
      />
      <HeroSection />
      <PartnersSection />
      <ServicesSection />
      <CasesSection />
      <JourneySection />
      <ComparisonSection />
      <TestimonialsSection />
      <FAQSection items={HOME_FAQ} />
      <ContactFormSection />
    </PageLayout>
  );
};

export default Index;
