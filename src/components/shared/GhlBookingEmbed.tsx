import React, { useEffect } from 'react';
import { GHL_EMBED_BASE, GHL_FORM_EMBED_SCRIPT, GHL_CALENDARS } from '../../config/ghl';
import { getPersistedUtmParams } from '../../utils/utm';

interface GhlBookingEmbedProps {
  calendarId?: string;
  minHeight?: number;
}

export const GhlBookingEmbed: React.FC<GhlBookingEmbedProps> = ({
  calendarId = GHL_CALENDARS.diagnostico,
  minHeight = 650,
}) => {
  useEffect(() => {
    if (!document.getElementById('ghl-form-embed-script')) {
      const script = document.createElement('script');
      script.id = 'ghl-form-embed-script';
      script.src = GHL_FORM_EMBED_SCRIPT;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const utmParams = getPersistedUtmParams();
  const searchParams = new URLSearchParams({
    ...utmParams,
  });

  const iframeSrc = `${GHL_EMBED_BASE}/widget/booking/${calendarId}?${searchParams.toString()}`;
  const iframeId = `booking-${calendarId}`;

  return (
    <div style={{ width: '100%' }}>
      <iframe
        id={iframeId}
        src={iframeSrc}
        scrolling="no"
        style={{ width: '100%', border: 'none', overflow: 'hidden', minHeight: `${minHeight}px` }}
        title="Agendamento Diagnóstico RevHackers"
      />
    </div>
  );
};
