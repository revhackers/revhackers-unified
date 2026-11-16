import type { ReactNode } from 'react';
import { GhlBookingEmbed } from '@/components/shared/GhlBookingEmbed';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { GHL_CALENDARS } from '@/config/ghl';
import type { GtmDiagnosticStatus } from '@/api/gtmDiagnostic';
import type {
  LeadReport,
  ReportBlock,
  ReportItem,
  ReportProximoPasso,
  ReportSection,
  ReportUnitEconomics,
} from '../../../gtm-blueprint/src/report/types';
import { ReportItemView } from './ReportItemView';

type Fontes = LeadReport['fontes'];

const UNAVAILABLE_MESSAGE = 'Seção indisponível nesta execução.';
const moneyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const decimalFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatOrCollect(value: number | null, format: (value: number) => string): string {
  return value === null ? 'A coletar' : format(value);
}

export function ReportSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function Pending({ ready, unavailable, children }: { ready: boolean; unavailable: boolean; children: ReactNode }) {
  if (ready) return <>{children}</>;
  return unavailable ? <p className="text-sm text-zinc-500">{UNAVAILABLE_MESSAGE}</p> : <ReportSkeleton />;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-bold tracking-tight text-zinc-900">{title}</h3>
      {children}
    </section>
  );
}

function ItemList({ itens, fontes }: { itens: ReportItem[]; fontes: Fontes }) {
  return (
    <ul className="space-y-4">
      {itens.map((item, index) => (
        <li key={index}>
          <ReportItemView item={item} fontes={fontes} />
        </li>
      ))}
    </ul>
  );
}

function BlockItems({ bloco, fontes }: { bloco: ReportBlock; fontes: Fontes }) {
  return (
    <div className="space-y-3">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{bloco.rotulo}</h5>
      <ItemList itens={bloco.itens} fontes={fontes} />
    </div>
  );
}

