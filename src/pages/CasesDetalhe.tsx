import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import CaseNotFound from '@/components/cases/CaseNotFound';
import { getCaseBySlug } from '@/api/cases';
import { casesData } from '@/data/cases';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import ContactForm from '@/components/shared/ContactForm';
import SEO from '@/components/shared/SEO';
import { Button } from '@/components/ui/button';

const CasesDetalhe = () => {
  const { slug } = useParams<{ slug: string }>();
  const [caseData, setCaseData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCase = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const dbCase = await getCaseBySlug(slug);
        const localCase = casesData[slug as keyof typeof casesData];

        if (dbCase || localCase) {
          const rawTitle = dbCase?.client_name || dbCase?.title || localCase?.title || 'Case de Sucesso';
          const challengeText = (dbCase?.challenge && !dbCase.challenge.includes('não informado'))
            ? dbCase.challenge
            : (localCase?.challenge || 'A empresa necessitava de estruturação técnica de processos comerciais, inteligência de dados e otimização da máquina de vendas para acelerar o crescimento B2B.');
          
          const solutionText = (dbCase?.solution && !dbCase.solution.includes('não informada'))
            ? dbCase.solution
            : (localCase?.solution || 'Implementamos uma arquitetura completa de Revenue Operations, parametrização de CRM com automações operacionais e qualificação por IA.');

          const mappedCase = {
            title: rawTitle,
            category: dbCase?.case_category || localCase?.category || 'Go-To-Market',
            logo: dbCase?.client_logo || localCase?.logo || '',
            challenge: challengeText,
            solution: solutionText,
            results: localCase?.results || (typeof dbCase?.results === 'string' ? dbCase.results.split('\n') : (Array.isArray(dbCase?.results) ? dbCase.results : [])),
            metrics: (localCase?.metrics || dbCase?.metrics || []) as any[],
            quote: localCase?.quote || dbCase?.testimonial_quote || '',
            author: localCase?.author || dbCase?.testimonial_author || '',
            role: localCase?.role || dbCase?.testimonial_role || '',
            authorImage: localCase?.authorImage || dbCase?.testimonial_avatar || '',
            techStack: localCase?.techStack || (Array.isArray((dbCase as any)?.tech_stack) ? (dbCase as any).tech_stack : []) || ['HubSpot CRM', 'RevOps 360º', 'Growth IA'],
            preview_description: localCase?.preview_description || dbCase?.preview_description || ''
          };
          setCaseData(mappedCase);
        } else {
          setCaseData(null);
        }
      } catch (error) {
        console.error("Error loading case detail:", error);
        setCaseData(null);
      } finally {
        setLoading(false);
      }
    };

    loadCase();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-[70vh] w-full flex items-center justify-center bg-black">
          <Loader2 className="h-8 w-8 text-[#00CC6A] animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!caseData) {
    return (
      <PageLayout>
        <CaseNotFound />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SEO
        title={`${caseData.title} | Case de Sucesso`}
        description={caseData.preview_description || `Confira como a ${caseData.title} transformou seus resultados com a RevHackers.`}
        canonical={`https://revhackers.com.br/cases/${slug}`}
      />

      {/* Hero Section — Fundo Black Purificado (EXACT HOMEPAGE HERO BENCHMARK) */}
      <section className="relative min-h-[65vh] flex flex-col justify-center items-center overflow-hidden pt-28 pb-16 bg-black border-b border-zinc-900">
        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center text-center">
          
          <Link to="/cases" className="text-zinc-400 hover:text-white inline-flex items-center gap-2 text-xs font-semibold mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar para Cases
          </Link>

          {caseData.logo && (
            <div className="mb-6 bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl inline-flex items-center justify-center">
              <img
                src={caseData.logo}
                alt={`${caseData.title} Logo`}
                className="h-12 w-auto max-w-[200px] object-contain"
              />
            </div>
          )}

          <span className="text-[#00CC6A] text-xs font-semibold uppercase tracking-wider mb-3">
            {caseData.category}
          </span>

          <h1 className="font-sans text-[2rem] sm:text-[2.75rem] md:text-[3.25rem] font-extrabold text-white mb-5 leading-[1.1] tracking-tight text-center max-w-3xl mx-auto">
            {caseData.title}
          </h1>

          {caseData.preview_description && (
            <p className="text-zinc-400 text-base md:text-lg font-normal leading-relaxed max-w-2xl mx-auto text-center">
              {caseData.preview_description}
            </p>
          )}
        </div>
      </section>

      {/* Content Section — Fundo 100% Branco Puro */}
      <section className="py-20 bg-white border-b border-zinc-200/80 text-zinc-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

            {/* Sidebar Esquerda */}
            <div className="lg:col-span-4 space-y-8 order-2 lg:order-1">
              
              <div className="bg-white border border-zinc-200/80 p-6 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Sobre o Cliente</h4>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Projeto de inteligência comercial desenvolvido para <strong>{caseData.title}</strong>, focado em <strong>{caseData.category}</strong>.
                </p>
              </div>
                {(caseData.period || caseData.source) && (
                  <p className="text-xs text-zinc-500 leading-relaxed pt-3 border-t border-zinc-100">
                    {caseData.period && <span className="block"><strong className="text-zinc-700">Período:</strong> {caseData.period}</span>}
                    {caseData.source && <span className="block"><strong className="text-zinc-700">Fonte:</strong> {caseData.source}</span>}
                  </p>
                )}

              {caseData.techStack && caseData.techStack.length > 0 && (
                <div className="bg-white border border-zinc-200/80 p-6 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Tech Stack & Metodologia</h4>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {caseData.techStack.map((tech: string) => (
                      <span key={tech} className="bg-zinc-100 text-zinc-800 px-3 py-1 rounded-lg text-xs font-semibold border border-zinc-200/60">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-zinc-200/80 p-6 rounded-2xl space-y-3">
                <h5 className="font-bold text-zinc-950 text-sm">Quer resultados assim?</h5>
                <p className="text-xs text-zinc-500">Agende uma auditoria de vazamento de receita da sua empresa.</p>
                <Button asChild className="w-full bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs h-11 rounded-lg">
                  <Link to="/booking">Agendar Auditoria →</Link>
                </Button>
              </div>
            </div>

            {/* Coluna Principal de Conteúdo */}
            <div className="lg:col-span-8 space-y-12 order-1 lg:order-2">

              {/* O Desafio */}
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                  O Desafio
                </h2>
                <div className="text-zinc-600 leading-relaxed text-base sm:text-lg whitespace-pre-line">
                  {caseData.challenge}
                </div>
              </div>

              {/* A Estratégia */}
              <div className="space-y-4 pt-6 border-t border-zinc-100">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                  A Estratégia
                </h2>
                <div className="text-zinc-600 leading-relaxed text-base sm:text-lg whitespace-pre-line">
                  {caseData.solution}
                </div>
              </div>

              {/* Métricas e Resultados */}
              <div className="space-y-6 pt-6 border-t border-zinc-100">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                  Resultados Alcançados
                </h2>

                {caseData.metrics && caseData.metrics.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {caseData.metrics.map((m: any, idx: number) => (
                      <div key={idx} className="bg-white border border-zinc-200/80 p-6 rounded-2xl shadow-xs">
                        <span className="text-2xl sm:text-3xl font-extrabold text-zinc-950 block mb-1">{m.value}</span>
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{m.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {caseData.results && Array.isArray(caseData.results) && caseData.results.length > 0 && (
                  <ul className="space-y-3 pt-2">
                    {caseData.results.map((result: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-zinc-700 bg-white p-4 rounded-xl border border-zinc-200/80">
                        <CheckCircle2 className="w-5 h-5 text-zinc-900 shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">{result}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Quote Testemunho (se existir) */}
              {caseData.quote && (
                <div className="bg-black text-white p-8 sm:p-10 rounded-2xl relative overflow-hidden">
                  <blockquote className="space-y-6">
                    <p className="text-base sm:text-lg font-normal leading-relaxed text-zinc-200 italic">
                      "{caseData.quote}"
                    </p>
                    <footer className="flex items-center gap-4 border-t border-zinc-800 pt-6">
                      {caseData.authorImage && (
                        <img src={caseData.authorImage} alt={caseData.author} className="w-11 h-11 rounded-full border border-zinc-700 object-cover" />
                      )}
                      <div>
                        <cite className="not-italic font-bold text-white block text-sm">{caseData.author}</cite>
                        <span className="text-zinc-400 text-xs">{caseData.role}</span>
                      </div>
                    </footer>
                  </blockquote>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* CTA Final com Formulário Padronizado */}
      <section className="py-20 sm:py-24 bg-white border-t border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            <div className="space-y-6">
              <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-950 leading-[1.1] tracking-tight">
                Quer plugar esta <span className="text-zinc-500">Engenharia na sua operação?</span>
              </h2>
              <p className="text-zinc-600 text-base md:text-lg font-normal leading-relaxed max-w-lg">
                Nós não começamos nenhum projeto sem auditar o vazamento atual da empresa. Aplique agora para uma análise de viabilidade técnica.
              </p>
            </div>

            <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xs border border-zinc-200/80">
              <ContactForm formType="diagnosis" />
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default CasesDetalhe;
