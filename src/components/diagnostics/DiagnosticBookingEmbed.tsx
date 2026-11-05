import React from 'react';
import { GhlBookingEmbed } from '@/components/shared/GhlBookingEmbed';
import { GHL_CALENDARS } from '@/config/ghl';

interface DiagnosticBookingEmbedProps {
 diagnosticType?: string;
}

const DiagnosticBookingEmbed: React.FC<DiagnosticBookingEmbedProps> = ({ diagnosticType }) => {
 return (
 <div className="w-full flex-col items-center justify-center p-4 bg-white/30 border border-zinc-200 shadow-sm mt-12 overflow-hidden">
 <div className="text-center mb-6">
 <h3 className="text-2xl font-bold text-zinc-900 mb-2">Agende Lendo Seu Relatório</h3>
 <p className="text-zinc-500">
 Nossos especialistas farão o deep dive gratuito no seu funil.
 </p>
 </div>
 <GhlBookingEmbed
   calendarId={GHL_CALENDARS.diagnostico}
   title="Agendar Diagnostico"
   minHeight={650}
   params={{ utm_source: 'revhackers_hub', utm_medium: 'diagnostic', utm_campaign: `diagnostico-${diagnosticType || 'general'}` }}
 />
 </div>
 );
};

export default DiagnosticBookingEmbed;
