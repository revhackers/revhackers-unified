import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  Copy,
  FileText,
  Link as LinkIcon,
  Linkedin,
  Loader2,
  Lock,
  Share2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import SEO from '@/components/shared/SEO';
import ModernTechnicalBackground from '@/components/shared/ModernTechnicalBackground';
import {
  DIMENSOES_META,
  faixaDaMedia,
  type DimensaoId,
} from '@/lib/linkedin/linkedinAuthorityEngine';
import {
  dividirPosts,
  iniciarDiagnostico,
  liberarRelatorio,
  type PreviaDiagnostico,
  type RelatorioCompleto,
} from '@/lib/linkedin/linkedinDiagnosticSession';

type Etapa = 'form' | 'processando' | 'previa' | 'liberado';

const PASSOS_PROCESSAMENTO = [
  'Lendo headline e Sobre',
  'Mapeando posicionamento e público',
  'Auditando posts colados',
  'Fechando prévia observável',
];

const LIMITES_DECLARADOS = [
  'Motor determinístico e observável: avalia só o que está no texto colado.',
  'Não mede alcance, engajamento, frequência de posts ou conversão.',
  'Não faz nenhuma afirmação sobre o algoritmo do LinkedIn.',
  'Sem juízo semântico: temas contam frequência, não relevância; formatos contam moldes, não variedade real.',
  'Sugestões com dado faltante usam [A CONFIRMAR]. Nenhum número é inventado.',
];

const EXEMPLO_LOGISTICA = {
  cargo: 'CEO',
  segmento: 'Logística',
  headline: 'CEO na Transportadora Fictícia S.A. | Logística e gestão de frotas',
  sobre:
    'Há 12 anos operando frotas próprias no Sudeste. Hoje ajudo embarcadores industriais a enxergar o custo por entrega por rota.\n\nChecklist próprio de manutenção preventiva + tabela de frete negociada.\n\nMe chama no inbox para conversar sobre custo logístico.',
  posts:
    'Erros que vejo todo dia na gestão de frotas. Primeiro: ninguém mede o custo por entrega por rota, só olham o total do mês. Eu montei uma planilha que cortou 12% do custo em 90 dias.\n---\nManutenção preventiva vira promessa e o caminhão quebra na estrada. Visitei 5 garagens em SP e documentei o checklist que usamos hoje.',
  publico: 'embarcadores industriais, diretores de operações',
  objetivo: 'Ser reconhecido como referência em gestão de frotas para atrair embarcadores como clientes de consultoria.',
};

const EXEMPLO_SAAS = {
  cargo: 'Founder',
  segmento: 'SaaS B2B',
  headline: 'Founder @ Pipeline Fictícia SaaS | Forecast e revenue para SaaS',
  sobre:
    'Fundei uma operação de inside sales com 30 SDRs. Escrevo sobre forecast disciplinado e pipeline revisado toda sexta.\n\nFramework próprio de revisão de deals + rotina de sexta-feira.\n\nComente neste post qual parte do seu pipeline trava no fim do mês.',
  posts:
    'Nosso forecast parou de oscilar quando passei a revisar 100% dos deals acima de R$ 20 mil toda sexta. Eu acompanhei 3 trimestres seguidos e documentei o ritual.\n---\nPergunta genuína para diretores comerciais: qual parte do seu pipeline você revisa semanalmente com o time? Comenta aqui.',
  publico: 'diretores comerciais, founders SaaS',
  objetivo: 'Atrair diretores comerciais para conversas sobre disciplina de forecast.',
};

