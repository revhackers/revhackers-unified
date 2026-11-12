/**
 * src/components/shared/GhlFormEmbed.tsx
 *
 * GHL native form embed component using postMessage for event communication.
 * Loads the form iframe from api.leadconnectorhq.com and handles submission events.
 *
 * Pattern: https://github.com/usefunnels/usefunnels/blob/main/components/booking/BookingCard.tsx
 *
 * Props:
 *   - formId: GHL form ID (get from GHL › Sites › Forms › Integrate)
 *   - title: accessibility title
 *   - params: query string params (GHL custom-field keys)
 *   - minHeight: iframe min-height in px (default 620)
 *   - onSubmitted: callback fired when form emits set-sticky-contacts / _ud event
 */

import { useEffect, useRef, useCallback } from 'react';
import { GHL_EMBED_BASE, GHL_FORM_EMBED_SCRIPT } from '@/config/ghl';
import { getPersistedUtmParams } from '@/utils/utm';

export interface GhlFormEmbedProps {
  formId: string;
  title: string;
  params?: Record<string, string>;
  minHeight?: number;
  onSubmitted?: () => void;
}

/**
 * Injects the GHL form embed script once globally.
 * Safe to call multiple times; script loads only once.
 */
function injectGhlFormScript(): void {
  if (typeof window === 'undefined') return;
  
  // Check if script already loaded
  const existing = document.getElementById('ghl-form-embed-script');
  if (existing) return;
  
  const script = document.createElement('script');
  script.id = 'ghl-form-embed-script';
  script.src = GHL_FORM_EMBED_SCRIPT;
  script.async = true;
  document.head.appendChild(script);
}

export function GhlFormEmbed({
  formId,
  title,
  params = {},
  minHeight = 620,
  onSubmitted,
}: GhlFormEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const listenerRef = useRef<((ev: MessageEvent) => void) | null>(null);

  // Build the iframe src with UTM and form-specific params
  const buildIframeSrc = useCallback(() => {
    if (!formId) return '';
    
    // Merge persisted UTMs with provided params
    const utmParams = getPersistedUtmParams();
    const allParams = new URLSearchParams({
      ...utmParams,
      ...params,
    });
    
    return `${GHL_EMBED_BASE}/widget/form/${formId}?${allParams.toString()}`;
  }, [formId, params]);

  useEffect(() => {
    // Inject global GHL script once
    injectGhlFormScript();

    if (!formId) {
      console.error('[GhlFormEmbed] formId is missing. Form will not render.');
      return;
    }

    // Set up postMessage listener for set-sticky-contacts / _ud event
    const handleMessage = (event: MessageEvent) => {
      // Security: verify origin matches GHL embed base
      if (!event.origin.includes(GHL_EMBED_BASE.replace('https://', ''))) {
        return;
      }
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const isFormSubmitted =
        Array.isArray(event.data) &&
        event.data[0] === 'set-sticky-contacts' &&
        event.data[1] === '_ud';

      if (isFormSubmitted) {
        // Fire callback if provided
        if (onSubmitted) {
          onSubmitted();
        }
      }
    };

    listenerRef.current = handleMessage;
    window.addEventListener('message', handleMessage);

    return () => {
      if (listenerRef.current) {
        window.removeEventListener('message', listenerRef.current);
      }
    };
  }, [formId, onSubmitted]);

  const iframeSrc = buildIframeSrc();

  if (!formId) {
    return null;
  }

  return (
    <iframe
      ref={iframeRef}
      id={`inline-${formId}`}
      data-form-id={formId}
      data-layout-iframe-id={`inline-${formId}`}
      data-layout="{'id':'INLINE'}"
      data-trigger-type="alwaysShow"
      data-activation-type="alwaysActivated"
      data-deactivation-type="neverDeactivate"
      src={iframeSrc}
      title={title}
      style={{
        width: '100%',
        border: 'none',
        minHeight: `${minHeight}px`,
      }}
      scrolling="no"
    />
  );
}
