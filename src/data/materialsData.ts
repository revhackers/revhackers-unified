/**
 * CADASTRO: acrescente um bloco no FIM do array. Trocar `link_material` redireciona também os e-mails já enviados. Nada precisa ser feito no Funnels.
 */

export interface Material {
    slug: string;
    title: string;
    type: string;
    category: string;
    description: string;
    link_material: string;
}

export const materialsData: Material[] = [
    {
        slug: 'framework-ia-meta-ads',
        title: 'Framework Completo: Agente de IA para Meta Ads',
        type: 'Framework',
        category: 'Automação',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/1322af87d0f749f98c6b93d095e19f8d',
    },
    {
        slug: 'plano-acao-90-dias',
        title: 'Plano de Ação 90 Dias',
        type: 'Template',
        category: 'Gestão',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://lp.revhackers.com.br/post/plano-acao-90-dias',
    },
    {
        slug: 'guia-agent-builder',
        title: 'Guia Definitivo Agent Builder da OpenAI',
        type: 'Guia',
        category: 'Automação',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/b29d4498c351464d84ad398e4c7d266d',
    },
    {
        slug: 'crm-estrategico',
        title: 'Guia Completo: CRM Estratégico que Realmente Converte',
        type: 'Guia',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/af40ea73b2ca41df9387a9a20f9e65d2',
    },
    {
        slug: 'transforme-linkedin',
        title: 'Transforme Seu LinkedIn em uma Máquina de Reuniões',
        type: 'Guia',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/3241c424c46145a9a321a4be278b188f',
    },
    {
        slug: 'guia-gtm',
        title: 'Guia Prático de Estratégia Go-To-Market (GTM)',
        type: 'Guia',
        category: 'Estratégia',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/bdd9f4fbfe9883a2a13a01b0892e2ea6',
    },
    {
        slug: 'linkedin-outreach',
        title: 'Guia de Outreach Personalizado no LinkedIn',
        type: 'Guia',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/685e6be72ec84df584179b72aaca8e75',
    },
    {
        slug: 'timing-sales-playbook',
        title: 'Framework de Vendas por Timing',
        type: 'Playbook',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/6a985c8ba586402ca0757db7c7b379af',
    },
    {
        slug: 'contato-decisores',
        title: 'Como Conseguir Contato Direto de Decisores B2B',
        type: 'Guia',
        category: 'Prospecção',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/bb3e93c0d4a04db3b02cc17f7a62acc7',
    },
    {
        slug: 'framework-clickup',
        title: 'Como Estruturar Operação de Projetos no ClickUp para Times de Growth',
        type: 'Framework',
        category: 'Operação',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/95eb673f915b4535adaf7b0a15553a59',
    },
    {
        slug: 'servidor-ia-local',
        title: 'Servidor de IA Local & Cluster de LLMs',
        type: 'Guia',
        category: 'Infraestrutura',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/af07a0607f1a47f2824a0a1b2964b02d',
    },
    {
        slug: 'growth-score-guia-acao',
        title: 'Guia de Ação: Growth Score',
        type: 'Guia',
        category: 'Growth',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/28ae003807a8477a9e74026294964f80',
    },
    {
        slug: 'site-score-guia-acao',
        title: 'Guia de Ação: Site Score',
        type: 'Guia',
        category: 'Growth',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/996358b210ee41f1a71ea5c5976f25ec',
    },
    {
        slug: 'founder-score-guia-acao',
        title: 'Guia de Ação: Founder Score',
        type: 'Guia',
        category: 'Growth',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/72e5e9c82b69421d9967c67edaa78785',
    },
    {
        slug: 'revenue-score-guia-acao',
        title: 'Guia de Ação: Revenue Score',
        type: 'Guia',
        category: 'Growth',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/0f9034e4740840dfb52d06e4e42f8f23',
    },
    {
        slug: 'playbook-handoff-vendas-cs',
        title: 'Playbook de Handoff Vendas → Customer Success',
        type: 'Playbook',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/2a39d1ae029846d29402940d0a423aee',
    },
    {
        slug: 'matriz-compensacao-vendas-b2b',
        title: 'Matriz de Compensação e Metas de Vendas B2B',
        type: 'Guia',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/1c01852d6b0744fc956c46c9b3343944',
    },
    {
        slug: 'guia-precificacao-saas-b2b',
        title: 'Guia de Precificação para Serviços/SaaS B2B',
        type: 'Guia',
        category: 'Estratégia',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/813b96225be8492987a1810150961f83',
    },
    {
        slug: 'framework-territorios-contas-b2b',
        title: 'Framework de Territórios e Segmentação de Contas B2B',
        type: 'Framework',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/9551cc1a4bc845bfa66610469ad15de0',
    },
    {
        slug: 'framework-prime-o-playbook-definitivo-de-comentarios-de-autoridade-no-linkedin-b2b',
        title: 'Framework Prime: O Playbook Definitivo de Comentários de Autoridade no LinkedIn B2B',
        type: 'Playbook',
        category: 'LinkedIn',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b4bdc72e03981d99754c9f5e8772a62',
    },
    {
        slug: 'matriz-roteamento-ia-qual-modelo-usar-em-cada-tarefa',
        title: 'Matriz de Roteamento de IA: Qual Modelo Usar em Cada Tarefa',
        type: 'Framework',
        category: 'Automação',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/8f19ed560bcf43eeb3603fe73df1ae14',
    },
    {
        slug: 'prospeccao-ultra-segmentada-7-dados',
        title: 'Framework de Prospecção Ultra-Segmentada: 7 Campos de Filtro e Cadência Multicanal',
        type: 'Framework',
        category: 'Prospecção',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://revtech.notion.site/60eb8340dc7449c6a0d8dd3b1cf61152',
    }
];
