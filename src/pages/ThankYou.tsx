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
      <main className="bg-white text-black">
        <section className="mx-auto max-w-3xl px-6 pt-16 pb-24 md:pt-28 md:pb-36">
          <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-black">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center border-2 border-revgreen text-revgreen"
            >
              <MessageCircle className="h-5 w-5" strokeWidth={2} />
            </span>
            Solicitação recebida
          </p>

          <h1 className="mt-8 border-l-4 border-revgreen pl-5 text-3xl font-bold leading-tight tracking-tight text-black sm:text-4xl md:pl-6 md:text-5xl">
            Olhe seu WhatsApp. Nosso especialista está te chamando agora
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-700 md:text-xl">
            Recebemos sua solicitação. Confira o WhatsApp agora: a conversa
            continua por lá, com resposta imediata.
          </p>

          <div className="mt-10 border-t border-zinc-200 pt-8">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full rounded-none border-2 border-revgreen bg-transparent px-8 text-base font-semibold text-black hover:bg-revgreen hover:text-black sm:w-auto"
              onClick={() => setIsBookingOpen(true)}
            >
              Prefere agendar um horário?
            </Button>

            <p className="mt-8">
              <Link
                to="/"
                onClick={() => window.scrollTo(0, 0)}
                className="text-sm text-zinc-500 underline underline-offset-4 hover:text-black"
              >
                Voltar para a Home
              </Link>
            </p>
          </div>
        </section>
      </main>

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
