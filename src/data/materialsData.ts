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
        link_material: 'https://bustling-lemon-68c.notion.site/3b1bdc72e039818fb5ccc42c813e1fa1',
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
        link_material: 'https://bustling-lemon-68c.notion.site/3b1bdc72e03981f286f3ee0390b60fd5',
    },
    {
        slug: 'crm-estrategico',
        title: 'Guia Completo: CRM Estratégico que Realmente Converte',
        type: 'Guia',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b1bdc72e0398116ad99c92f4aceb3c8',
    },
    {
        slug: 'transforme-linkedin',
        title: 'Transforme Seu LinkedIn em uma Máquina de Reuniões',
        type: 'Guia',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b1bdc72e0398139b03bf54002aa472f',
    },
    {
        slug: 'guia-gtm',
        title: 'Guia Prático de Estratégia Go-To-Market (GTM)',
        type: 'Guia',
        category: 'Estratégia',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b1bdc72e0398113a40ed099ea7f2f79',
    },
    {
        slug: 'linkedin-outreach',
        title: 'Guia de Outreach Personalizado no LinkedIn',
        type: 'Guia',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e03981128dcbd9b1285f0c98',
    },
    {
        slug: 'timing-sales-playbook',
        title: 'Framework de Vendas por Timing',
        type: 'Playbook',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e0398157aec3cd72ca2c1915',
    },
    {
        slug: 'contato-decisores',
        title: 'Como Conseguir Contato Direto de Decisores B2B',
        type: 'Guia',
        category: 'Prospecção',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e03981849f51cc033be06d9a',
    },
    {
        slug: 'framework-clickup',
        title: 'Como Estruturar Operação de Projetos no ClickUp para Times de Growth',
        type: 'Framework',
        category: 'Operação',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e039815d81dde70d2273a6dd',
    },
    {
        slug: 'servidor-ia-local',
        title: 'Servidor de IA Local & Cluster de LLMs',
        type: 'Guia',
        category: 'Infraestrutura',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b1bdc72e03981e3ad18d9916c0a67d4',
    },
    {
        slug: 'growth-score-guia-acao',
        title: 'Guia de Ação: Growth Score',
        type: 'Guia',
        category: 'Growth',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e039816f872fd9166bcefa92',
    },
    {
        slug: 'site-score-guia-acao',
        title: 'Guia de Ação: Site Score',
        type: 'Guia',
        category: 'Growth',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e03981539fcaec897782dbbb',
    },
    {
        slug: 'founder-score-guia-acao',
        title: 'Guia de Ação: Founder Score',
        type: 'Guia',
        category: 'Growth',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e0398183a6cffb86769c7189',
    },
    {
        slug: 'revenue-score-guia-acao',
        title: 'Guia de Ação: Revenue Score',
        type: 'Guia',
        category: 'Growth',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e039819aa52de191f0a95b93',
    },
    {
        slug: 'playbook-handoff-vendas-cs',
        title: 'Playbook de Handoff Vendas → Customer Success',
        type: 'Playbook',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e03981db966ef724a3663b9e',
    },
    {
        slug: 'matriz-compensacao-vendas-b2b',
        title: 'Matriz de Compensação e Metas de Vendas B2B',
        type: 'Guia',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e039814b93e0e90b0841bce4',
    },
    {
        slug: 'guia-precificacao-saas-b2b',
        title: 'Guia de Precificação para Serviços/SaaS B2B',
        type: 'Guia',
        category: 'Estratégia',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e039814fbfcfd742f6eac760',
    },
    {
        slug: 'framework-territorios-contas-b2b',
        title: 'Framework de Territórios e Segmentação de Contas B2B',
        type: 'Framework',
        category: 'Vendas',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b2bdc72e039815095e7fe40a648b77e',
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
        link_material: 'https://bustling-lemon-68c.notion.site/3b4bdc72e03981f3a55cf9be2a62fa6d',
    },
    {
        slug: 'prospeccao-ultra-segmentada-7-dados',
        title: 'Framework de Prospecção Ultra-Segmentada: 7 Campos de Filtro e Cadência Multicanal',
        type: 'Framework',
        category: 'Prospecção',
        description: '<p>Material oficial. Conteúdo prático e validado para sua operação.</p>',
        link_material: 'https://bustling-lemon-68c.notion.site/3b4bdc72e039819d9bc9cc14774f247f',
    }
];
