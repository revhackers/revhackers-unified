import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PageLayout from '@/components/layout/PageLayout';
import SEO from '@/components/shared/SEO';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { GhlBookingEmbed } from '@/components/shared/GhlBookingEmbed';
import { GHL_CALENDARS } from '@/config/ghl';
import { materialsData } from '@/data/materialsData';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function MaterialThankYou() {
    const [searchParams] = useSearchParams();
    const m = searchParams.get('m');
    const material = materialsData.find((x) => x.slug === m);
    const [isBookingOpen, setIsBookingOpen] = useState(false);

    return (
        <PageLayout>
            <Helmet>
                <meta name="robots" content="noindex,nofollow" />
            </Helmet>
            <SEO
                title="Material enviado"
                description="Seu material RevHackers foi enviado por e-mail."
            />
            {/* Hero Section */}
            <section className="relative min-h-[40vh] flex flex-col justify-center items-center overflow-hidden pt-28 pb-16 bg-black border-b border-zinc-900 text-center">
                <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[#00CC6A]/10 border border-[#00CC6A]/20 flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-8 h-8 text-[#00CC6A]" />
                    </div>
                    <span className="text-[#00CC6A] text-xs font-semibold uppercase tracking-wider mb-4">
                        Material a caminho
                    </span>
                    <h1 className="font-sans text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] font-extrabold text-white mb-5 leading-[1.15] tracking-tight">
                        Pronto. Enviamos o material para o seu e-mail.
                    </h1>
                    <p className="text-zinc-400 text-base md:text-lg font-normal leading-relaxed max-w-2xl mx-auto">
                        {material ? (
                            <>O <strong>{material.title}</strong> chega em instantes. Confira também a caixa de spam.</>
                        ) : (
                            <>O material chega em instantes. Confira também a caixa de spam.</>
                        )}
                    </p>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-white text-zinc-900 border-b border-zinc-200/80">
                <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
                    <div className="space-y-4 max-w-2xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                            Quer aplicar isso na sua operação?
                        </h2>
                        <p className="text-zinc-600 text-base leading-relaxed">
                            Converse 45 minutos com nosso time e saia com os principais vazamentos de receita mapeados.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button
                            size="lg"
                            onClick={() => setIsBookingOpen(true)}
                            className="bg-zinc-950 text-white hover:bg-zinc-800 font-bold text-sm h-12 px-8 rounded-xl shadow-xs transition-all"
                        >
                            Agendar diagnóstico
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            asChild
                            className="border-zinc-300 text-zinc-700 hover:bg-zinc-50 font-semibold text-sm h-12 px-6 rounded-xl"
                        >
                            <Link to="/materiais">Ver outros materiais</Link>
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
                                minHeight={650}
                            />
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </PageLayout>
    );
}
