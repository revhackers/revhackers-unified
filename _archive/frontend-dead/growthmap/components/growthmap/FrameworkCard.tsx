import React, { useState } from 'react';
import { RefreshCw, Link2, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import type { FrameworkResult } from '@/types/growthmap';

interface FrameworkCardProps {
  framework: FrameworkResult;
  onRegenerate: (e: React.MouseEvent) => void;
  onClick: () => void;
}

const PILLAR_LABELS: Record<string, string> = {
  inteligencia_estrategica: 'Inteligência',
  concepcao_valor: 'Concepção de Valor',
  mvp_validacao: 'MVP & Validação',
  escalabilidade: 'Escalabilidade',
};

function PreviewContent({ framework }: { framework: FrameworkResult }) {
  const { id, data } = framework;

  if (id === 'north_star' && data?.metric_name) {
    return <p className="text-sm font-semibold text-lime-400 truncate">{data.metric_name}</p>;
  }
  if (id === 'tam_sam_som' && data?.tam?.label) {
    return (
      <div className="flex gap-4">
        <div>
          <div className="text-[10px] text-zinc-500 uppercase">TAM</div>
          <div className="text-sm font-bold text-zinc-300">{data.tam.label}</div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-500 uppercase">SOM</div>
          <div className="text-sm font-bold text-lime-400">{data.som?.label ?? '—'}</div>
        </div>
      </div>
    );
  }
  if (id === 'aarrr' && data?.retencao?.status) {
    const statusColor: Record<string, string> = { critico: 'text-red-400', alerta: 'text-yellow-400', ok: 'text-emerald-400', meta: 'text-zinc-400' };
    return (
      <div className="flex gap-2 flex-wrap">
        {(['aquisicao', 'ativacao', 'retencao'] as const).map(s => {
          const d = data[s];
          if (!d) return null;
          return (
            <span key={s} className={`text-xs font-medium ${statusColor[d.status] ?? 'text-zinc-400'}`}>
              {s.charAt(0).toUpperCase()} {d.status}
            </span>
          );
        })}
      </div>
    );
  }
  if (id === 'swot' && data?.forcas?.length) {
    return <p className="text-sm text-zinc-400 line-clamp-2">{data.forcas[0]?.text}</p>;
  }
  if (id === 'usp' && data?.statement) {
    return <p className="text-sm text-zinc-400 line-clamp-2">{data.statement}</p>;
  }
  if (id === 'ice_score' && data?.initiatives?.length) {
    const top = data.initiatives[0];
    return <p className="text-sm text-zinc-300">Top: <span className="font-medium text-white">{top.name}</span> — ICE {top.score?.toFixed(1)}</p>;
  }
  // Generic fallback
  const firstKey = data ? Object.keys(data)[0] : null;
  if (firstKey && typeof data[firstKey] === 'string') {
    return <p className="text-xs text-zinc-400 line-clamp-2">{data[firstKey]}</p>;
  }
  return null;
}

export default function FrameworkCard({ framework, onRegenerate, onClick }: FrameworkCardProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { status } = framework;
  const isDone = status === 'done';
  const isGenerating = status === 'generating';
  const isError = status === 'error';
  const isPending = status === 'pending';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={[
        'relative flex flex-col bg-[#13131e] rounded-xl p-5 cursor-pointer group select-none',
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-xl',
        isDone
          ? 'border border-emerald-400/10 hover:border-lime-400/30 hover:shadow-lime-400/5'
          : isError
          ? 'border border-red-500/40 shadow-[0_0_0_1px_rgba(248,113,113,0.2)] hover:border-red-400/60'
          : isGenerating
          ? 'border border-blue-400/20 hover:border-blue-400/30'
          : 'border border-white/7 hover:border-lime-400/20 hover:shadow-lime-400/5',
      ].join(' ')}
    >
      {/* Top row */}
      <div className="flex justify-between items-start gap-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-lime-400/30 text-lime-400/70 font-medium uppercase tracking-wider shrink-0">
          {PILLAR_LABELS[framework.pillar] ?? framework.pillar}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status chip */}
          {isDone && (
            <span className="flex items-center gap-1 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-[10px] px-2 py-0.5 rounded-full font-medium">
              <CheckCircle2 size={10} /> Gerado
            </span>
          )}
          {isGenerating && (
            <span className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full animate-pulse font-medium">
              <Loader2 size={10} className="animate-spin" /> Gerando...
            </span>
          )}
          {isError && (
            <span className="flex items-center gap-1 bg-red-400/10 text-red-400 border border-red-400/20 text-[10px] px-2 py-0.5 rounded-full font-medium">
              <AlertCircle size={10} /> Erro
            </span>
          )}
          {isPending && (
            <span className="flex items-center gap-1 bg-zinc-800/50 text-zinc-500 text-[10px] px-2 py-0.5 rounded-full font-medium">
              <Clock size={10} /> Pendente
            </span>
          )}

        </div>
      </div>
      
      {/* Regenerate button — visible on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onRegenerate(e); }}
        disabled={framework.status === 'generating'}
        title="Regenerar este framework com dados atualizados"
        aria-label="Regenerar análise"
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800/50 disabled:opacity-30 transition-colors"
      >
        {framework.status === 'generating' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
      </button>

      {/* Title + subtitle */}
      <h3 className="text-base font-semibold text-white mt-3 leading-tight">{framework.title}</h3>
      <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{framework.subtitle}</p>

      {/* Content preview area */}
      <div className="mt-3 min-h-[48px] flex items-start">
        {(isGenerating || isPending) && (
          <div className="w-full space-y-2">
            <div className="h-3 bg-zinc-800 rounded animate-pulse w-full" />
            <div className="h-3 bg-zinc-800 rounded animate-pulse w-4/5" />
          </div>
        )}
        {isDone && framework.data && <PreviewContent framework={framework} />}
        {isError && (
          <p className="text-xs text-red-400/70">Erro ao gerar. Clique em regenerar.</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
        <div>
          {(framework.rei_connections?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
              <Link2 size={11} />
              {framework.rei_connections!.length} {framework.rei_connections!.length === 1 ? 'dado' : 'dados'} do REI
            </span>
          )}
        </div>
        {isDone && (
          <span className="text-[10px] text-zinc-600">
            {framework.generated_at
              ? new Date(framework.generated_at).toLocaleDateString('pt-BR')
              : ''}
          </span>
        )}
      </div>
    </div>
  );
}
