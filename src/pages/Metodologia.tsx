import { useEffect } from 'react';
import { Database, Layers, Target, Cpu, Network, Lock, Zap, CheckCircle2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Section from '@/components/ui/Section';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import SEO from '@/components/shared/SEO';
import ModernTechnicalBackground from '@/components/shared/ModernTechnicalBackground';

const Metodologia = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-black selection:text-white">
            <SEO
                title="Metodologia RevOps - Como Funciona a Consultoria"
                description="Conheça a metodologia RevHackers: Diagnóstico, Fundação, Growth Loops e Escala. Integramos IA, CRM e automação para eliminar vazamentos de receita em operações B2B."
                canonical="https://revhackers.com.br/metodologia"
                breadcrumbs={[
                    { name: "Home", url: "https://revhackers.com.br/" },
                    { name: "Metodologia", url: "https://revhackers.com.br/metodologia" }
                ]}
                faq={[
                    { question: "Qual é a metodologia da RevHackers?", answer: "A metodologia RevHackers é baseada em 4 pilares: Aquisição Previsível (campanhas B2B com CAC calculado), IA para Filtragem (qualificação automatizada de leads), Automação de Follow-Up (sistemas que perseguem leads 24h) e CRM Vault (configuração blindada de CRM para registrar cada oportunidade)." }
                ]}
            />
            <Header />

            {/* --- HERO SECTION (BLACK) --- */}
            <section className="relative overflow-hidden bg-black py-20 md:py-28 border-b border-zinc-900">
                <ModernTechnicalBackground />
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-6">
                    <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-[1.2] tracking-tight text-center max-w-3xl mx-auto">
                        Multiplique seu pipeline B2B por 3x em 90 dias <span className="text-[#00CC6A]">sem contratar mais vendedores.</span>
                    </h1>
                    <p className="text-zinc-300 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-2xl mx-auto text-center">
                        Instalamos a metodologia de Revenue Engineering que integra GTM, RevOps e IA para automatizar 80% das rotinas operacionais de vendas.
                    </p>
                    <div className="pt-2 flex justify-center">
                        <Button asChild className="bg-[#00CC6A] text-zinc-950 hover:bg-[#00b35e] font-extrabold text-sm sm:text-base h-12 px-8 rounded-xl shadow-lg transition-all">
                            <Link to="/booking">Auditar Minha Operação →</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* --- PILLARS GRID (WHITE SECTION), Fundo 100% Branco Puro (Sem Caixas de Ícones) --- */}
            <section className="py-20 bg-white text-zinc-900 border-b border-zinc-200/80">
                <div className="max-w-6xl mx-auto px-6 space-y-12">
                    <div className="max-w-2xl mx-auto text-center space-y-2">
                        <h2 className="text-zinc-900 text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                            A Engenharia da Venda
                        </h2>
                        <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
                            Nós não vendemos horas de consultoria. Nós montamos estes 4 motores na sua operação.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {/* Pillar 1 */}
                        <div className="p-6 rounded-xl bg-zinc-50/70 border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 transition-all space-y-2">
                            <span className="text-zinc-400 font-sans font-semibold text-xs tracking-wider block">
                                01 / PILAR
                            </span>
                            <h3 className="text-zinc-900 font-bold text-lg tracking-tight">1. Aquisição Previsível</h3>
                            <p className="text-zinc-500 text-xs leading-relaxed font-normal">
                                Operamos campanhas B2B injetando previsibilidade matemática. Extraímos leads do mercado (Inbound/Outbound) com teto calculado de CAC.
                            </p>
                        </div>

                        {/* Pillar 2 */}
                        <div className="p-6 rounded-xl bg-zinc-50/70 border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 transition-all space-y-2">
                            <span className="text-zinc-400 font-sans font-semibold text-xs tracking-wider block">
                                02 / PILAR
                            </span>
                            <h3 className="text-zinc-900 font-bold text-lg tracking-tight">2. IA Filtra Curiosos</h3>
                            <p className="text-zinc-500 text-xs leading-relaxed font-normal">
                                Entrou lead sujo? Seus vendedores não falam com ele. Nossa IA de qualificação corta quem não tem verba e agenda quem tem dor real.
                            </p>
                        </div>

                        {/* Pillar 3 */}
                        <div className="p-6 rounded-xl bg-zinc-50/70 border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 transition-all space-y-2">
                            <span className="text-zinc-400 font-sans font-semibold text-xs tracking-wider block">
                                03 / PILAR
                            </span>
                            <h3 className="text-zinc-900 font-bold text-lg tracking-tight">3. Automação de Follow-Up</h3>
                            <p className="text-zinc-500 text-xs leading-relaxed font-normal">
                                Seu vendedor esqueceu de ligar? O sistema não. Plugamos robôs que perseguem o lead com consistência até ele preencher o calendário.
                            </p>
                        </div>

                        {/* Pillar 4 */}
                        <div className="p-6 rounded-xl bg-zinc-50/70 border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 transition-all space-y-2">
                            <span className="text-zinc-400 font-sans font-semibold text-xs tracking-wider block">
                                04 / PILAR
                            </span>
                            <h3 className="text-zinc-900 font-bold text-lg tracking-tight">4. CRM Vault (Cofre de Dados)</h3>
                            <p className="text-zinc-500 text-xs leading-relaxed font-normal">
                                CRM configurado como um relógio suíço. Zero pipeline viciado, zero oportunidade perdida sem justificativa técnica registrada.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PROCESS/ROADMAP (WHITE MINIMAL) --- */}
            <section className="py-32 bg-white relative border-t border-zinc-100">
                <div className="container-custom">
                    <div className="flex flex-col md:flex-row gap-20 items-start">
                        <div className="md:w-1/3 md:sticky md:top-32">
                            <h2 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">
                                Ciclo de<br />Implementação
                            </h2>
                            <p className="text-zinc-500 mb-10 text-lg font-light tracking-tight">
                                Como aplicamos nossa metodologia no seu negócio, passo a passo.
                            </p>
                            <Button asChild className="bg-zinc-100 text-black hover:bg-black hover:text-white border border-zinc-200 hover:border-black transition-all rounded-lg px-8 h-12 text-xs font-bold uppercase tracking-tight shadow-sm">
                                <Link to="/booking">Iniciar Ciclo</Link>
                            </Button>
                        </div>

                        <div className="md:w-2/3 space-y-20 relative border-l border-zinc-200 pl-12 md:pl-20 ml-6 md:ml-0 warning-timeline">
                            {/* Step 1 */}
                            <div className="relative group">
                                <span className="absolute -left-[67px] md:-left-[99px] top-1 w-12 h-12 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-black text-sm font-bold font-sans group-hover:border-black group-hover:bg-black group-hover:text-white transition-all shadow-sm">01</span>
                                <h3 className="text-base md:text-lg font-bold text-zinc-900">Diagnóstico Deep Dive</h3>
                                <p className="text-sm md:text-base font-normal text-zinc-500 leading-relaxed">Mergulhamos nos seus dados atuais, auditamos seu CRM e entrevistamos stakeholders para identificar os gargalos reais de receita.</p>
                            </div>

                            {/* Step 2 */}
                            <div className="relative group">
                                <span className="absolute -left-[67px] md:-left-[99px] top-1 w-12 h-12 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 text-sm font-bold font-sans group-hover:border-black group-hover:bg-black group-hover:text-white transition-all shadow-sm">02</span>
                                <h3 className="text-base md:text-lg font-bold text-zinc-900">Fundação de Revenue</h3>
                                <p className="text-sm md:text-base font-normal text-zinc-500 leading-relaxed">Arrumamos a casa. Limpeza de dados, configuração de tracking correto, definição de ICP e implementação da arquitetura correta de CRM.</p>
                            </div>

                            {/* Step 3 */}
                            <div className="relative group">
                                <span className="absolute -left-[67px] md:-left-[99px] top-1 w-12 h-12 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 text-sm font-bold font-sans group-hover:border-black group-hover:bg-black group-hover:text-white transition-all shadow-sm">03</span>
                                <h3 className="text-base md:text-lg font-bold text-zinc-900">Growth Loops</h3>
                                <p className="text-sm md:text-base font-normal text-zinc-500 leading-relaxed">Implementação das campanhas de aquisição e réguas de nutrição. Início dos testes A/B de conversão e otimização de canais pagos.</p>
                            </div>

                            {/* Step 4 */}
                            <div className="relative group">
                                <span className="absolute -left-[67px] md:-left-[99px] top-1 w-12 h-12 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 text-sm font-bold font-sans group-hover:border-black group-hover:bg-black group-hover:text-white transition-all shadow-sm">04</span>
                                <h3 className="text-base md:text-lg font-bold text-zinc-900">Escala & Otimização</h3>
                                <p className="text-sm md:text-base font-normal text-zinc-500 leading-relaxed">Refinamento contínuo baseado em dados de coorte. Expansão para novos canais e automação avançada de retenção.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CTA FINAL (LIGHT) --- */}
            <section className="py-24 bg-zinc-50 border-t border-zinc-200 relative overflow-hidden">
                <div className="container-custom text-center relative z-10">
                    <h2 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">
                        Pare de queimar caixa <span className="text-zinc-500 line-through">adivinhando</span>.
                    </h2>
                    <p className="text-sm md:text-base font-normal text-zinc-500 mb-12 max-w-2xl mx-auto tracking-tight">
                        Deixe a IA e o CRM trabalharem suas conversões. Vagas Restritas (Max 3/mês).
                    </p>
                    <Button asChild className="bg-black text-white hover:bg-[#00CC6A] hover:text-black font-semibold text-sm h-11 px-6 rounded-lg uppercase transition-all shadow-sm hover:translate-y-[-2px]">
                        <Link to="/booking">Auditar Minha Operação</Link>
                    </Button>

                    <div className="mt-8 flex items-center justify-center gap-2 text-xxs font-bold uppercase tracking-tight text-zinc-400">
                        <CheckCircle2 className="w-4 h-4 text-black" />
                        <span>Diagnóstico confidencial e sem compromisso.</span>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Metodologia;
