/**
 * analyticsEvents.ts
 *
 * Camada nova de analytics de produto, sem PII por construcao.
 * Nao substitui o GTM remoto nem altera qualquer config GHL.
 * Nenhum evento carrega nome, email, telefone, CPF, CNPJ ou texto livre.
 *
 * Uso:
 *   configureAnalytics({ sink: new DataLayerSink() }); // producao (apos checklist)
 *   trackAnalyticsEvent({ event: 'diagnostic_started', diagnosticType: 'growth' });
 *
 * Padrao: sink noop (nada sai do browser) ate configuracao explicita.
 */

export type AnalyticsEventName =
  | 'diagnostic_started'
  | 'diagnostic_step_completed'
  | 'diagnostic_completed'
  | 'diagnostic_result_viewed'
  | 'lead_submitted'
  | 'cta_clicked';

export type DiagnosticType = 'growth' | 'revenue' | 'founder' | 'site';
export type ScoreBand = '0-25' | '26-50' | '51-75' | '76-100';
export type FormKind = 'diagnosis' | 'contact' | 'material' | 'newsletter' | 'calculator' | 'rei';

export interface AnalyticsEvent {
  event: AnalyticsEventName;
  diagnosticType?: DiagnosticType;
  stepId?: string;
  stepIndex?: number;
  stepCount?: number;
  scoreBand?: ScoreBand;
  formKind?: FormKind;
  source?: string;
  ctaId?: string;
  placement?: string;
  sessionId?: string;
  timestamp?: string;
}

/** Chaves que nunca podem trafegar em analytics. */
const PII_KEYS: Record<string, true> = {
  email: true, corporateEmail: true, name: true, fullName: true, firstName: true, lastName: true,
  phone: true, whatsapp: true, cpf: true, cnpj: true, linkedin: true, message: true, company: true,
  website: true, address: true, password: true, token: true,
};

/**
 * Remove chaves identificadoras de um objeto antes do envio.
 * Defesa em profundidade: os tipos acima ja nao possuem esses campos.
 * Generica para preservar o tipo do chamador sem casts inline.
 */
export function scrubPII<T extends object>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (PII_KEYS[key]) continue;
    out[key] = entry;
  }
  return out as T;
}
export function toScoreBand(score: number): ScoreBand {
  if (score <= 25) return '0-25';
  if (score <= 50) return '26-50';
  if (score <= 75) return '51-75';
  return '76-100';
}

export interface AnalyticsSink {
  track(event: AnalyticsEvent): void;
}

/** Sink padrao: descarta tudo. Nenhum evento sai do browser sem opt-in. */
export class NoopAnalyticsSink implements AnalyticsSink {
  track(_event: AnalyticsEvent): void {
    // intencionalmente vazio
  }
}

/**
 * Sink mockado para testes e desenvolvimento. Rotulado como mock no nome
 * e sem qualquer transporte real.
 */
export class MockAnalyticsSink implements AnalyticsSink {
  readonly isMock = true;
  readonly events: AnalyticsEvent[] = [];

  track(event: AnalyticsEvent): void {
    this.events.push(scrubPII({ ...event, timestamp: event.timestamp ?? new Date().toISOString() }));
  }

  clear(): void {
    this.events.length = 0;
  }

  ofType(name: AnalyticsEventName): AnalyticsEvent[] {
    return this.events.filter((entry) => entry.event === name);
  }
}

/** Sink que espelha eventos no dataLayer (GTM), sem PII. */
export class DataLayerSink implements AnalyticsSink {
  track(event: AnalyticsEvent): void {
    try {
      if (typeof window === 'undefined') return;
      if (!('dataLayer' in window)) return;
      const layer: unknown = window.dataLayer;
      if (!Array.isArray(layer)) return;
      layer.push(scrubPII({ ...event, timestamp: event.timestamp ?? new Date().toISOString() }));
    } catch {
      // analytics nunca quebra o fluxo principal
    }
  }
}

export class CompositeAnalyticsSink implements AnalyticsSink {
  constructor(private readonly sinks: AnalyticsSink[]) {}

  track(event: AnalyticsEvent): void {
    for (const sink of this.sinks) {
      try {
        sink.track(event);
      } catch {
        // um sink com falha nao bloqueia os demais
      }
    }
  }
}

let activeSink: AnalyticsSink = new NoopAnalyticsSink();

export function configureAnalytics(options: { sink: AnalyticsSink }): void {
  activeSink = options.sink;
}

export function resetAnalytics(): void {
  activeSink = new NoopAnalyticsSink();
}

export function trackAnalyticsEvent(event: AnalyticsEvent): void {
  try {
    activeSink.track(event);
  } catch {
    // analytics nunca quebra o fluxo principal
  }
}
