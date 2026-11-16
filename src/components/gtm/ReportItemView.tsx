import type { LeadReport, ReportItem } from '../../../gtm-blueprint/src/report/types';

type Fonte = LeadReport['fontes'][number];

interface ReportItemViewProps {
  item: ReportItem;
  fontes: LeadReport['fontes'];
}

const BADGE: Record<ReportItem['tipo'], { label: string; className: string }> = {
  OBSERVADO: { label: 'Observado no site', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  HIPOTESE: { label: 'Hipótese', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  RECOMENDACAO: { label: 'Recomendação', className: 'border-zinc-200 bg-zinc-100 text-zinc-700' },
};

export function ReportItemView({ item, fontes }: ReportItemViewProps) {
  const badge = BADGE[item.tipo];
  const links = item.fontes
    .map((id) => fontes.find((fonte) => fonte.id === id))
    .filter((fonte): fonte is Fonte => fonte !== undefined);

  return (
    <div className="space-y-2">
      <span
        className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${badge.className}`}
      >
        {badge.label}
      </span>
      <p className="text-sm leading-relaxed text-zinc-900">{item.texto}</p>
      {item.tipo === 'HIPOTESE' && item.comoValidar && (
        <p className="text-sm text-zinc-600">
          <span className="font-semibold text-zinc-800">Como validar: </span>
          {item.comoValidar}
        </p>
      )}
      {links.length > 0 && (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-zinc-500">
          <span>Fontes:</span>
          {links.map((fonte) =>
            /^https?:\/\//i.test(fonte.url) ? (
              <a
                key={fonte.id}
                href={fonte.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-medium text-zinc-700 underline underline-offset-4 hover:text-black"
              >
                {fonte.url}
              </a>
            ) : (
              <span key={fonte.id} className="break-all">
                {fonte.url}
              </span>
            ),
          )}
        </p>
      )}
    </div>
  );
}
