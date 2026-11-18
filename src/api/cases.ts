
import type { Database } from "@/integrations/supabase/types";
import { casesData } from '@/data/cases';

export type CaseStudy = Database['public']['Tables']['cases']['Row'];

const CASE_OVERRIDES: Record<string, { logo?: string; scale?: number }> = {
    'Heineken': {
        logo: '/uploads/aada4820-3f12-4185-9af6-811f30795a93.png',
        scale: 1.0
    },
    'FMU': {
        logo: '/uploads/e0d3d03b-c1d5-4a6e-9a61-3a1c2a707b5f.png',
        scale: 1.0
    },
    'Anhembi': {
        logo: '/uploads/f5e74a47-fc77-4b34-970e-e839080310fd.png',
        scale: 1.0
    },
    'Cruzeiro': {
        logo: '/uploads/cruzeiro-site-dark.svg',
        scale: 1.0
    },
    'Cruzeiro do Sul': {
        logo: '/uploads/cruzeiro-site-dark.svg',
        scale: 1.0
    },
    'Cruzeiro do Sul Virtual': {
        logo: '/uploads/cruzeiro-site-dark.svg',
        scale: 1.0
    },
    'Idee': {
        logo: '/uploads/oftw/694c73dcdda192452a508485.png',
        scale: 1.0
    },
    'Lindoya': {
        logo: '/uploads/lindoya-logo.png',
        scale: 1.0
    },
    'Emagrecentro': {
        logo: '/uploads/emagrecentro-logo-new.png',
        scale: 1.0
    },
    'ENICS': {
        logo: '/uploads/a05718ad-1822-4102-909a-7e86af151e98.png',
        scale: 1.0
    },
    'TOEFL': {
        logo: '/uploads/oftw/6959970205b5117729df4a50.png',
        scale: 1.0
    },
    'Tikpag': {
        logo: '/uploads/tikpag-logo-final.png',
        scale: 1.0
    },
    'Agence': {
        logo: '/uploads/6c09375e-5298-4672-9226-27eb60a6b038.png',
        scale: 1.0
    },
    'BT': {
        logo: '/uploads/bt-logo-new.png',
        scale: 1.0
    },
    'Tegra': {
        logo: '/uploads/tegra-logo-new.png',
        scale: 1.0
    },
    'Funnels': {
        logo: '/brand/funnels-logo-black.png',
        scale: 1.0
    },
    'Enove': {
        logo: '/uploads/enove-logo.svg',
        scale: 1.0
    },
    'Enove Imobiliária': {
        logo: '/uploads/enove-logo.svg',
        scale: 1.0
    },
    'PlacLux': {
        logo: '/uploads/oftw/694c76cfe889d38ced51667d.png',
        scale: 1.0
    },
    'BLDN': {
        logo: '/uploads/oftw/694c77062fe4f1854fadf797.svg',
        scale: 1.0
    }
};

const applyOverrides = (c: CaseStudy): CaseStudy & { logoScale?: number } => {
    const title = c.client_name || c.title || '';
    // Check exact title or partial match for flexibility
    const overrideKey = Object.keys(CASE_OVERRIDES).find(key => title.includes(key)) || title;
    const override = CASE_OVERRIDES[overrideKey];

    if (override) {
        return {
            ...c,
            client_logo: override.logo || c.client_logo,
            // @ts-ignore - Injecting runtime property for frontend use
            logoScale: override.scale || 1.0
        };
    }
    return c;
};

const ALL_LOCAL_CASES: any[] = Object.entries(casesData).map(([slugKey, c]) => ({
    id: `case-${slugKey}`,
    title: c.title,
    client_name: c.title,
    slug: slugKey,
    case_category: c.category || 'Go-To-Market',
    preview_description: c.preview_description || c.challenge?.substring(0, 160) || c.solution?.substring(0, 160) || '',
    client_logo: c.logo || c.whiteLogo || '',
    published: true,
    featured: true,
    created_at: new Date().toISOString(),
    metrics: c.metrics || []
}));

export const getAllCases = (): CaseStudy[] => ALL_LOCAL_CASES.map(applyOverrides);

export const getCaseBySlug = (slug: string): CaseStudy | null => {
    const localMatch = ALL_LOCAL_CASES.find(c => c.slug === slug);
    return localMatch ? applyOverrides(localMatch) : null;
};

export const getFeaturedCases = (): CaseStudy[] => ALL_LOCAL_CASES.slice(0, 6).map(applyOverrides);
