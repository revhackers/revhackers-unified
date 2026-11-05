/**
 * src/components/shared/GhlBookingEmbed.tsx
 *
 * GHL native booking/calendar embed component.
 * Loads the booking calendar iframe from api.leadconnectorhq.com.
 *
 * Pattern: https://github.com/usefunnels/usefunnels/blob/main/components/booking/BookingCard.tsx
 *
 * Props:
 *   - calendarId: GHL calendar ID (get from GHL › Calendars › [calendar name])
 *   - title: accessibility title (default "Agendar")
 *   - params: query string params to pass (utm_campaign, etc.)
 *   - minHeight: iframe min-height in px (default 650)
 */

import { useMemo } from 'react';
import { GHL_EMBED_BASE } from '@/config/ghl';
import { getPersistedUtmParams } from '@/utils/utm';

export interface GhlBookingEmbedProps {
  calendarId: string;
  title?: string;
  params?: Record<string, string>;
  minHeight?: number;
}

export function GhlBookingEmbed({
  calendarId,
  title = 'Agendar',
  params = {},
  minHeight = 650,
}: GhlBookingEmbedProps) {
  // Build the iframe src with UTM and custom params
  const iframeSrc = useMemo(() => {
    if (!calendarId) return '';

    const utmParams = getPersistedUtmParams();
    const allParams = new URLSearchParams({
      ...utmParams,
      ...params,
    });

    return `${GHL_EMBED_BASE}/widget/booking/${calendarId}?${allParams.toString()}`;
  }, [calendarId, params]);

  if (!calendarId) {
    console.error('[GhlBookingEmbed] calendarId is missing. Calendar will not render.');
    return null;
  }

  return (
    <iframe
      id={`${calendarId}_embed`}
      src={iframeSrc}
      title={title}
      scrolling="no"
      style={{
        width: '100%',
        border: 'none',
        overflow: 'hidden',
        minHeight: `${minHeight}px`,
      }}
    />
  );
}
