import { ArtigoEditorial } from '@/types/editorial';

export const editorialPilotFixture: ArtigoEditorial = {
  id: 'pilot-test-999',
  slug: 'artigo-piloto-teste-editorial',
  canonicalUrl: 'https://revhackers.com.br/blog/artigo-piloto-teste-editorial',
  title: 'Artigo Piloto de Teste: Validação do Contrato Editorial',
  subtitle: 'Validação técnica rigorosa de blocos estruturados e metadados no pipeline B1A.',
  excerpt: 'Este é um artigo piloto estritamente para testes de homologação do novo contrato editorial em paralelo, sem publicação comercial.',
  category: 'Dados',
  image: '/uploads/revenue-architecture-hero.svg',
  author: {
    name: 'Equipe de Engenharia Editorial RevHackers',
    role: 'Arquitetura & Qualidade',
    avatar: '/uploads/0cf4734e-5153-4c6e-8f33-4b382577e479.png'
  },
  publicationDate: '2026-11-12T00:00:00.000Z',
  updatedAt: '2026-11-12T00:00:00.000Z',
  readTime: '3 min',
  featured: false,
  editorialApprovalStatus: 'TEST',
  claimsVerified: false,
  sourceProvenance: 'unknown',
  published: false,
  seo: {
    metaTitle: 'Artigo Piloto de Teste | RevHackers Editorial',
    metaDescription: 'Validação técnica do contrato editorial RevHackers em ambiente controlado.',
    keywords: ['revops', 'editorial', 'teste', 'b2b'],
    ogImage: '/uploads/revenue-architecture-hero.svg'
  },
  content: `[TAKEAWAYS: Resumo do Piloto]
- **Contrato Estrito:** Validação de tipos imutáveis para ID, slug, canonical e metadados SEO.
- **Blocos Ricos:** Teste de renderização de takeaways, blueprints e steps.
- **Isolamento B1A:** Execução paralela sem interferir no legado ou em produção.
[/TAKEAWAYS]

# Artigo Piloto de Teste Editorial

Este documento serve exclusivamente como fixture de teste para homologar o contrato \`ArtigoEditorial\` e os parsers de blocos especiais.

---

## 1. Fundamentos da Validação

A arquitetura B1A garante que novos contratos operem em paralelo com os fallbacks existentes, preservando 100% da estabilidade do sistema.

[BLUEPRINT: Pipeline de Homologação]
- **Fase 1:** Contrato Tipado e Normalizador
- **Fase 2:** Fixture Piloto e Testes Vitest
- **Fase 3:** Homologação Segura em Paralelo
[/BLUEPRINT]

[STEPS: Passos de Verificação]
1. Verificar integridade do schema \`ArtigoEditorial\`.
2. Executar suíte de testes unitários.
3. Confirmar preservação de rotas e fallbacks.
[/STEPS]

[REDFLAGS: Riscos Mitigados]
- Regressão em posts existentes.
- Incompatibilidade de tipos de autor ou data.
- Falha na sanitização de blocos HTML/Markdown.
[/REDFLAGS]

[INFO]
Nota técnica: Este conteúdo é estritamente um artefato de teste e validação de engenharia.
[/INFO]`
};
