import { Helmet, HelmetProvider } from 'react-helmet-async';
import { buildSeoTitle, getRobotsContent, resolveOgImage, stripHtml } from '@/lib/seo';

interface SEOProps {
    title: string;
    description: string;
    canonical?: string;
    image?: string;
    type?: 'website' | 'article';
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    breadcrumbs?: { name: string; url: string }[];
    faq?: { question: string; answer: string }[];
    wordCount?: number;
    keywords?: string[];
    /** Forca `noindex, nofollow` (alem das rotas privadas ja cobertas por isNoIndexPath). */
    noindex?: boolean;
}

export const SEOProvider = ({ children }: { children: React.ReactNode }) => {
    return <HelmetProvider>{children}</HelmetProvider>;
};

const SEO = ({
    title,
    description,
    canonical,
    image,
    type = 'website',
    publishedTime,
    modifiedTime,
    author = "RevHackers",
    breadcrumbs,
    faq,
    wordCount,
    keywords,
    noindex = false,
}: SEOProps) => {

    const currentUrl = canonical || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
    const fullTitle = buildSeoTitle(title);
    const ogImage = resolveOgImage(currentUrl, image);
    const robotsContent = getRobotsContent(typeof window !== 'undefined' ? window.location.pathname : '', noindex);

    // Schema.org: Person (Founder Authority - Giulliano Alves)
    const founderSchema = {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": "https://revhackers.com.br/#giulliano",
        "name": "Giulliano Alves",
        "jobTitle": "Founder & Chief Revenue Engineer",
        "worksFor": {
            "@type": "Organization",
            "name": "RevHackers",
            "url": "https://revhackers.com.br"
        },
        "url": "https://www.linkedin.com/in/giullianoalves/",
        "image": "https://revhackers.com.br/uploads/giulliano-linkedin-profile.png",
        "sameAs": [
            "https://www.linkedin.com/in/giullianoalves/",
            "https://revhackers.com.br/quem-somos"
        ],
        "knowsAbout": [
            "Revenue Operations",
            "RevOps",
            "Go-To-Market Engineering",
            "B2B SaaS Growth",
            "CRM Architecture",
            "AI Sales Agents"
        ]
    };

    // Schema.org: ProfessionalService & LocalBusiness (GEO-SEO)
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": ["ProfessionalService", "LocalBusiness"],
        "@id": "https://revhackers.com.br/#organization",
        "name": "RevHackers",
        "alternateName": ["RevHackers", "RevHackers Consultoria", "RevHackers RevOps B2B"],
        "url": "https://revhackers.com.br",
        "logo": {
            "@type": "ImageObject",
            "url": "https://revhackers.com.br/brand/revhackers-mark.png",
            "width": 256,
            "height": 256
        },
        "image": "https://revhackers.com.br/uploads/giulliano-linkedin-profile.png",
        "description": "Consultoria líder de Revenue Operations e GTM Engineering no Brasil. Arquitetura de CRM, Agentes de IA e Geração de Demanda B2B.",
        "slogan": "Revenue Architecture for B2B Growth",
        "foundingDate": "2023",
        "founder": { "@id": "https://revhackers.com.br/#giulliano" },
        "founders": [
            { "@id": "https://revhackers.com.br/#giulliano" }
        ],
        "sameAs": [
            "https://www.linkedin.com/company/revhackers",
            "https://www.linkedin.com/in/giullianoalves/"
        ],
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Av. Brig. Faria Lima",
            "addressLocality": "São Paulo",
            "addressRegion": "SP",
            "addressCountry": "BR",
            "postalCode": "01452-000"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": -23.55052,
            "longitude": -46.633308
        },
        "areaServed": [
            { "@type": "City", "name": "São Paulo" },
            { "@type": "City", "name": "Itaim Bibi" },
            { "@type": "City", "name": "Faria Lima" },
            { "@type": "City", "name": "Rio de Janeiro" },
            { "@type": "City", "name": "Curitiba" },
            { "@type": "City", "name": "Belo Horizonte" },
            { "@type": "Country", "name": "Brasil" }
        ],
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Serviços de Revenue Operations",
            "itemListElement": [
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Implementação de CRM B2B", "url": "https://revhackers.com.br/servicos/ecossistema-crm" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Automação de Vendas com IA", "url": "https://revhackers.com.br/servicos/automacao-inteligente" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Founder-Led Growth & Social Selling", "url": "https://revhackers.com.br/servicos/founder-led-growth" } }
            ]
        },
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "sales",
            "url": "https://revhackers.com.br/booking",
            "availableLanguage": ["Portuguese", "English"]
        },
        "priceRange": "$$$"
    };

    // Schema.org: Sitelinks Navigation Elements (Para forçar sitelinks corretos no Google)
    const sitelinksSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": [
            {
                "@type": "SiteNavigationElement",
                "position": 1,
                "name": "Metodologia",
                "url": "https://revhackers.com.br/metodologia"
            },
            {
                "@type": "SiteNavigationElement",
                "position": 2,
                "name": "Ecossistema de Serviços",
                "url": "https://revhackers.com.br/servicos"
            },
            {
                "@type": "SiteNavigationElement",
                "position": 3,
                "name": "Cases de Sucesso",
                "url": "https://revhackers.com.br/cases"
            },
            {
                "@type": "SiteNavigationElement",
                "position": 4,
                "name": "Central de Diagnósticos",
                "url": "https://revhackers.com.br/diagnostico"
            },
            {
                "@type": "SiteNavigationElement",
                "position": 5,
                "name": "Quem Somos & Founder",
                "url": "https://revhackers.com.br/quem-somos"
            },
            {
                "@type": "SiteNavigationElement",
                "position": 6,
                "name": "Blog de GTM",
                "url": "https://revhackers.com.br/blog"
            }
        ]
    };

    // Schema.org: WebSite (sem SearchAction: o blog nao le o parametro ?q= da URL)
    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": "https://revhackers.com.br/#website",
        "url": "https://revhackers.com.br",
        "name": "RevHackers",
        "description": "A primeira consultoria de Revenue Operations do Brasil.",
        "publisher": { "@id": "https://revhackers.com.br/#organization" },
        "inLanguage": "pt-BR"
    };

    // Schema.org: BlogPosting (for blog posts - more specific type, better SEO indexing)
    const articleSchema = type === 'article' ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": stripHtml(title).substring(0, 110), // Google limits headline to 110 chars
        "image": [ogImage],
        ...(publishedTime ? { "datePublished": publishedTime } : {}),
        ...((modifiedTime || publishedTime) ? { "dateModified": modifiedTime || publishedTime } : {}),
        "author": [{
            "@type": author === "RevHackers" ? "Organization" : "Person",
            "name": author,
            "url": "https://revhackers.com.br/quem-somos"
        }],
        "publisher": {
            "@type": "Organization",
            "name": "RevHackers",
            "logo": {
                "@type": "ImageObject",
                "url": "https://revhackers.com.br/brand/revhackers-mark.png",
                "width": 256,
                "height": 256
            }
        },
        "description": description,
        ...(wordCount ? { "wordCount": wordCount } : {}),
        ...(keywords && keywords.length > 0 ? { "keywords": keywords.join(', ') } : {}),
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": currentUrl
        },
        "url": currentUrl,
        "inLanguage": "pt-BR",
        "isPartOf": {
            "@type": "Blog",
            "@id": "https://revhackers.com.br/blog",
            "name": "Blog RevHackers",
            "publisher": { "@id": "https://revhackers.com.br/#organization" }
        },
        "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1", ".article-content p:first-of-type"]
        }
    } : null;

    // BreadcrumbList Schema (enables rich snippets in SERPs)
    const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0 ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url
        }))
    } : null;

    // FAQPage Schema (enables FAQ rich snippets)
    const faqSchema = faq && faq.length > 0 ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faq.map(item => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
            }
        }))
    } : null;

    // Combine all schemas
    const schemas: any[] = [organizationSchema, websiteSchema, founderSchema, sitelinksSchema];
    if (articleSchema) schemas.push(articleSchema);
    if (breadcrumbSchema) schemas.push(breadcrumbSchema);
    if (faqSchema) schemas.push(faqSchema);

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={currentUrl} />

            {/* Language / GEO / International */}
            <html lang="pt-BR" />
            <meta property="og:locale" content="pt_BR" />
            <link rel="alternate" hrefLang="pt-BR" href={currentUrl} />
            <link rel="alternate" hrefLang="x-default" href={currentUrl} />

            {/* Open Graph / Facebook / LinkedIn */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:alt" content={fullTitle} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:site_name" content="RevHackers" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />

            {/* GEO / Local SEO Signals (Critical for GEO ranking) */}
            <meta name="robots" content={robotsContent} />
            <meta name="geo.region" content="BR-SP" />
            <meta name="geo.placename" content="São Paulo" />
            <meta name="geo.position" content="-23.5505;-46.6333" />
            <meta name="ICBM" content="-23.5505, -46.6333" />

            {/* AI / GEO Optimization (Helps AI engines extract and cite content) */}
            <meta name="format-detection" content="telephone=no" />

            {publishedTime && <meta property="article:published_time" content={publishedTime} />}
            {author && <meta name="author" content={author} />}

            {/* Knowledge Graph + Structured Data Injection */}
            <script type="application/ld+json">
                {JSON.stringify(schemas)}
            </script>
        </Helmet>
    );
};

export default SEO;
