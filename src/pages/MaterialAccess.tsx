import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import SEO from '@/components/shared/SEO';
import { Button } from '@/components/ui/button';
import { materialsData } from '@/data/materialsData';

export default function MaterialAccess() {
    const { slug } = useParams<{ slug: string }>();
    const material = materialsData.find((m) => m.slug === slug);

    useEffect(() => {
        if (material?.link_material) {
            window.location.replace(material.link_material);
        }
    }, [material]);

    if (!material || !material.link_material) {
        return (
            <PageLayout>
                <Helmet>
                    <meta name="robots" content="noindex,nofollow" />
                </Helmet>
                <SEO title="Material não encontrado" description="O material solicitado não foi encontrado." />
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
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
            <Helmet>
                <meta name="robots" content="noindex,nofollow" />
            </Helmet>
            <SEO title="Redirecionando..." description="Acessando material oficial RevHackers." />
            <div className="w-10 h-10 border-2 border-zinc-800 border-t-revgreen rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Redirecionando para o material...</p>
        </div>
    );
}
