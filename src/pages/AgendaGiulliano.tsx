import PageLayout from '@/components/layout/PageLayout';
import SEO from '@/components/shared/SEO';
import { GhlBookingEmbed } from '@/components/shared/GhlBookingEmbed';
import { GHL_CALENDARS } from '@/config/ghl';

const AgendaGiulliano = () => {

    return (
        <PageLayout>
            <SEO
                title="Escolha o melhor horário pra conversarmos"
                description="30 minutos, direto ao ponto, sem discurso de vendas. Sessão 1:1 com o Founder da RevHackers."
                canonical="https://revhackers.com.br/agenda-giulliano"
                image="https://revhackers.com.br/uploads/giulliano-linkedin-profile.png"
            />
            <div className="min-h-screen bg-white flex flex-col">
                {/* Header com foto + headline */}
                <div className="w-full pt-28 pb-8 px-4">
                    <div className="max-w-2xl mx-auto flex items-center gap-5">
                        <img
                            src="/uploads/giulliano-linkedin-profile.png"
                            alt="Giulliano Alves"
                            className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover object-[center_15%] border border-zinc-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-1.5">
                                Sessão 1:1 com o Founder
                            </p>
                            <h1 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tight leading-[1.05] mb-1.5">
                                Escolha o melhor horário pra conversarmos.
                            </h1>
                            <p className="text-sm md:text-[15px] text-zinc-500 font-medium leading-relaxed">
                                30 minutos, direto ao ponto, sem discurso de vendas.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Calendario embed */}
                <div className="flex-1 w-full max-w-4xl mx-auto px-4 pb-8">
                    <GhlBookingEmbed calendarId={GHL_CALENDARS.diagnostico} title="Agendar horário com Giulliano Alves" minHeight={700} />
                </div>
            </div>
        </PageLayout>
    );
};

export default AgendaGiulliano;
