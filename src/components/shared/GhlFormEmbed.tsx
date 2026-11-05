import React, { useEffect } from 'react';
import { GHL_EMBED_BASE, GHL_FORM_EMBED_SCRIPT } from '../../config/ghl';
import { getPersistedUtmParams } from '../../utils/utm';

interface GhlFormEmbedProps {
  formId: string;
  params?: Record<string, string>;
  title: string;
  minHeight?: number;
  onSubmitted?: () => void;
}

export const GhlFormEmbed: React.FC<GhlFormEmbedProps> = ({
  formId,
  params = {},
  title,
  minHeight = 620,
  onSubmitted,
}) => {
  if (!formId || formId.startsWith('PLACEHOLDER')) {
    console.error('[GhlFormEmbed] formId ausente ou inválido');
    return null;
  }

  useEffect(() => {
    if (!document.getElementById('ghl-form-embed-script')) {
      const script = document.createElement('script');
      script.id = 'ghl-form-embed-script';
      script.src = GHL_FORM_EMBED_SCRIPT;
      script.async = true;
      document.body.appendChild(script);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== GHL_EMBED_BASE) return;
      const data = event.data;
      const isSubmitted =
        (Array.isArray(data) && data[0] === 'FORM_SUBMITTED') ||
        data?.type === 'FORM_SUBMITTED';

      if (isSubmitted && onSubmitted) {
        onSubmitted();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onSubmitted]);

  const utmParams = getPersistedUtmParams();
  const searchParams = new URLSearchParams({
    ...utmParams,
    ...params,
  });

  const iframeSrc = `${GHL_EMBED_BASE}/widget/form/${formId}?${searchParams.toString()}`;
  const iframeId = `inline-${formId}`;

  return (
    <div style={{ width: '100%' }}>
      <iframe
        id={iframeId}
        src={iframeSrc}
        data-form-id={formId}
        data-layout-iframe-id={iframeId}
        data-layout="{'id':'INLINE'}"
        data-trigger-type="alwaysShow"
        data-activation-type="alwaysActivated"
        data-deactivation-type="neverDeactivate"
        style={{ width: '100%', border: 'none', minHeight: `${minHeight}px` }}
        title={title}
      />
    </div>
  );
};
