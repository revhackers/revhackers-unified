import { useEffect, useRef, useState } from 'react';

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptRequest: Promise<void> | null = null;

/** Carrega o script do Turnstile uma única vez por página. */
function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptRequest) {
    scriptRequest = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        scriptRequest = null;
        reject(new Error('turnstile_script_failed'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptRequest;
}

interface TurnstileWidgetProps {
  siteKey: string;
  /** Recebe o token ao resolver e `null` quando expira ou falha. Deve ser estável (useCallback). */
  onToken: (token: string | null) => void;
}

export function TurnstileWidget({ siteKey, onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const visibleState = siteKey ? loadState : 'error';

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    let widgetId: string | null = null;

    loadTurnstileScript()
      .then(() => {
        const api = window.turnstile;
        if (cancelled) return;
        if (!api || !containerRef.current) {
          setLoadState('error');
          return;
        }
        widgetId = api.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => {
            onToken(null);
            setLoadState('error');
          },
        });
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => {
      cancelled = true;
      if (widgetId !== null) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, onToken]);

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="min-h-[65px]" />
      {visibleState === 'loading' && <p className="text-xs text-zinc-500">Carregando verificação…</p>}
      {visibleState === 'error' && (
        <p role="alert" className="text-xs text-red-600">
          Verificação indisponível. Recarregue a página.
        </p>
      )}
    </div>
  );
}
