import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import { GhlFormEmbed } from '@/components/shared/GhlFormEmbed';
import { GHL_FORMS } from '@/config/ghl';
import PageLayout from '@/components/layout/PageLayout';
import SEO from '@/components/shared/SEO';
import { Button } from '@/components/ui/button';
import { materialsData } from '@/data/materialsData';

const getSlugFromTitle = (title: string) => {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

const formatHeadlineWithGreen = (text: string) => {
    if (!text) return null;
    const clean = text.replace(/<[^>]*>/g, '');
    if (clean.includes(':')) {
        const parts = clean.split(':');
        return (
            <>
                {parts[0]}: <span className="text-[#00CC6A]">{parts.slice(1).join(':')}</span>
            </>
        );
    }
    const words = clean.split(' ');
    if (words.length >= 4) {
        const main = words.slice(0, Math.ceil(words.length * 0.55)).join(' ');
        const highlight = words.slice(Math.ceil(words.length * 0.55)).join(' ');
        return (
            <>
                {main} <span className="text-[#00CC6A]">{highlight}</span>
            </>
        );
    }
    return <span className="text-white">{clean}</span>;
};

export default function MaterialLanding() {
    const { slug } = useParams<{ slug: string }>();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    const foundMaterial = materialsData.find((m) => m.slug === slug || getSlugFromTitle(m.title) === slug);
    const material = foundMaterial && {
        slug: foundMaterial.slug,
        title: foundMaterial.title.replace(/<[^>]*>/g, ''),
        headline: foundMaterial.title.replace(/<[^>]*>/g, ''),
        subheadline: foundMaterial.description.replace(/<[^>]*>/g, '').substring(0, 160),
        description: foundMaterial.description,
        type: foundMaterial.type || foundMaterial.material_type || 'Material',
        linkMaterial: foundMaterial.link_material,
    };

    if (material && !material.linkMaterial) console.error('[MaterialLanding] link_material ausente', material.slug);

    if (!material) {
        return (
            <PageLayout>
                <div className="min-h-[70vh] bg-black flex flex-col items-center justify-center px-6 text-center">
                    <h1 className="text-2xl font-bold text-white tracking-tight mb-3">Material não encontrado</h1>
                    <p className="text-zinc-400 text-sm mb-8 max-w-md">O material solicitado pode ter sido atualizado ou relocado.</p>
                    <Button asChild className="bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 font-semibold text-xs h-10 px-5 rounded-lg">
                        <Link to="/materiais">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Ver todos os materiais
                        </Link>
                    </Button>
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            <SEO
                title={material.headline}
                description={material.subheadline || 'Material gratuito RevHackers'}
                canonical={`https://revhackers.com.br/materiais/${slug}`}
            />
            {/* Hero Section — Fundo Black Purificado */}
            <section className="relative min-h-[50vh] flex flex-col justify-center items-center overflow-hidden pt-28 pb-16 bg-black border-b border-zinc-900">
                <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center text-center">
                    
                    <span className="text-[#00CC6A] text-xs font-semibold uppercase tracking-wider mb-4">
                        {material.type}
                    </span>

                    <h1 className="font-sans text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] font-extrabold text-white mb-5 leading-[1.15] tracking-tight text-center max-w-3xl mx-auto">
                        {formatHeadlineWithGreen(material.headline)}
                    </h1>

                    <p className="text-zinc-400 mb-6 text-base md:text-lg font-normal leading-relaxed max-w-2xl mx-auto text-center">
                        {material.subheadline}
                    </p>

                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
                        <span>Material 100% Gratuito</span>
                        <span>•</span>
                        <span>Download Instantâneo</span>
                    </div>
                </div>
            </section>

            {/* Content & Form Section — Fundo 100% Branco Puro com Contexto Rico */}
            <section className="py-16 md:py-24 bg-white text-zinc-900 border-b border-zinc-200/80">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                        
                        {/* Coluna Esquerda: Headline H1 proeminente, Subheadline H2 e Bullet points SEO/GEO */}
                        <div className="lg:col-span-6 space-y-8 text-left py-2">
                            <div className="space-y-4">
                                <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-zinc-950 tracking-tight leading-[1.15]">
                                    Implemente os melhores frameworks de <span className="text-[#00CC6A]">Growth, GTM Engineering &amp; ABM + IA</span> na sua operação.
                                </h1>
                                <h2 
                                    className="text-base sm:text-lg text-zinc-600 font-normal leading-relaxed space-y-3 pt-1"
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(
                                          `Baixe o ${material.type} <strong>${material.title}</strong> oficial da RevHackers. Conteúdo prático, ferramentas e checklists validados em mais de R$ 50M em pipeline acelerado.`
                                        )
                                    }}
                                />
                            </div>

                            {/* O que você vai receber - Bullets limpos */}
                            <div className="space-y-4 pt-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                                    O que você vai receber:
                                </h3>
                                <ul className="space-y-3.5 text-sm">
                                    <li className="flex items-start gap-3 text-zinc-700 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-[#00CC6A] mt-2 shrink-0" />
                                        <span>Metodologia prática e aplicável imediatamente na sua operação B2B.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-zinc-700 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-[#00CC6A] mt-2 shrink-0" />
                                        <span>Templates e checklists validados com mais de R$ 50M em pipeline auditado.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-zinc-700 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-[#00CC6A] mt-2 shrink-0" />
                                        <span>Acesso direto ao material oficial sem custos ou pegadinhas.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Coluna Direita: Formulário Padronizado para Download de Materiais */}
                        <div className="lg:col-span-6 bg-white border border-zinc-200/90 p-8 sm:p-10 rounded-3xl shadow-lg space-y-6 sticky top-28 text-left">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Baixe seu material</h3>
                                <p className="text-xs sm:text-sm text-zinc-500">Preencha com seus dados corporativos para liberar o acesso imediato.</p>
                            </div>
                            
                            {material.linkMaterial ? (
                                <GhlFormEmbed
                                    formId={GHL_FORMS.materiais}
                                    title="Baixar material"
                                    params={{ material_slug: material.slug, material_title: material.title, material_link: material.linkMaterial }}
                                    minHeight={520}
                                />
                            ) : (
                                <p className="text-sm text-zinc-500">Material indisponível no momento.</p>
                            )}
                        </div>

                    </div>
                </div>
            </section>
        </PageLayout>
    );
}
