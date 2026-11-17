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

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { GHL_EMBED_BASE, GHL_FORM_EMBED_SCRIPT } from '@/config/ghl';
import { getPersistedUtmParams } from '@/utils/utm';

export interface GhlFormEmbedProps {
  formId: string;
  title: string;
  params?: Record<string, string>;
  minHeight?: number;
  onSubmitted?: (email?: string) => void;
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

  // O widget do GHL preenche campos ocultos (rh_material_slug, rh_diagnostic_*, utm_* ...) a partir da
  // query string da PAGINA-MAE; os parametros da URL do iframe sao ignorados. Por isso espelhamos
  // `params` (e os UTMs persistidos, sem sobrescrever os da URL) na URL atual antes do iframe carregar.
  const paramsKey = JSON.stringify(params);
  // Cortina anti-form-pelado: o estilo visual vem do CDN da GHL (cross-origin,
  // sem inspeção possível). Só revelamos o iframe após onLoad; se estourar o
  // timeout, caímos no fallback com retry em vez de exibir formulário quebrado.
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setStatus('loading');
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setStatus((s) => (s === 'loading' ? 'failed' : s));
    }, 12000);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [formId, paramsKey, attempt]);

  const handleIframeLoad = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setStatus('ready');
  }, []);

  const handleRetry = useCallback(() => {
    setAttempt((a) => a + 1);
  }, []);
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !formId) return;
    const explicit = JSON.parse(paramsKey) as Record<string, string>;
    const url = new URL(window.location.href);
    const applied: Array<[string, string]> = [];
    for (const [key, value] of Object.entries(getPersistedUtmParams())) {
      if (value && !url.searchParams.has(key)) {
        url.searchParams.set(key, value);
        applied.push([key, value]);
      }
    }
    for (const [key, value] of Object.entries(explicit)) {
      if (value) {
        url.searchParams.set(key, value);
        applied.push([key, value]);
      }
    }
    if (applied.length) {
      window.history.replaceState(window.history.state, '', url.toString());
    }
    return () => {
      const current = new URL(window.location.href);
      if (current.pathname !== url.pathname) return;
      let changed = false;
      for (const [key, value] of applied) {
        if (current.searchParams.get(key) === value) {
          current.searchParams.delete(key);
          changed = true;
        }
      }
      if (changed) {
        window.history.replaceState(window.history.state, '', current.toString());
      }
    };
  }, [formId, paramsKey]);
  useEffect(() => {
    // Inject global GHL script once
    injectGhlFormScript();

    if (!formId) {
      console.error('[GhlFormEmbed] formId is missing. Form will not render.');
      return;
    }

    const allowedOrigin = new URL(GHL_EMBED_BASE).origin;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== allowedOrigin) {
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
        if (onSubmitted) {
          let userEmail: string | undefined;
          try {
            const raw = event.data[2];
            const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
            userEmail = obj?.email || obj?.contact?.email;
          } catch (e) {}
          onSubmitted(userEmail);
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
    <div
      className="relative w-full"
      style={{ minHeight: `${minHeight}px` }}
      aria-busy={status === 'loading'}
      aria-live="polite"
    >
      {status === 'loading' && (
        <div className="w-full space-y-3" aria-hidden="true">
          <div className="h-10 w-full bg-zinc-100 animate-pulse" />
          <div className="h-10 w-full bg-zinc-100 animate-pulse" />
          <div className="h-10 w-full bg-zinc-100 animate-pulse" />
          <div className="h-24 w-full bg-zinc-100 animate-pulse" />
          <div className="h-11 w-40 bg-zinc-200 animate-pulse" />
        </div>
      )}
      {status === 'failed' ? (
        <div className="w-full border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm font-bold text-zinc-900 mb-1">
            O formulário demorou a carregar.
          </p>
          <p className="text-sm text-zinc-500 mb-4">
            Verifique sua conexão ou desative o bloqueador de anúncios para este site.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center bg-[#00CC6A] text-black font-extrabold uppercase tracking-wider text-sm px-6 h-11 border-2 border-zinc-900 shadow-[4px_4px_0_#18181B]"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <iframe
          key={`${formId}-${attempt}`}
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
          onLoad={handleIframeLoad}
          style={{
            width: '100%',
            border: 'none',
            minHeight: `${minHeight}px`,
            visibility: status === 'ready' ? 'visible' : 'hidden',
            position: status === 'ready' ? 'static' : 'absolute',
          }}
          scrolling="no"
        />
      )}
    </div>
  );
}
