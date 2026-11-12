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
    PUBLIC_DEAL_ROOM: '/p/:slug',
    PUBLIC_DEAL_ROOM_LEGACY: '/p/:slug/legacy',
    PUBLIC_GROWTHMAP: '/public/growthmap/:share_token',
    PUBLIC_KICKOFF: '/public/kickoff/:id',
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
    SUPABASE_DIAGNOSTIC: '/supabase-diagnostic',
    CLIENT_ONBOARDING: '/cadastro-cliente',
    ONBOARDING_SUCCESS: '/onboarding/success',
    MATERIAL_UPLOAD: '/upload-materiais/:projectId',
  },
  LEGAL_AND_FEEDBACK: {
    TERMOS_DE_USO: '/termos-de-uso',
    PRIVACIDADE: '/privacidade',
    THANK_YOU: '/obrigado',
    PESQUISA_NPS: '/pesquisa-nps',
    OBRIGADO_NPS: '/obrigado-nps',
    CERTIFICADO: '/legal/certificado/:hash',
    APPROVE: '/approve/:token',
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
  REI: {
    HUB_REDIRECT: '/rei', // redirects to /admin/projects
    HUB: '/rei-hub', // redirects to /admin/projects
    WIZARD: '/rei/wizard',
    RESULT: '/rei/resultado/:id',
    SUCCESS: '/rei/success',
    DEV: '/rei-dev',
    CONSULTING: '/rei-consulting',
    FOUNDER: '/rei-founder',
    LEGACY_ONBOARDING: '/rei-onboarding', // redirects to /admin/projects
    LEGACY_DASHBOARD: '/rei-dashboard', // redirects to /admin/projects
  },
  AUTH: {
    LOGIN: '/login',
    SIGNUP: '/signup', // redirects to /login
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    COMPLETE_PROFILE: '/complete-profile',
  },
  ADMIN: {
    ROOT_REDIRECT: '/admin',
    DASHBOARD: '/admin/dashboard', // redirects to /admin
    GLOBAL_DASHBOARD: '/dashboard', // GrowthMap page
    PROJECTS: '/admin/projects',
    PROJECT_DETAILS: '/admin/projects/:id/*',
    REI_PROJECTS: '/admin/rei', // redirects to /admin/projects
    REI_PROJECT_NEW: '/admin/rei/novo',
    REI_PROJECT_EDIT: '/admin/rei/:id',
    ORCHESTRATED_ONBOARDING: '/admin/jornada/:id',
    STRATEGIC_PLAN: '/admin/planejamento/:reiProjectId',
    PROFILE: '/admin/profile',
    SETTINGS: '/admin/settings', // redirects to /admin/profile
    USERS: '/admin/users',
    CLIENTS: '/admin/clients',
    CLIENT_NEW: '/admin/clients/novo',
    CLIENT_EDIT: '/admin/clients/edit/:id',
    FINANCE: '/admin/finance',
    MENSAGENS: '/admin/mensagens',
    INTELLIGENCE: '/admin/intelligence',
    INTELLIGENCE_PROJECT: '/admin/intelligence/:projectId',
    PITCH: '/admin/pitch/:id',
    BLOG: '/admin/blog',
    BLOG_NEW: '/admin/blog/novo',
    POSTS_REDIRECT: '/admin/posts', // legacy, maps to /admin/blog
    CASES: '/admin/cases',
    CASE_NEW: '/admin/cases/new',
    CASE_EDIT: '/admin/cases/edit/:id',


    CRONOGRAMA: '/admin/cronograma',
    CRONOGRAMA_EDIT: '/admin/cronograma/:id',
    DIAGNOSTIC_VIEW: '/admin/diagnostico/:id',
    COCKPIT: '/admin/cockpit',
    REVENUE_COCKPIT: '/admin/revenue-cockpit',
    COCKPIT_SHORTCUT: '/cockpit',
    KNOWLEDGE_DOC_NEW: '/admin/knowledge/:libraryId/doc/new',
    KNOWLEDGE_DOC: '/admin/knowledge/:libraryId/doc/:docId',
    RECORDING: '/admin/recording/:id',
    LIFECYCLE: '/admin/lifecycle',
    LIFECYCLE_CONTACT: '/admin/lifecycle/:contactId',
    JORNADA_REDIRECT: '/admin/jornada', // redirects to /admin/projects
  },
  CLIENT_HUB: {
    STRATEGIC_PLAN_PRESENTATION: '/plan/:token',
    SUCCESS_PLAN: '/success/:token',
    HUB: '/hub/:id',
  },
  GROWTHMAP: {
    ROOT: '/growthmap',
    PROJECT: '/growthmap/:projectId',
  },
} as const;
