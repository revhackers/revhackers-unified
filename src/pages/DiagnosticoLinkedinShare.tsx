import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Linkedin, Lock, Share2 } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import SEO from '@/components/shared/SEO';
import ModernTechnicalBackground from '@/components/shared/ModernTechnicalBackground';
import { DIMENSOES_META, faixaDaMedia } from '@/lib/linkedin/linkedinAuthorityEngine';
import { lerPreviaCompartilhada } from '@/lib/linkedin/linkedinDiagnosticSession';

/**
 * Prévia pública do Diagnóstico LinkedIn.
 * Expõe SÓ notas + headline + pilares (espelho do contrato share do MVP).
 * Textos do visitante e dados do lead nunca chegam aqui.
 */
export default function DiagnosticoLinkedinShare() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const previa = slug ? lerPreviaCompartilhada(slug) : null;

  return (
    <PageLayout>
      <SEO
        title="Prévia do Diagnóstico LinkedIn"
        description="Prévia pública e sem dados pessoais do diagnóstico de autoridade no LinkedIn."
        canonical="https://revhackers.com.br/diagnostico/linkedin"
      />

      <section className="bg-black pt-28 pb-12 relative overflow-hidden">
        <ModernTechnicalBackground />
        <div className="max-w-5xl mx-auto px-6 relative z-10 space-y-4 text-center">
          <p className="text-[#00CC6A] text-xs font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-2">
            <Linkedin size={14} /> Prévia pública · sem dados pessoais
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Diagnóstico de Autoridade no LinkedIn
          </h1>
        </div>
      </section>

      <section className="py-10 bg-zinc-50/50 min-h-[50vh]">
        <div className="max-w-3xl mx-auto px-6">
          {!previa ? (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 text-center space-y-4">
              <Lock size={22} className="mx-auto text-zinc-400" />
              <h2 className="text-base font-extrabold text-zinc-900">Prévia indisponível neste navegador</h2>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto">
                O link público expõe só a prévia e ela fica salva no navegador onde o diagnóstico rodou.
                Em outro dispositivo ou após limpar os dados, ela não aparece. Rode o seu próprio diagnóstico gratuito.
              </p>
              <button
                type="button"
                onClick={() => navigate('/diagnostico/linkedin')}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-6 py-3 text-sm font-bold text-white hover:bg-black transition"
              >
                Fazer meu diagnóstico <ArrowRight size={16} className="text-[#00CC6A]" />
              </button>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Share2 size={14} />
                <span>Prévia gratuita · modo observável · textos do autor omitidos por privacidade</span>
              </div>
              <div className="flex items-end gap-3 flex-wrap">
                <p className="text-4xl font-extrabold text-zinc-950 tracking-tight">{previa.media ?? 'N/A'}</p>
                <p className="text-xs text-zinc-500 pb-1.5">média observável · <strong>{previa.faixa || faixaDaMedia(previa.media)}</strong></p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-50 text-left">
                      <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-zinc-500">Critério</th>
                      <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-zinc-500 w-24">Nota</th>
                      <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-zinc-500 w-28">Confiança</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previa.dimensoes.map((d) => (
                      <tr key={d.id} className="border-t border-zinc-100">
                        <td className="px-4 py-2.5">
                          <strong className="text-zinc-900">{DIMENSOES_META[d.id].nome}</strong>
                          <br /><span className="text-zinc-400">{DIMENSOES_META[d.id].explicacao}</span>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-zinc-900">{d.nota === null ? 'N/A' : d.nota.toFixed(1)}</td>
                        <td className="px-4 py-2.5 text-zinc-600">{d.confianca}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm"><strong className="text-zinc-900">Headline sugerida:</strong> <span className="text-zinc-600">{previa.headline_sugerida}</span></p>
              <p className="text-sm"><strong className="text-zinc-900">Pilares:</strong> <span className="text-zinc-600">{previa.pilares.map((p) => p.nome).join(' · ') || 'sem recorrência detectável'}</span></p>
              <div className="rounded-xl bg-zinc-950 p-5 text-center space-y-3">
                <p className="text-sm font-bold text-white">Quer o relatório completo do seu perfil?</p>
                <button
                  type="button"
                  onClick={() => navigate('/diagnostico/linkedin')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00CC6A] px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-[#00A850] transition"
                >
                  Fazer meu diagnóstico gratuito <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
