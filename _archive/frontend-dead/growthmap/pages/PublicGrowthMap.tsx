import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, AlertCircle, Loader2, Share2, Sparkles, ExternalLink } from 'lucide-react';

interface PublicCompetitor {
  id: string; name: string; website: string | null; segment: string | null; is_active: boolean;
}

interface PublicShareData {
  share_token: string; tenant_id: string; project_id: string;
  created_at: string; expires_at: string | null; competitors: PublicCompetitor[];
}

const API_BASE = (import.meta.env.VITE_GCP_API_URL || 'http://localhost:8080').replace(/\/$/, '');

export default function PublicGrowthMap() {
  const { share_token } = useParams<{ share_token?: string }>();
  const [data, setData] = useState<PublicShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!share_token) { setError('Link de compartilhamento inválido.'); setLoading(false); return; }
    fetch(`${API_BASE}/v1/intelligence/share/${share_token}`)
      .then(async (res) => {
        if (res.status === 404) setError('Este link de compartilhamento é inválido ou foi revogado.');
        else if (res.status === 410) setError('Este link de compartilhamento expirou.');
        else if (!res.ok) setError('Erro ao carregar dados compartilhados.');
        else { const json = (await res.json()) as { data: PublicShareData }; setData(json.data); }
      })
      .catch(() => setError('Erro de conexão. Tente novamente.'))
      .finally(() => setLoading(false));
  }, [share_token]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-400" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Link Indisponível</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold text-white">GrowthMap — Inteligência Estratégica</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Relatório gerado em {new Date(data.created_at).toLocaleString('pt-BR')}
            {data.expires_at && ` • Expira em ${new Date(data.expires_at).toLocaleString('pt-BR')}`}
          </p>
          <button
            onClick={() => { navigator.clipboard?.writeText(window.location.href); alert('Link copiado!'); }}
            className="mt-3 inline-flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar este relatório
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-sm text-slate-400 font-medium">Concorrentes Analisados</div>
            <div className="text-3xl font-bold text-white mt-2">{data.competitors.length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-sm text-slate-400 font-medium">Ativos</div>
            <div className="text-3xl font-bold text-emerald-400 mt-2">{data.competitors.filter((c) => c.is_active).length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-sm text-slate-400 font-medium">Com Website</div>
            <div className="text-3xl font-bold text-blue-400 mt-2">{data.competitors.filter((c) => c.website).length}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Concorrentes Monitorados
          </h2>
          {data.competitors.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Nenhum concorrente cadastrado.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.competitors.map((c) => (
                <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-white">{c.name}</div>
                    {c.is_active ? (
                      <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded">Ativo</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">Inativo</span>
                    )}
                  </div>
                  {c.segment && <div className="text-xs text-slate-400 mb-2">{c.segment}</div>}
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Visitar site
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-slate-600 text-xs pt-8 border-t border-slate-800">
          Gerado por <strong>RevHackers GrowthMap</strong> • Powered by GCP + FonteData
        </div>
      </div>
    </div>
  );
}
