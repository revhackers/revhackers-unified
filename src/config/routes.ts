/**
 * Dicionário Universal de Rotas da RevHackers.
 * Mapeado ESTRITAMENTE a partir das rotas reais do App.tsx.
 * Última sincronização: 30/07/2026
 *
 * NOTA: Não adicione rotas aqui se elas não existirem no App.tsx.
 */

export const APP_ROUTES = {
  PUBLIC: {
    HOME: '/',
    BLOG: '/blog',
    BLOG_POST: '/blog/:slug',
    DIAGNOSTICO: '/diagnostico',
    QUEM_SOMOS: '/quem-somos',
    SERVICOS: '/servicos',
    SERVICOS_DETALHE: '/servicos/:slug',
    METODOLOGIA: '/metodologia',
    CASES: '/cases',
    CASES_DETALHE: '/cases/:slug',
    PARTNER_DETAIL: '/partners/:slug',
    PARTNER_ENICS: '/partners/enics',
    DOWNLOADS: '/downloads',
    MATERIAIS: '/materiais',
    MATERIAL_LANDING: '/materiais/:slug',
    MATERIAL_THANK_YOU: '/materiais/obrigado',
    MATERIAL_ACCESS: '/materiais/acesso/:slug',
    COMUNIDADE: '/comunidade',
    BOOKING: '/booking',
    AGENDA: '/agenda', // redirects to /booking
    AGENDA_DIAGNOSTICO: '/agenda-diagnostico', // redirects to /booking
  },
  LEGAL_AND_FEEDBACK: {
    TERMOS_DE_USO: '/termos-de-uso',
    PRIVACIDADE: '/privacidade',
    THANK_YOU: '/obrigado',
    PESQUISA_NPS: '/pesquisa-nps',
    OBRIGADO_NPS: '/obrigado-nps',
  },
  SPECIALIZED: {
    AGENDA_GIULLIANO_SECURE: '/agenda/giulliano', // redirects to /booking
    AGENDA_GIULLIANO: '/agenda-giulliano',
    AGENDA_LUNA: '/agenda-luna', // redirects to /booking
    AGENDA_LINKEDIN: '/agenda-linkedin', // redirects to /booking
    AGENDA_KICKOFF: '/agenda-kickoff', // redirects to /booking
    CADASTRO_PARCEIRO: '/cadastro-parceiro',
  },
  SCORES: {
    GROWTH_SCORE: '/score',
    SITE_SCORE: '/score-site',
    FOUNDER_SCORE: '/score-founder',
    REVENUE_SCORE: '/score-revenue',
  },
} as const;
