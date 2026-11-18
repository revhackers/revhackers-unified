
import { useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Calendar, Video, BookOpen, GraduationCap, Repeat, Lightbulb, ArrowUpRight } from 'lucide-react';
import Section from '@/components/ui/Section';
import DarkHeroSection from '@/components/shared/DarkHeroSection';
import SEO from '@/components/shared/SEO';

const Comunidade = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageLayout>
      <SEO
        title="Comunidade de Revenue Operations do Brasil"
        description="Participe da maior comunidade de Revenue Operations, Marketing B2B e Vendas do Brasil. Networking, bootcamps, meetups e conteúdo exclusivo para profissionais de RevOps."
        canonical="https://revhackers.com.br/comunidade"
        breadcrumbs={[
          { name: "Home", url: "https://revhackers.com.br/" },
          { name: "Comunidade", url: "https://revhackers.com.br/comunidade" }
        ]}
      />
      {/* Hero - Standardized DarkHeroSection */}
      <DarkHeroSection
        title={
          <>
            Acelere o crescimento da sua empresa B2B{' '}
            <span className="text-[#00CC6A]">junto a 500+ líderes de receita.</span>
          </>
        }
        subtitle="Rede fechada de diretores, founders e líderes de RevOps com troca direta de playbooks e benchmarks."
      />

      {/* Benefits Grid, Fundo 100% Branco Puro (Sem Verde no Branco) */}
      <section className="py-20 bg-white text-zinc-900 border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <h2 className="text-zinc-900 text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Uma rede que acelera resultados
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
              Troca direta de inteligência operacional com quem está escalando receita no campo de batalha.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: 'Aprendizado Contínuo', desc: 'Acesso a conteúdos exclusivos, webinars e discussões avançadas com especialistas do mercado.' },
              { title: 'Networking Estratégico', desc: 'Conecte-se com executivos C-Level e amplie sua rede de relacionamentos e parcerias.' },
              { title: 'Playbooks & Benchmarks', desc: 'Acesso direto a estratégias provadas, ferramentas e estruturas operacionais que funcionam.' },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl bg-zinc-50/70 border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 transition-all space-y-2">
                <span className="text-zinc-400 font-sans font-semibold text-xs tracking-wider block">
                  0{i + 1} / BENEFÍCIO
                </span>
                <h3 className="text-zinc-900 font-bold text-lg tracking-tight">{item.title}</h3>
                <p className="text-zinc-500 text-xs leading-relaxed font-normal">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-center">
            <a href="https://academy.revhackers.com.br/" target="_blank" rel="noopener noreferrer">
              <Button className="bg-zinc-950 text-white hover:bg-zinc-800 font-bold text-sm h-12 px-8 rounded-xl shadow-xs transition-all">
                Solicitar Acesso à Comunidade →
              </Button>
            </a>
          </div>

        </div>
      </section>

      {/* Features - Logo + List */}
      <Section variant="light" className="py-24 bg-white border-b border-zinc-200">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

              {/* Left Column: Logo */}
              <div className="bg-white p-12 border border-zinc-200 flex items-center justify-center rounded-xl">
                <img
                  src="/brand/revhackers-wordmark.png"
                  alt="RevHackers"
                  className="w-64 md:w-80 h-auto opacity-80"
                />
              </div>

              {/* Right Column: Content */}
              <div className="space-y-10">
                <div>
                  <span className="font-sans text-xs text-zinc-500 uppercase tracking-[0.2em] mb-4 block">
                    // Benefícios Exclusivos
                  </span>
                  <h2 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">
                    Plataforma completa para sua carreira<span className="text-revgreen">.</span>
                  </h2>
                </div>

                <div className="space-y-6">
                  {[
                    { icon: MessageSquare, title: 'Fóruns de discussão', desc: 'Conversas temáticas sobre os principais desafios de RevOps.' },
                    { icon: Calendar, title: 'Meetups exclusivos', desc: 'Encontros presenciais e online com os melhores do mercado.' },
                    { icon: Video, title: 'Bootcamps especializados', desc: 'Treinamentos intensivos para desenvolver habilidades práticas.' },
                    { icon: BookOpen, title: 'Biblioteca de recursos', desc: 'Templates, playbooks e ferramentas validadas pela comunidade.' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="flex-shrink-0 w-10 h-10 bg-white border border-zinc-200 flex items-center justify-center group-hover:border-revgreen/50 transition-colors rounded-lg">
                        <item.icon className="text-zinc-500 group-hover:text-revgreen transition-colors" size={18} />
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-zinc-900">{item.title}</h3>
                        <p className="text-zinc-500 text-sm font-light">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <Section variant="light" className="py-24 bg-white border-t border-zinc-200">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">
              Faça parte da elite<span className="text-revgreen">.</span>
            </h2>
            <p className="text-xl text-zinc-500 mb-12 font-light">
              Junte-se ao maior hub de profissionais de RevOps do Brasil.
            </p>

            <a href="https://academy.revhackers.com.br/" target="_blank" rel="noopener noreferrer">
              <Button className="btn-aggressive h-16 px-12 text-base">
                Entrar na Comunidade
              </Button>
            </a>
          </div>
        </div>
      </Section>
    </PageLayout>
  );
};

export default Comunidade;
