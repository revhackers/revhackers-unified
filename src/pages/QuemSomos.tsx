
import { useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { GhlBookingEmbed } from '@/components/shared/GhlBookingEmbed';
import { GHL_CALENDARS } from '@/config/ghl';
import HeroSection from '@/components/quem-somos/HeroSection';
import HistorySection from '@/components/quem-somos/HistorySection';
import TimelineSection from '@/components/quem-somos/TimelineSection';
import ValuesSection from '@/components/quem-somos/ValuesSection';
import FounderShowcase from '@/components/quem-somos/FounderShowcase';
import SEO from '@/components/shared/SEO';

const QuemSomos = () => {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageLayout>
      <SEO
        title="Quem Somos - Consultoria de Revenue Operations"
        description="Conheça a RevHackers: a primeira consultoria de Revenue Operations do Brasil. Fundada em São Paulo por Giulliano Alves, integramos IA, CRM e automações B2B."
        canonical="https://revhackers.com.br/quem-somos"
        breadcrumbs={[
          { name: "Home", url: "https://revhackers.com.br/" },
          { name: "Quem Somos", url: "https://revhackers.com.br/quem-somos" }
        ]}
      />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <HeroSection />

        {/* Founder Showcase - Giulliano Alves Authority */}
        <FounderShowcase />

        {/* Nossa História */}
        <HistorySection />

        {/* Timeline Section */}
        <TimelineSection />

        {/* Nossos Valores */}
        <ValuesSection />

        {/* Booking Widget Section — Fundo 100% Branco Puro */}
        <section className="py-20 bg-white border-t border-zinc-200/80">
          <div className="max-w-4xl mx-auto px-6">
            <GhlBookingEmbed calendarId={GHL_CALENDARS.diagnostico} title="Agendar diagnóstico" />
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default QuemSomos;