function NotaBadge({ nota }: { nota: number | null }) {
  if (nota === null) {
    return (
      <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-500 border border-zinc-200">
        N/A
      </span>
    );
  }
  const cor = nota < 4 ? 'bg-red-50 text-red-700 border-red-200' : nota < 6 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold border ${cor}`}>
      {nota.toFixed(1)}
    </span>
  );
}

const inputCls =
  'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 transition';
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-zinc-600';

export default function DiagnosticoLinkedin() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>('form');
  const [passoAtual, setPassoAtual] = useState(0);

  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [cargo, setCargo] = useState('');
  const [segmento, setSegmento] = useState('');
  const [headline, setHeadline] = useState('');
  const [sobre, setSobre] = useState('');
  const [postsBrutos, setPostsBrutos] = useState('');
  const [publico, setPublico] = useState('');
  const [objetivo, setObjetivo] = useState('');

  const [erroForm, setErroForm] = useState<string | null>(null);
  const [avisoDescarte, setAvisoDescarte] = useState<string | null>(null);
  const [previa, setPrevia] = useState<PreviaDiagnostico | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [tokenSessao, setTokenSessao] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [lgpd, setLgpd] = useState(false);
  const [erroGate, setErroGate] = useState<string | null>(null);
  const [liberando, setLiberando] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioCompleto | null>(null);
  const [copiado, setCopiado] = useState(false);

  function carregarExemplo(ex: typeof EXEMPLO_LOGISTICA) {
    setCargo(ex.cargo);
    setSegmento(ex.segmento);
    setHeadline(ex.headline);
    setSobre(ex.sobre);
    setPostsBrutos(ex.posts);
    setPublico(ex.publico);
    setObjetivo(ex.objetivo);
    setErroForm(null);
  }

  async function rodarDiagnostico() {
    setErroForm(null);
    setAvisoDescarte(null);
    const { posts, descartados } = dividirPosts(postsBrutos);
    const saida = iniciarDiagnostico(
      {
        headline,
        sobre,
        posts,
        cargo: cargo || undefined,
        segmento: segmento || undefined,
        publico_alvo: publico || undefined,
        objetivo: objetivo || undefined,
        linkedin_url: linkedinUrl.trim() || undefined,
      },
      descartados,
    );
    if (saida.ok === false) {
      setErroForm(saida.mensagem);
      return;
    }
    setEtapa('processando');
    setPassoAtual(0);
    for (let i = 0; i < PASSOS_PROCESSAMENTO.length; i += 1) {
      setPassoAtual(i);
      // Projeto no lib ES2020: Promise.withResolvers (ES2024) indisponível nos tipos.
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 320);
      });
    }
    if (saida.postsDescartados > 0) {
      setAvisoDescarte(
        `${saida.postsDescartados} trecho(s) curto(s) ignorado(s): mínimo de 20 caracteres por post.`,
      );
    }
    setPrevia(saida.previa);
    setSlug(saida.slug);
    setTokenSessao(saida.tokenSessao);
    setEtapa('previa');
  }

  function desbloquear() {
    setErroGate(null);
    if (!tokenSessao) {
      setErroGate('Sessão expirada. Rode o diagnóstico novamente.');
      return;
    }
    setLiberando(true);
    const saida = liberarRelatorio(tokenSessao, { nome, email, empresa, lgpd });
    setLiberando(false);
    if (saida.ok === false) {
      setErroGate(saida.mensagem);
      if (saida.erro === 'sessao_expirada') setTokenSessao(null);
      return;
    }
    setRelatorio(saida.relatorio);
    setEtapa('liberado');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function copiarShare() {
    if (!slug) return;
    const url = `${window.location.origin}/diagnostico/linkedin/r/${slug}`;
    void navigator.clipboard?.writeText(url).then(
      () => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      },
      () => setCopiado(false),
    );
  }

  const ordemDims: DimensaoId[] = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];
  const prevDims = previa ? [...previa.dimensoes].sort((a, b) => ordemDims.indexOf(a.id) - ordemDims.indexOf(b.id)) : [];

  return (
    <PageLayout>
      <SEO
        title="Diagnóstico de Autoridade no LinkedIn"
        description="Auditoria observável do seu perfil no LinkedIn em 8 dimensões. Cole headline, Sobre e posts. Sem scraping, sem números inventados."
        canonical="https://revhackers.com.br/diagnostico/linkedin"
      />

      <section className="bg-black pt-28 pb-12 relative overflow-hidden">
        <ModernTechnicalBackground />
        <div className="max-w-5xl mx-auto px-6 relative z-10 space-y-4 text-center">
          <p className="text-[#00CC6A] text-xs font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-2">
            <Linkedin size={14} /> LinkedIn Authority · Beta observável
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto">
            Sua autoridade no LinkedIn, <span className="text-[#00CC6A]">auditada em minutos.</span>
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Cole headline, Sobre e posts. O motor observável avalia 8 dimensões e devolve prévia gratuita,
            relatório completo e plano de 30 dias. Sem scraping, sem conta conectada, sem número inventado.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
            {['100% manual', 'sem scraping', 'modo observável', 'LGPD'].map((t) => (
              <span key={t} className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 bg-zinc-50/50 min-h-[50vh]">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          {etapa !== 'liberado' && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-base font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
                  <FileText size={17} className="text-[#00CC6A]" /> 1 · Seus dados
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">nada é coletado sozinho</span>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900 leading-relaxed flex gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  Coleta automática do LinkedIn <strong>indisponível nesta versão</strong> por desenho
                  (sem contas, sem scraping). Use colagem manual dos seus textos.
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => carregarExemplo(EXEMPLO_LOGISTICA)} className="text-xs font-bold px-3.5 py-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-950 hover:text-white transition">
                  Carregar exemplo: logística B2B
                </button>
                <button type="button" onClick={() => carregarExemplo(EXEMPLO_SAAS)} className="text-xs font-bold px-3.5 py-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-950 hover:text-white transition">
                  Carregar exemplo: SaaS B2B
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelCls} htmlFor="lk-url">URL do LinkedIn (opcional, só referência)</label>
                  <input id="lk-url" className={inputCls} placeholder="https://www.linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} inputMode="url" />
                  <p className="text-[11px] text-zinc-400 mt-1">Nunca acessada. Serve só como anotação do seu diagnóstico.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} htmlFor="lk-cargo">Cargo</label>
                    <input id="lk-cargo" className={inputCls} value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: CEO, Founder, Consultor" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="lk-segmento">Segmento</label>
                    <input id="lk-segmento" className={inputCls} value={segmento} onChange={(e) => setSegmento(e.target.value)} placeholder="Ex.: Logística, SaaS B2B" />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="lk-headline">Headline (como está no perfil)</label>
                  <input id="lk-headline" className={inputCls} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Cole sua headline atual" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="lk-sobre">Seção Sobre (texto corrido)</label>
                  <textarea id="lk-sobre" className={`${inputCls} min-h-[120px]`} value={sobre} onChange={(e) => setSobre(e.target.value)} placeholder="Cole o texto da seção Sobre" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="lk-posts">Posts (separe cada um com --- em uma linha)</label>
                  <textarea id="lk-posts" className={`${inputCls} min-h-[140px] font-mono !text-[13px]`} value={postsBrutos} onChange={(e) => setPostsBrutos(e.target.value)} placeholder={'Primeiro post...\n---\nSegundo post...'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} htmlFor="lk-publico">Público-alvo (quem decide e compra)</label>
                    <input id="lk-publico" className={inputCls} value={publico} onChange={(e) => setPublico(e.target.value)} placeholder="Ex.: diretores de operações" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="lk-objetivo">Objetivo de posicionamento</label>
                    <input id="lk-objetivo" className={inputCls} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: atrair embarcadores" />
                  </div>
                </div>
              </div>

              {erroForm && (
                <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-bold text-red-700">{erroForm}</p>
              )}

              <button
                type="button"
                onClick={rodarDiagnostico}
                disabled={etapa === 'processando'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 py-3 text-sm font-bold text-white hover:bg-black transition disabled:opacity-60"
              >
                {etapa === 'processando' ? <Loader2 size={16} className="animate-spin" /> : <span>Rodar diagnóstico</span>}
                {etapa !== 'processando' && <ArrowRight size={16} className="text-[#00CC6A]" />}
              </button>

              {etapa === 'processando' && (
                <div className="rounded-xl bg-zinc-950 text-zinc-200 px-4 py-4 space-y-2" role="status" aria-live="polite">
                  {PASSOS_PROCESSAMENTO.map((p, i) => (
                    <p key={p} className={`text-xs font-mono flex items-center gap-2 ${i < passoAtual ? 'text-[#00CC6A]' : i === passoAtual ? 'text-white' : 'text-zinc-500'}`}>
                      {i < passoAtual ? <Check size={13} /> : i === passoAtual ? <Loader2 size={13} className="animate-spin" /> : <span className="w-[13px]" />}
                      {p}{i < passoAtual ? ' ✓' : i === passoAtual ? ' …' : ''}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {avisoDescarte && etapa !== 'form' && (
            <p className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900">{avisoDescarte}</p>
          )}

          {previa && (etapa === 'previa' || etapa === 'liberado') && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-base font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
                  <Sparkles size={17} className="text-[#00CC6A]" /> 2 · Prévia gratuita
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-zinc-950 text-[#00CC6A] border border-zinc-800">
                  modo observável
                </span>
              </div>
              <div className="flex items-end gap-3 flex-wrap">
                <p className="text-4xl font-extrabold text-zinc-950 tracking-tight">{previa.media ?? 'N/A'}</p>
                <p className="text-xs text-zinc-500 pb-1.5">média observável · <strong>{faixaDaMedia(previa.media)}</strong> · N/A não entra na média</p>
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
                    {prevDims.map((d) => (
                      <tr key={d.id} className="border-t border-zinc-100">
                        <td className="px-4 py-2.5">
                          <strong className="text-zinc-900">{DIMENSOES_META[d.id].nome}</strong>
                          <br /><span className="text-zinc-400">{DIMENSOES_META[d.id].explicacao}</span>
                        </td>
                        <td className="px-4 py-2.5"><NotaBadge nota={d.nota} /></td>
                        <td className="px-4 py-2.5 text-zinc-600">{d.confianca}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong className="text-zinc-900">Headline sugerida:</strong> <span className="text-zinc-600">{previa.headline_sugerida}</span></p>
                <p><strong className="text-zinc-900">Pilares:</strong> <span className="text-zinc-600">{previa.pilares.map((p) => p.nome).join(' · ') || 'sem recorrência detectável'}</span></p>
              </div>
              {slug && (
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 flex items-center gap-2 flex-wrap text-xs">
                  <Share2 size={14} className="text-zinc-500" />
                  <span className="text-zinc-500">Link público da prévia (sem textos, sem dados):</span>
                  <code className="font-mono text-zinc-800 break-all">/diagnostico/linkedin/r/{slug}</code>
                  <button type="button" onClick={copiarShare} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-bold text-zinc-700 hover:border-zinc-900 transition">
                    {copiado ? <Check size={13} className="text-[#00CC6A]" /> : <Copy size={13} />}
                    {copiado ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              )}
            </div>
          )}

          {etapa === 'previa' && (
            <div className="bg-zinc-950 text-white rounded-2xl p-6 shadow-xs space-y-5 border border-zinc-800">
              <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                <Lock size={17} className="text-[#00CC6A]" /> 3 · Relatório completo
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dimensões detalhadas, hooks reescritos de fragmentos reais, plano de 4 semanas e prioridades de 30 dias.
                Seus textos e este cadastro ficam só nesta sessão do navegador: o link público expõe apenas a prévia.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" htmlFor="lk-nome">Nome completo</label>
                  <input id="lk-nome" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#00CC6A] transition" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" autoComplete="name" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" htmlFor="lk-email">E-mail corporativo</label>
                  <input id="lk-email" type="email" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#00CC6A] transition" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" autoComplete="email" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" htmlFor="lk-empresa">Empresa (opcional)</label>
                <input id="lk-empresa" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#00CC6A] transition" value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Sua empresa" autoComplete="organization" />
              </div>
              <label className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed cursor-pointer">
                <input type="checkbox" checked={lgpd} onChange={(e) => setLgpd(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#00CC6A]" />
                <span className="flex items-start gap-1.5">
                  <ShieldCheck size={15} className="shrink-0 mt-0.5 text-[#00CC6A]" />
                  <span>
                    Autorizo o contato comercial da RevHackers e o uso destes dados para gerar o diagnóstico (LGPD). Veja a{' '}
                    <a href="/privacidade" className="underline underline-offset-2 hover:text-white">Política de Privacidade</a>{' '}
                    e os <a href="/termos-de-uso" className="underline underline-offset-2 hover:text-white">Termos de Uso</a>.
                  </span>
                </span>
              </label>
              {erroGate && <p role="alert" className="rounded-xl bg-red-950/60 border border-red-900 px-4 py-3 text-xs font-bold text-red-300">{erroGate}</p>}
              <button
                type="button"
                onClick={desbloquear}
                disabled={liberando}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00CC6A] px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-[#00A850] transition disabled:opacity-60"
              >
                {liberando ? <Loader2 size={16} className="animate-spin" /> : <span>Liberar relatório</span>}
                {!liberando && <ArrowRight size={16} />}
              </button>
              <p className="text-[11px] text-zinc-500">Demonstração: o envio ao CRM é uma dependência de publicação. Nesta versão, o lead não sai deste navegador.</p>
            </div>
          )}

          {etapa === 'liberado' && relatorio && (
            <div className="space-y-6">
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                <h2 className="text-base font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
                  <FileText size={17} className="text-[#00CC6A]" /> 4 · Relatório
                </h2>
                <p className="text-sm text-zinc-600 leading-relaxed">{relatorio.diagnostico_geral}</p>
                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-50 text-left">
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-zinc-500">Critério</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-zinc-500 w-20">Nota</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-zinc-500 w-24">Conf.</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-zinc-500">Problemas / evidências</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.dimensoes.map((d) => (
                        <tr key={d.id} className="border-t border-zinc-100 align-top">
                          <td className="px-4 py-2.5">
                            <strong className="text-zinc-900">{DIMENSOES_META[d.id].nome}</strong>
                            <br /><span className="text-zinc-400">{DIMENSOES_META[d.id].explicacao}</span>
                            <br /><span className="text-zinc-400 italic">{d.evidencias.slice(0, 2).join(' · ')}</span>
                          </td>
                          <td className="px-4 py-2.5"><NotaBadge nota={d.nota} /></td>
                          <td className="px-4 py-2.5 text-zinc-600">{d.confianca}</td>
                          <td className="px-4 py-2.5 text-zinc-600">
                            {d.problemas.map((p) => <p key={p} className="mb-1">· {p}</p>)}
                            {d.nao_avaliavel_motivo && <p className="text-zinc-400 italic">N/A: {d.nao_avaliavel_motivo}</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm">
                  <strong className="text-zinc-900">Headline sugerida:</strong> <span className="text-zinc-600">{relatorio.headline_sugerida}</span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 mb-2">Pilares editoriais detectados</h3>
                  <ul className="space-y-1.5 text-sm text-zinc-600">
                    {relatorio.pilares.map((p) => <li key={p.nome}>· <strong className="text-zinc-900">{p.nome}</strong> — {p.justificativa}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 mb-2">Hooks (fragmentos reais da sua entrada)</h3>
                  <ul className="space-y-1.5 text-sm text-zinc-600">
                    {relatorio.hooks.map((h) => <li key={h.para_post}>· Post {h.para_post}: “{h.hook}” <span className="text-zinc-400">({h.porque})</span></li>)}
                  </ul>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-zinc-200 p-4">
                    <h3 className="text-sm font-extrabold text-zinc-900 mb-2">Plano 4 semanas</h3>
                    <ul className="space-y-1.5 text-xs text-zinc-600">
                      {relatorio.plano_4_semanas.map((p) => <li key={p.semana}>· Semana {p.semana}: <strong className="text-zinc-900">{p.tema}</strong> <span className="text-zinc-400">[{p.formato}]</span></li>)}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-zinc-200 p-4">
                    <h3 className="text-sm font-extrabold text-zinc-900 mb-2">Prioridades 30 dias</h3>
                    <ol className="space-y-1.5 text-xs text-zinc-600 list-decimal list-inside">
                      {relatorio.prioridades_30d.map((p) => <li key={p}>{p}</li>)}
                    </ol>
                  </div>
                </div>
                {relatorio.missings.length > 0 && (
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-1.5">Não avaliável nesta entrada</h3>
                    <ul className="text-xs text-zinc-500 space-y-1">
                      {relatorio.missings.map((m) => <li key={m}>· {m}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Limites declarados deste diagnóstico</h3>
                <ul className="text-xs text-zinc-500 space-y-1.5">
                  {LIMITES_DECLARADOS.map((l) => <li key={l} className="flex gap-2"><LinkIcon size={12} className="shrink-0 mt-0.5" />{l}</li>)}
                </ul>
              </div>

              <div className="bg-zinc-950 rounded-2xl p-6 md:p-8 border border-zinc-800 text-center space-y-4">
                <p className="text-[#00CC6A] text-xs font-mono font-bold tracking-widest uppercase">Próximo passo</p>
                <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Este diagnóstico é a superfície.</h2>
                <p className="text-xs md:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
                  Numa conversa de 30 minutos, mostramos como transformar esses pontos em pipeline comercial.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/booking')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00CC6A] px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-[#00A850] transition"
                >
                  <CalendarClock size={16} /> Agendar conversa com a RevHackers <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