function NextSteps({ passos }: { passos: ReportProximoPasso[] }) {
  return (
    <div className="space-y-2">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Próximos passos</h5>
      <ul className="space-y-2 text-sm text-zinc-800">
        {passos.map((passo, index) => (
          <li
            key={index}
            className="flex flex-col gap-1 border-l-2 border-zinc-200 pl-3 sm:flex-row sm:justify-between sm:gap-4"
          >
            <span>{passo.acao}</span>
            <span className="shrink-0 text-xs text-zinc-500">
              {passo.responsavel} · {passo.prazoDias} dias
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnitEconomicsSummary({ ue }: { ue: ReportUnitEconomics }) {
  const rows: Array<[string, string]> = [
    ['ARPU mensal', formatOrCollect(ue.arpuMensal, (value) => moneyFormat.format(value))],
    ['CAC', formatOrCollect(ue.cac, (value) => moneyFormat.format(value))],
    ['Churn mensal', formatOrCollect(ue.churnMensal, (value) => percentFormat.format(value))],
    ['Ciclo de vendas', formatOrCollect(ue.cicloVendasDias, (value) => `${decimalFormat.format(value)} dias`)],
    ['LTV', formatOrCollect(ue.ltv, (value) => moneyFormat.format(value))],
    ['Payback', formatOrCollect(ue.paybackMeses, (value) => `${decimalFormat.format(value)} meses`)],
    ['LTV / CAC', formatOrCollect(ue.ltvCac, (value) => `${decimalFormat.format(value)}×`)],
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">Situação dos dados: {ue.status}</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className="text-sm font-semibold text-zinc-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SectionBody({ section, fontes, closed }: { section: ReportSection; fontes: Fontes; closed: boolean }) {
  const ready = section.status === 'pronto';
  return (
    <Pending ready={ready} unavailable={section.status === 'indisponivel' || (closed && !ready)}>
      <div className="space-y-6">
        {section.decisao && (
          <p className="rounded-lg bg-zinc-50 p-4 text-sm font-medium text-zinc-900">{section.decisao}</p>
        )}
        {section.blocos.map((bloco, index) => (
          <BlockItems key={`${index}-${bloco.rotulo}`} bloco={bloco} fontes={fontes} />
        ))}
        {section.proximosPassos.length > 0 && <NextSteps passos={section.proximosPassos} />}
      </div>
    </Pending>
  );
}

interface GtmReportProps {
  report: LeadReport;
  status: GtmDiagnosticStatus;
}

/** Seções 4 a 11 da página de resultado: tese até agendamento. */
export function GtmReport({ report, status }: GtmReportProps) {
  const closed = status === 'pronto';
  const fontes = report.fontes;
  const dossie = report.secoes.find((section) => section.id === 'dossie');
  const dossieReady = dossie?.status === 'pronto';
  const dossieFailed = dossie?.status === 'indisponivel';

  return (
    <div className="space-y-12">
      <Block title="Tese">
        <Pending ready={report.tese !== null} unavailable={closed || dossieFailed}>
          <p className="text-lg leading-relaxed text-zinc-900">{report.tese}</p>
        </Pending>
      </Block>

      <Block title="O que você declara × o que o site prova">
        <Pending ready={dossieReady} unavailable={closed || dossieFailed}>
          {report.contradicoes.length > 0 ? (
            <ItemList itens={report.contradicoes} fontes={fontes} />
          ) : (
            <p className="text-sm text-zinc-600">Nenhuma contradição encontrada nas fontes lidas.</p>
          )}
        </Pending>
      </Block>

      <Block title="3 achados que custam receita">
        <Pending ready={report.achados.length > 0} unavailable={closed}>
          <ol className="space-y-5">
            {report.achados.map((achado, index) => (
              <li key={index} className="space-y-3 rounded-xl border border-zinc-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Achado {index + 1}</p>
                <h4 className="text-base font-bold text-zinc-900">{achado.titulo}</h4>
                <dl className="space-y-2 text-sm text-zinc-800">
                  <div>
                    <dt className="font-semibold">Impacto na receita</dt>
                    <dd>{achado.impacto}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Custo de não agir</dt>
                    <dd>{achado.custoDeInacao}</dd>
                  </div>
                </dl>
                <ReportItemView item={achado.base} fontes={fontes} />
              </li>
            ))}
          </ol>
        </Pending>
      </Block>

      <Block title="Decisão desta semana">
        <Pending ready={report.decisaoDaSemana !== null} unavailable={closed}>
          <p className="rounded-xl bg-zinc-950 p-5 text-base font-semibold text-white">{report.decisaoDaSemana}</p>
        </Pending>
      </Block>

      <Block title="Plano de 90 dias">
        <Pending ready={report.plano90Dias.length > 0} unavailable={closed}>
          <div className="space-y-10">
            {report.plano90Dias.map((onda) => (
              <div key={onda.onda} className="space-y-4">
                <h4 className="text-base font-bold text-zinc-900">{onda.rotulo}</h4>
                <ReportItemView item={onda.foco} fontes={fontes} />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <thead className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="py-2 pr-4 font-semibold">Iniciativa</th>
                        <th className="py-2 pr-4 font-semibold">ICE</th>
                        <th className="py-2 pr-4 font-semibold">Responsável</th>
                        <th className="py-2 font-semibold">Prazo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onda.iniciativas.map((iniciativa, index) => (
                        <tr key={index} className="border-b border-zinc-100 align-top">
                          <td className="space-y-2 py-3 pr-4">
                            <p className="font-semibold text-zinc-900">{iniciativa.titulo}</p>
                            <ReportItemView item={iniciativa.descricao} fontes={fontes} />
                          </td>
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-zinc-900">{decimalFormat.format(iniciativa.ice)}</p>
                            <p className="text-xs text-zinc-500">
                              I {iniciativa.impacto} · C {iniciativa.confianca} · F {iniciativa.facilidade}
                            </p>
                          </td>
                          <td className="py-3 pr-4 text-zinc-800">{iniciativa.responsavel}</td>
                          <td className="py-3 text-zinc-800">{iniciativa.prazoDias} dias</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Pending>
      </Block>

      <Block title="Dados que faltam">
        <Pending ready={closed} unavailable={false}>
          {report.dadosAColetar.length > 0 ? (
            <ul className="list-inside list-disc space-y-1 text-sm text-zinc-800">
              {report.dadosAColetar.map((dado) => (
                <li key={dado}>{dado}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600">Nenhum dado pendente nas fontes lidas.</p>
          )}
          {report.unitEconomics && <UnitEconomicsSummary ue={report.unitEconomics} />}
        </Pending>
      </Block>

      <Block title="Aprofundar">
        <Accordion type="multiple" className="w-full">
          {report.secoes.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="text-left text-sm text-zinc-900">{section.titulo}</AccordionTrigger>
              <AccordionContent>
                <SectionBody section={section} fontes={fontes} closed={closed} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Block>

      {closed && (
        <Block title="Agendar conversa com a RevHackers">
          <GhlBookingEmbed
            calendarId={GHL_CALENDARS.diagnostico}
            title="Agendar conversa com a RevHackers"
            minHeight={680}
          />
        </Block>
      )}
    </div>
  );
}
