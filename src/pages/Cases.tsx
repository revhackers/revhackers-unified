import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Link } from 'react-router-dom';
import ContactForm from '@/components/shared/ContactForm';
import Section from '@/components/ui/Section';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SEO from '@/components/shared/SEO';
import DarkHeroSection from '@/components/shared/DarkHeroSection';
import { getAllCases, CaseStudy } from '@/api/cases';


const CardLogo = ({ logo, title }: { logo?: string; title: string; scale?: number }) => {
  const [failed, setFailed] = useState(false);

  if (!logo || failed) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4">
        <span className="text-lg font-extrabold text-zinc-900 tracking-tight leading-snug">{title}</span>
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt={title}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
      width={160}
      height={65}
      className="max-w-[80%] max-h-[65px] w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-105"
    />
  );
};

const Cases = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [cases] = useState<any[]>(() => getAllCases());

  // Format Database Cases
  const filteredCases = cases.map(dbCase => ({
    ...dbCase,
    // Ensure all required fields for UI are present
    client_logo: dbCase.client_logo || '',
    title: dbCase.client_name || dbCase.title,
    case_category: dbCase.case_category || 'Geral',
    preview_description: dbCase.preview_description || dbCase.description || '',
    image_url: dbCase.image_url || dbCase.cover_image,
    slug: dbCase.slug
  })).filter(c => {
    const searchLower = searchQuery.toLowerCase();
    const title = (c.title || '').toLowerCase();
    const desc = (c.preview_description || '').toLowerCase();
    const cat = (c.case_category || '').toLowerCase();

    const matchesSearch = title.includes(searchLower) || desc.includes(searchLower) || cat.includes(searchLower);
    const matchesCategory = activeCategory === 'Todos' || c.case_category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = ['Todos', ...Array.from(new Set(cases.map(c => c.case_category || 'Geral').filter(Boolean)))];

  return (
    <PageLayout>
      <SEO
        title="Cases de Sucesso em Revenue Operations"
        description="Resultados reais de operações B2B que escalaram receita com Revenue Operations, ABM e Growth Engineering. Veja como empresas brasileiras transformaram seus resultados."
        canonical="https://revhackers.com.br/cases"
        breadcrumbs={[
          { name: "Home", url: "https://revhackers.com.br/" },
          { name: "Cases", url: "https://revhackers.com.br/cases" }
        ]}
      />
      <DarkHeroSection
        eyebrow="Cases"
        title={
          <>
            Geramos mais de R$ 50 milhões em pipeline auditado <span className="text-[#00CC6A]">reduzindo o CAC médio em 40%.</span>
          </>
        }
        subtitle="Resultados reais de empresas B2B que escalaram operações com nossas arquiteturas de IA e ABM."
        searchPlaceholder="BUSCAR CASES..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Cases Grid */}
      <section className="pt-16 sm:pt-20 pb-24 bg-white min-h-screen relative">
        
        <div className="container-custom relative z-10">

          {filteredCases.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-zinc-200 bg-zinc-50/30 rounded-2xl">
              <h3 className="text-base md:text-lg font-bold text-zinc-900">Nenhum case encontrado</h3>
              <Button variant="link" className="text-black font-bold uppercase text-xxs mt-4" onClick={() => { setSearchQuery(''); setActiveCategory('Todos') }}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCases.map((study, index) => (
                <Link to={`/cases/${study.slug}`} className="group h-full" key={study.id || index}>
                  <div className="bg-white overflow-hidden h-full flex flex-col transition-all duration-300 relative rounded-2xl border border-zinc-200/80 hover:border-zinc-400 shadow-xs hover:shadow-md">
                    
                    {/* Thumbnail Cover Header do Card com Logos Originais Nativos */}
                    <div className="h-44 bg-zinc-50/80 flex items-center justify-center border-b border-zinc-100 p-8 relative overflow-hidden group-hover:bg-zinc-100/70 transition-colors">
                      <CardLogo logo={study.client_logo} title={study.client_name || study.title} scale={study.logoScale} />
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-6 md:p-8 flex-1 flex flex-col bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">
                          {study.case_category}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-zinc-900 mb-2 group-hover:text-zinc-700 transition-colors leading-snug">
                        {study.title}
                      </h3>

                      <p className="text-zinc-500 text-xs leading-relaxed mb-6 flex-1 line-clamp-3">
                        {study.preview_description}
                      </p>

                      {/* Métricas do Case (se existirem) */}
                      {study.metrics && Array.isArray(study.metrics) && (
                        <div className="grid grid-cols-2 gap-2 mb-6 pt-4 border-t border-zinc-100">
                          {study.metrics.slice(0, 2).map((m: any, idx: number) => (
                            <div key={idx} className="bg-zinc-50 border border-zinc-100 rounded-lg p-2.5">
                              <span className="text-[10px] text-zinc-400 font-semibold block uppercase tracking-wider">{m.label}</span>
                              <span className="text-sm font-extrabold text-zinc-950">{m.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-950 group-hover:text-zinc-700 transition-colors">
                          Ver Estudo Completo
                        </span>
                        <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-950 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>

                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section, Fundo 100% Branco Puro */}
      <section className="py-20 sm:py-24 bg-white border-t border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            {/* Esquerda: Headline & Subheadline com Letras Maiores e Mais Espaçadas */}
            <div className="space-y-6">
              <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-950 leading-[1.1] tracking-tight">
                Quer plugar esta <span className="text-zinc-500">Engenharia na sua operação?</span>
              </h2>
              <p className="text-zinc-600 text-base md:text-lg font-normal leading-relaxed max-w-lg">
                Nós não começamos nenhum projeto sem auditar o vazamento atual da empresa. Aplique agora para uma análise de viabilidade técnica.
              </p>
            </div>

            {/* Direita: Formulário Mantido no Padrão Perfeito */}
            <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xs border border-zinc-200/80">
              <ContactForm formType="diagnosis" />
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Cases;
