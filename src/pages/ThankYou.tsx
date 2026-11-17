import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageCircle } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import SEO from '@/components/shared/SEO';
import { GhlBookingEmbed } from '@/components/shared/GhlBookingEmbed';
import { GHL_CALENDARS } from '@/config/ghl';

const ThankYou = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <PageLayout>
      <SEO
        title="Obrigado"
        description="Confirmação do seu pedido na RevHackers."
        noindex
      />
      {/* Hero Section */}
      <section className="relative min-h-[40vh] flex flex-col justify-center items-center overflow-hidden pt-28 pb-16 bg-black border-b border-zinc-900 text-center">
        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center">
          <div
            aria-hidden="true"
            className="w-16 h-16 rounded-full bg-revgreen/10 border border-revgreen/20 flex items-center justify-center mb-6"
          >
            <MessageCircle className="w-8 h-8 text-revgreen" />
          </div>
          <span className="text-revgreen text-xs font-semibold uppercase tracking-wider mb-4">
            Solicitação recebida
          </span>
          <h1 className="font-sans text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] font-extrabold text-white mb-5 leading-[1.15] tracking-tight">
            Olhe seu WhatsApp. Nosso especialista está te chamando agora
          </h1>
          <p className="text-zinc-400 text-base md:text-lg font-normal leading-relaxed max-w-2xl mx-auto">
            Recebemos sua solicitação. Confira o WhatsApp agora: a conversa
            continua por lá, com resposta imediata.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white text-zinc-900 border-b border-zinc-200/80">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Prefere agendar um horário?
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
            <Button
              type="button"
              size="lg"
              onClick={() => setIsBookingOpen(true)}
              className="bg-zinc-950 text-white hover:bg-zinc-800 font-bold text-sm h-12 px-8 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Agendar diagnóstico
            </Button>
            <Button
              variant="ghost"
              asChild
              className="text-zinc-500 hover:text-zinc-900 font-medium text-sm h-12 px-4"
            >
              <Link to="/" onClick={() => window.scrollTo(0, 0)}>
                Voltar para a Home
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        {isBookingOpen && (
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Agendar diagnóstico</DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-2">
              <GhlBookingEmbed
                calendarId={GHL_CALENDARS.diagnostico}
                title="Agendar diagnóstico"
                minHeight={780}
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </PageLayout>
  );
};

export default ThankYou;
