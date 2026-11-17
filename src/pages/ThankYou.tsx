import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, ArrowRight } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import SEO from '@/components/shared/SEO';
import { GhlBookingEmbed } from '@/components/shared/GhlBookingEmbed';
import { GHL_CALENDARS } from '@/config/ghl';

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const isEspecialista = searchParams.get('from') === 'especialista';
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <PageLayout>
      <SEO
        title="Obrigado"
        description="Confirmação do seu pedido na RevHackers."
        noindex
      />
      <div className="min-h-screen bg-white flex items-center justify-center py-16 px-4">
        <Card className="max-w-2xl mx-auto p-12 text-center bg-white border border-zinc-200 shadow-sm">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <CheckCircle className="w-20 h-20 text-revgreen animate-bounceGentle" />
          </div>
          
          {/* Title */}
          <h1 className="text-3xl md:text-3xl font-bold text-revgreen mb-6">
            {isEspecialista
              ? 'Olhe seu WhatsApp. Nosso especialista está te chamando agora'
              : 'Obrigado pelo agendamento!'}
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-[#555555] leading-relaxed mb-6">
            {isEspecialista
              ? 'Recebemos sua solicitação e a conversa continua agora pelo WhatsApp, com resposta imediata.'
              : 'Sua solicitação foi registrada com sucesso. Em breve você receberá um e-mail com os próximos passos.'}
          </p>
          
          {/* Warning/Alert */}
          <div className="mb-10">
            <p className="text-lg text-[#d51f2a] font-medium">
              {isEspecialista
                ? '📱 Confira seu WhatsApp agora.'
                : '📩 Fique de olho na sua caixa de entrada (e também no spam).'}
            </p>
          </div>
          
          {isEspecialista && (
            <div className="mb-6">
              <Button
                variant="outline"
                size="lg"
                className="border-revgreen text-revgreen hover:bg-revgreen hover:text-black font-semibold px-8 py-3 transition-all duration-300 min-w-48"
                onClick={() => setIsBookingOpen(true)}
              >
                Prefere agendar um horário?
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              className="bg-revgreen hover:bg-revgreen-hover text-black font-semibold px-8 py-3 transition-all duration-300 group min-w-48"
              size="lg"
            >
              <Link to="/" onClick={() => window.scrollTo(0, 0)}>
                Voltar para a Home
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-zinc-300 text-black hover:bg-zinc-50 px-8 py-3 transition-all duration-300 min-w-48"
              size="lg"
            >
              <Link to="/servicos">
                Conheça nossos serviços
              </Link>
            </Button>
          </div>
        </Card>
      </div>
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