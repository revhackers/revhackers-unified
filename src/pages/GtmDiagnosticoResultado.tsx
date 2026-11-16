import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DiagnosticLayout } from '@/components/diagnostics/DiagnosticLayout';
import SEO from '@/components/shared/SEO';
import { GhlFormEmbed } from '@/components/shared/GhlFormEmbed';
import { GtmReport, ReportSkeleton } from '@/components/gtm/GtmReport';
import { ReportProgress } from '@/components/gtm/ReportProgress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GHL_FORMS } from '@/config/ghl';
import {
  GtmApiError,
  getGtmDiagnostic,
  unlockGtmDiagnostic,
  type GtmDiagnosticStatus,
} from '@/api/gtmDiagnostic';
import type { LeadReport } from '../../gtm-blueprint/src/report/types';

const POLL_INTERVAL_MS = 3000;
const IN_PROGRESS: Record<GtmDiagnosticStatus, boolean> = {
  coletando: true,
  aguardando_contato: false,
  gerando: true,
  pronto: false,
  falhou: false,
};

function ResultLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SEO
        title="Diagnóstico de GTM"
        description="Resultado do diagnóstico de GTM: tese, contradições e plano de 90 dias."
        noindex
      />
      <DiagnosticLayout
        title="Diagnóstico de GTM"
        subtitle="Tese, contradições e plano de 90 dias, com a fonte de cada afirmação."
      >
        <div className="space-y-12">{children}</div>
      </DiagnosticLayout>
    </>
  );
}

function MessagePanel({ message }: { message: string }) {
  return (
    <div role="alert" className="space-y-4 rounded-xl border border-zinc-200 p-6">
      <p className="text-base font-semibold text-zinc-900">{message}</p>
      <Button asChild variant="outline">
        <Link to="/diagnostico-gtm">Voltar ao diagnóstico de GTM</Link>
      </Button>
    </div>
  );
}

function Header({ report }: { report: LeadReport }) {
  return (
    <header className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Diagnóstico para</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950">{report.empresa.nome}</h2>
        <p className="text-sm text-zinc-600">
          {report.empresa.site} · Fase declarada: {report.empresa.faseDeclarada}
        </p>
      </div>
      <ReportProgress progresso={report.progresso} />
    </header>
  );
}

function ReadPanel({ report, status }: { report: LeadReport; status: GtmDiagnosticStatus }) {
  const hasSources = report.fontes.length > 0;
  const detectedSignals = report.stackDetectada.filter((signal) => signal.detectado);

  return (
    <section className="space-y-6">
      <h3 className="text-lg font-bold tracking-tight text-zinc-900">O que lemos</h3>
      {!hasSources && status === 'coletando' ? (
        <ReportSkeleton />
      ) : (
        <>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Fontes coletadas</h4>
            {hasSources ? (
              <ul className="space-y-1.5 text-sm">
                {report.fontes.map((fonte) => (
                  <li key={fonte.id} className="break-all">
                    <a
                      href={fonte.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-zinc-800 underline underline-offset-4 hover:text-black"
                    >
                      {fonte.url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-600">Nenhuma fonte pública foi lida.</p>
            )}
          </div>

          {report.lacunasDeColeta.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Lacunas de coleta</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-zinc-800">
                {report.lacunasDeColeta.map((lacuna) => (
                  <li key={lacuna}>{lacuna}</li>
                ))}
              </ul>
            </div>
          )}

          {detectedSignals.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Stack detectada na home
              </h4>
              <ul className="flex flex-wrap gap-2">
                {detectedSignals.map((signal) => (
                  <li
                    key={signal.sinal}
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-800"
                  >
                    {signal.sinal}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ContactGate({
  params,
  busy,
  failed,
  onSubmitted,
  onUnlock,
}: {
  params: Record<string, string>;
  busy: boolean;
  failed: boolean;
  onSubmitted: () => void;
  onUnlock: () => void;
}) {
  return (
    <section className="space-y-5">
      <h3 className="text-lg font-bold tracking-tight text-zinc-900">Liberar a análise</h3>
      <p className="text-sm text-zinc-700">Coleta concluída. Informe seu contato para gerar a análise.</p>
      <GhlFormEmbed
        formId={GHL_FORMS.score}
        title="Liberar análise do diagnóstico de GTM"
        params={params}
        minHeight={620}
        onSubmitted={onSubmitted}
      />
      {failed && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-600">
          <span>Não foi possível liberar a análise.</span>
          <Button variant="outline" size="sm" disabled={busy} onClick={onUnlock}>
            Tentar de novo
          </Button>
        </div>
      )}
      {import.meta.env.DEV && (
        <Button variant="outline" size="sm" disabled={busy} onClick={onUnlock}>
          Pular captura (dev)
        </Button>
      )}
    </section>
  );
}

export default function GtmDiagnosticoResultado() {
  const { id = '' } = useParams<{ id: string }>();
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: ['gtm-diagnostic', id],
    queryFn: () => getGtmDiagnostic(id),
    enabled: id.length > 0,
    refetchInterval: (query) =>
      query.state.data && IN_PROGRESS[query.state.data.status] ? POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: false,
    retry: (failures, error) => failures < 2 && !(error instanceof GtmApiError && error.status < 500),
  });

  const [unlocking, setUnlocking] = useState(false);
  const [unlockFailed, setUnlockFailed] = useState(false);

  const unlock = useCallback(async () => {
    setUnlocking(true);
    setUnlockFailed(false);
    try {
      await unlockGtmDiagnostic(id);
      await refetch();
    } catch {
      setUnlockFailed(true);
    } finally {
      setUnlocking(false);
    }
  }, [id, refetch]);

  const handleSubmitted = useCallback(() => {
    void unlock();
  }, [unlock]);

  const faseDeclarada = data?.report.empresa.faseDeclarada ?? '';
  const gateParams = useMemo(
    () => ({ rh_diagnostic_type: 'gtm', rh_diagnostic_category: faseDeclarada }),
    [faseDeclarada],
  );

  if (!id || (isError && !data)) {
    return (
      <ResultLayout>
        <MessagePanel message="Não foi possível carregar este diagnóstico." />
      </ResultLayout>
    );
  }

  if (isPending || !data) {
    return (
      <ResultLayout>
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </ResultLayout>
    );
  }

  const { report, status } = data;

  if (status === 'falhou') {
    const message =
      data.errorCode === 'site_inacessivel'
        ? 'Não conseguimos ler o site informado.'
        : 'A análise falhou. Tente de novo.';
    return (
      <ResultLayout>
        <Header report={report} />
        <MessagePanel message={message} />
      </ResultLayout>
    );
  }

  return (
    <ResultLayout>
      <Header report={report} />
      <ReadPanel report={report} status={status} />
      {status === 'aguardando_contato' && (
        <ContactGate
          params={gateParams}
          busy={unlocking}
          failed={unlockFailed}
          onSubmitted={handleSubmitted}
          onUnlock={() => void unlock()}
        />
      )}
      <GtmReport report={report} status={status} />
    </ResultLayout>
  );
}
