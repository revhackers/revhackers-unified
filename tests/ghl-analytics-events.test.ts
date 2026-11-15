import { describe, expect, test, beforeEach, vi } from 'vitest';
import {
  CompositeAnalyticsSink,
  DataLayerSink,
  MockAnalyticsSink,
  NoopAnalyticsSink,
  configureAnalytics,
  resetAnalytics,
  scrubPII,
  toScoreBand,
  trackAnalyticsEvent,
} from '@/lib/analyticsEvents';

beforeEach(() => {
  resetAnalytics();
});

describe('toScoreBand', () => {
  test('mapeia faixas nos limites', () => {
    expect(toScoreBand(0)).toBe('0-25');
    expect(toScoreBand(25)).toBe('0-25');
    expect(toScoreBand(26)).toBe('26-50');
    expect(toScoreBand(75)).toBe('51-75');
    expect(toScoreBand(76)).toBe('76-100');
    expect(toScoreBand(100)).toBe('76-100');
  });
});

describe('scrubPII', () => {
  test('remove chaves identificadoras e mantem o resto', () => {
    const out = scrubPII({
      event: 'cta_clicked',
      email: 'alguem@exemplo.com',
      phone: '+55 11 99999-9999',
      cnpj: '12.345.678/0001-99',
      message: 'texto livre',
      ctaId: 'hero-agendar',
    });
    expect(out).toEqual({ event: 'cta_clicked', ctaId: 'hero-agendar' });
  });
});

describe('sinks', () => {
  test('padrao noop: rastrear nao faz nada e nao quebra', () => {
    expect(() =>
      trackAnalyticsEvent({ event: 'diagnostic_started', diagnosticType: 'growth' }),
    ).not.toThrow();
  });

  test('mock rotulado registra eventos com timestamp e filtra por tipo', () => {
    const sink = new MockAnalyticsSink();
    expect(sink.isMock).toBe(true);
    configureAnalytics({ sink });
    trackAnalyticsEvent({ event: 'diagnostic_started', diagnosticType: 'growth' });
    trackAnalyticsEvent({ event: 'diagnostic_step_completed', diagnosticType: 'growth', stepId: 's1', stepIndex: 0, stepCount: 5 });
    trackAnalyticsEvent({ event: 'diagnostic_completed', diagnosticType: 'growth', scoreBand: '51-75' });
    trackAnalyticsEvent({ event: 'diagnostic_result_viewed', diagnosticType: 'growth', scoreBand: '51-75' });
    trackAnalyticsEvent({ event: 'lead_submitted', formKind: 'diagnosis', source: 'site' });
    trackAnalyticsEvent({ event: 'cta_clicked', ctaId: 'hero-agendar', placement: 'hero' });
    expect(sink.events).toHaveLength(6);
    expect(sink.ofType('diagnostic_completed')).toHaveLength(1);
    for (const entry of sink.events) expect(entry.timestamp).toBeTruthy();
  });

  test('mock nunca expoe PII mesmo se o chamador injetar campo extra', () => {
    const sink = new MockAnalyticsSink();
    configureAnalytics({ sink });
    trackAnalyticsEvent({ event: 'cta_clicked', ctaId: 'x', email: 'vazamento@exemplo.com' } as never);
    expect(sink.events[0]).not.toHaveProperty('email');
  });

  test('composite isola falha de um sink sem bloquear os demais', () => {
    const good = new MockAnalyticsSink();
    const failing = { track: () => { throw new Error('sink quebrado'); } };
    const composite = new CompositeAnalyticsSink([failing, good]);
    expect(() => composite.track({ event: 'cta_clicked', ctaId: 'x' })).not.toThrow();
    expect(good.events).toHaveLength(1);
  });

  test('noop nunca registra nada', () => {
    configureAnalytics({ sink: new NoopAnalyticsSink() });
    expect(() => trackAnalyticsEvent({ event: 'cta_clicked', ctaId: 'x' })).not.toThrow();
  });

  test('dataLayer recebe evento higienizado sem PII', () => {
    const layer: Array<Record<string, unknown>> = [];
    vi.stubGlobal('dataLayer', undefined);
    Object.defineProperty(window, 'dataLayer', { value: layer, configurable: true, writable: true });
    try {
      const sink = new DataLayerSink();
      sink.track({ event: 'diagnostic_completed', diagnosticType: 'site', scoreBand: '26-50' });
      expect(layer).toHaveLength(1);
      expect(layer[0]).toMatchObject({ event: 'diagnostic_completed', scoreBand: '26-50' });
      expect(layer[0]).not.toHaveProperty('email');
    } finally {
      Reflect.deleteProperty(window, 'dataLayer');
      vi.unstubAllGlobals();
    }
  });

  test('dataLayer ausente: sink silencioso, sem throw', () => {
    Reflect.deleteProperty(window, 'dataLayer');
    expect(() => new DataLayerSink().track({ event: 'cta_clicked', ctaId: 'x' })).not.toThrow();
  });
});
