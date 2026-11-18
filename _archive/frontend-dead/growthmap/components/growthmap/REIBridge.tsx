import React, { useState } from 'react';
import { Link2 } from 'lucide-react';
import type { REIConnection, GeneratedAction } from '@/types/growthmap';

interface REIBridgeProps {
  connections: REIConnection[];
  actions?: GeneratedAction[];
  onAddToSprint?: () => void;
}

const DOT_COLOR: Record<REIConnection['type'], string> = {
  critical: 'bg-red-400',
  warning:  'bg-yellow-400',
  ok:       'bg-lime-400',
};

const PRIORITY_STYLE: Record<string, string> = {
  high:  'bg-red-400/10 text-red-400',
  medium: 'bg-yellow-400/10 text-yellow-400',
  alta:  'bg-red-400/10 text-red-400',
  média: 'bg-yellow-400/10 text-yellow-400',
  media: 'bg-yellow-400/10 text-yellow-400',
  low:   'bg-zinc-800 text-zinc-400',
  baixa: 'bg-zinc-800 text-zinc-400',
};

export default function REIBridge({ connections, actions, onAddToSprint }: REIBridgeProps) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const hasActions = Array.isArray(actions) && actions.length > 0;

  return (
    <div className={`grid gap-4 mt-6 ${hasActions ? 'grid-cols-5' : 'grid-cols-1'}`}>
      {/* Left: Diagnóstico Cruzado */}
      <div className={`${hasActions ? 'col-span-3' : 'col-span-1'} bg-[#13131e] border border-white/7 rounded-xl p-5 flex flex-col`}>
        <div className="mb-4">
          <h3 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Diagnóstico Cruzado</h3>
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-zinc-300">REI</span>
            <span className="text-zinc-600">×</span>
            <span className="text-lime-400">GrowthMap</span>
          </h4>
        </div>

        {connections.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <Link2 size={24} className="text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">Nenhum dado do REI conectado.</p>
            <p className="text-zinc-600 text-xs mt-1">Preencha o REI para ver insights calibrados aqui.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-0 divide-y divide-white/5">
              {connections.map((conn, i) => (
                <div key={i} className="flex items-start gap-3 py-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${DOT_COLOR[conn.type]}`} />
                  <div className="min-w-0">
                    <span className="font-semibold text-zinc-200 text-sm">{conn.label}: </span>
                    <span className="font-bold text-white text-sm">{conn.value}</span>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{conn.insight}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
              <Link2 size={12} className="text-zinc-600" />
              <span className="text-xs text-zinc-600 italic">
                {connections.length} {connections.length === 1 ? 'dado do REI conectado' : 'dados do REI conectados'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right: Ações Geradas */}
      {hasActions && (
        <div className="col-span-2 bg-[#13131e] border border-white/7 rounded-xl p-5 flex flex-col">
          <h3 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-4">Ações Geradas</h3>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {actions!.map((action, i) => {
              const priorityKey = action.priority?.toLowerCase() ?? 'low';
              const priorityStyle = PRIORITY_STYLE[priorityKey] ?? 'bg-zinc-800 text-zinc-400';
              return (
                <label key={i} className="flex items-start gap-3 cursor-pointer group py-1">
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={() => setChecked(prev => ({ ...prev, [i]: !prev[i] }))}
                    className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-lime-400 focus:ring-lime-400/20 focus:ring-offset-0 cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm leading-snug transition-colors ${checked[i] ? 'line-through text-zinc-600' : 'text-zinc-200 group-hover:text-white'}`}>
                      {action.title}
                    </span>
                    <div className="mt-1">
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${priorityStyle}`}>
                        {action.priority}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <button
            onClick={onAddToSprint}
            className="w-full mt-4 bg-lime-400 hover:bg-lime-300 text-black font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            Adicionar ao Sprint atual →
          </button>
        </div>
      )}
    </div>
  );
}
