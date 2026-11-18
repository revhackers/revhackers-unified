import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import BlogHeader from '@/components/blog/BlogHeader';
import BlogCard from '@/components/blog/BlogCard';
import { Button } from '@/components/ui/button';
import { Search, Filter, BookOpen } from 'lucide-react';
import SEO from '@/components/shared/SEO';
import { contentGcpAdapter } from '@/api/adapters/content-gcp';
import { getArticleImageBySlug } from '@/components/blog/post/articles/utils/frameworkImages';
import { blogPosts as staticBlogPosts } from '@/data/blogData';


// Interface para post do blog
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  image?: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  date: string;
  readTime: string;
  featured?: boolean;
}

const Blog = () => {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [postsPerPage] = useState(9);
  const [currentPage, setCurrentPage] = useState(1);
  const [apiPosts, setApiPosts] = useState<any[]>([]);

  // Fix author avatar path helper
  const getFixedAuthorAvatar = (path?: string | null) => {
    if (!path) return "/uploads/0cf4734e-5153-4c6e-8f33-4b382577e479.png";
    if (path.startsWith('http') || path.startsWith('/')) return path;
    return `/uploads/${path}`;
  };


  // Buscar posts do GCP (contentGcpAdapter)
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // Timeout de 10 segundos (proteção contra requests travados)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de rede')), 10000)
        );

        const fetchPromise = contentGcpAdapter.getBlogArticles();
        const data = await Promise.race([fetchPromise, timeoutPromise]);

        if (data) {
          setApiPosts(data);
        }
      } catch (err: any) {
        console.warn('⚠️ [BLOG] Falha ao carregar do GCP (usando offline):', err.message);
      }
    };

    fetchPosts();
  }, []);
  const blogPosts = useMemo(() => {
    const gcpPosts: BlogPost[] = apiPosts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content || '',
      category: post.category,
      image: post.image || undefined,
      author: {
        name: post.author_name || 'Equipe RevHackers',
        role: post.author_role || 'Expert Growth',
        avatar: getFixedAuthorAvatar(post.author_avatar)
      },
      date: post.date || post.created_at,
      readTime: post.read_time || '5 min',
      featured: post.featured || false
    }));

    // Slugs already in GCP
    const gcpSlugs = new Set(gcpPosts.map(p => p.slug));

    // Static posts not yet synced to GCP
    const staticOnly: BlogPost[] = staticBlogPosts
      .filter(p => !gcpSlugs.has(p.slug))
      .map(p => ({
        id: `static-${p.id}`,
        title: p.title.replace(/<span>|<\/span>/g, ''),
        slug: p.slug,
        excerpt: p.excerpt,
        content: p.content || '',
        category: p.category,
        image: p.image || getArticleImageBySlug(p.slug) || undefined,
        author: {
          name: p.author.name,
          role: p.author.role,
          avatar: getFixedAuthorAvatar(p.author.avatar)
        },
        date: p.date,
        readTime: p.readTime,
        featured: p.featured || false
      }));

    return [...gcpPosts, ...staticOnly].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [apiPosts]);

  // Filtrar posts com base na categoria e consulta de pesquisa (memoized)
  const filteredPosts = useMemo(() => {
    let filtered = [...blogPosts];

    if (activeCategory !== 'Todos') {
      filtered = filtered.filter(post => post.category === activeCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [blogPosts, activeCategory, searchQuery]);

  // Posts exibidos conforme a paginação (derivado, sem efeito extra)
  const displayedPosts = useMemo(
    () => filteredPosts.slice(0, currentPage * postsPerPage),
    [filteredPosts, currentPage, postsPerPage]
  );

  // Carregar mais posts
  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const hasMorePosts = currentPage * postsPerPage < filteredPosts.length;

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Observer for infinite scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostElementRef = useCallback((node: HTMLDivElement) => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMorePosts) {
        setIsLoadingMore(true);
        // Simulate small delay for smoother UX
        setTimeout(() => {
          setCurrentPage(prev => prev + 1);
          setIsLoadingMore(false);
        }, 500);
      }
    });

    if (node) observer.current.observe(node);
  }, [hasMorePosts]);

  // Obter todas as categorias únicas
  const categories = ['Todos', ...Array.from(new Set(blogPosts.map(post => post.category)))];

  return (
    <PageLayout>
      <SEO
        title="Blog de Revenue Operations & Growth B2B"
        description="Artigos sobre Growth, Revenue Operations, ABM, Automação e Tecnologia B2B. Estratégias avançadas para escalar sua operação de receita no Brasil."
        canonical="https://revhackers.com.br/blog"
        breadcrumbs={[
          { name: "Home", url: "https://revhackers.com.br/" },
          { name: "Blog", url: "https://revhackers.com.br/blog" }
        ]}
      />
      <BlogHeader
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <section className="pt-0 pb-12 bg-zinc-50 min-h-screen relative">
        <div className="absolute top-0 left-0 right-0 h-16 bg-black/70 pointer-events-none z-20" />
        

        <div className="container-custom relative z-10">

          {filteredPosts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayedPosts.map((post, index) => {
                  if (index === displayedPosts.length - 1) {
                    return (
                      <div ref={lastPostElementRef} key={post.id} className="h-full">
                        <BlogCard post={post as any} />
                      </div>
                    );
                  } else {
                    return <BlogCard key={post.id} post={post as any} />;
                  }
                })}
              </div>

              {isLoadingMore && (
                <div className="py-8 text-center flex justify-center">
                  <div className="w-8 h-8 rounded-lg border-4 border-zinc-700 border-t-revgreen animate-spin"></div>
                </div>
              )}

              {!hasMorePosts && displayedPosts.length > 0 && (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  Você chegou ao fim da lista.
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 border border-dashed border-zinc-200 bg-zinc-50/30">
              <div className="mx-auto w-16 h-16 bg-black/5 rounded-lg flex items-center justify-center mb-4 border border-black/5">
                <BookOpen className="h-8 w-8 text-zinc-300" />
              </div>
              <h3 className="text-base md:text-lg font-bold text-zinc-900">Nenhum artigo encontrado</h3>
              <p className="text-zinc-500 max-w-md mx-auto text-xs font-bold uppercase">
                Tente ajustar seus filtros ou termos de busca.
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setActiveCategory('Todos');
                  setSearchQuery('');
                }}
                className="mt-6 text-revgreen"
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Blog;
