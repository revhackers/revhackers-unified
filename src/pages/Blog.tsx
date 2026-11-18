import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import PostListItem from '@/components/blog/PostListItem';
import SEO from '@/components/shared/SEO';
import { posts } from '@/lib/blog';
import { cn } from '@/lib/utils';

const PER_PAGE = 20;

const Blog = () => {
  const [params, setParams] = useSearchParams();
  const category = params.get('categoria') ?? '';
  const query = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('pagina')) || 1);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter(
      (post) =>
        (!category || post.category === category) &&
        (!q || `${post.title} ${post.description} ${post.category}`.toLowerCase().includes(q)),
    );
  }, [category, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const pristine = !category && !query.trim();

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const pageLink = (target: number) => {
    const next = new URLSearchParams(params);
    if (target > 1) next.set('pagina', String(target));
    else next.delete('pagina');
    const search = next.toString();
    return '/blog' + (search ? '?' + search : '');
  };

  return (
    <PageLayout>
      <SEO
        title="Blog de Revenue Operations & Growth B2B"
        description="Artigos sobre Growth, Revenue Operations, ABM, Automação e Tecnologia B2B. Estratégias avançadas para escalar sua operação de receita no Brasil."
        canonical="https://revhackers.com.br/blog"
        breadcrumbs={[
          { name: 'Home', url: 'https://revhackers.com.br/' },
          { name: 'Blog', url: 'https://revhackers.com.br/blog' },
        ]}
      />
      <div className="mx-auto max-w-[64rem] bg-white px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <header className="border-b-2 border-zinc-900 pb-6">
          <h1 className="text-[2.5rem] font-black text-zinc-950 sm:text-5xl">Blog</h1>
          <p className="mt-2 text-zinc-600">Artigos sobre operações de receita B2B.</p>
        </header>

        <div className="flex flex-col gap-4 border-b border-zinc-200 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {['', ...categories].map((name) => {
              const active = category === name;
              return (
                <button
                  key={name || 'todos'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ categoria: name, pagina: '' })}
                  className={cn(
                    'border-b-2 pb-0.5 font-mono text-xs uppercase',
                    active ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-950',
                  )}
                >
                  {name || 'Todos'}
                </button>
              );
            })}
          </div>
          <input
            type="search"
            aria-label="Buscar no blog"
            placeholder="Buscar"
            value={query}
            onChange={(event) => update({ q: event.target.value, pagina: '' })}
            className="w-full border-b border-zinc-300 bg-transparent py-1 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-950 sm:w-48"
          />
        </div>

        {visible.length > 0 ? (
          <div>
            {visible.map((post, index) => (
              <PostListItem key={post.slug} post={post} featured={pristine && currentPage === 1 && index === 0} />
            ))}
          </div>
        ) : (
          <div className="py-16">
            <p className="text-zinc-700">Nenhum artigo encontrado.</p>
            <Link to="/blog" className="mt-2 inline-block text-zinc-950 underline">
              Limpar filtros
            </Link>
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Paginação" className="mt-8 flex items-center justify-between text-sm text-zinc-600">
            {currentPage > 1 ? (
              <Link to={pageLink(currentPage - 1)} className="text-zinc-950 underline">
                Mais recentes
              </Link>
            ) : (
              <span />
            )}
            <span>
              Página {currentPage} de {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link to={pageLink(currentPage + 1)} className="text-zinc-950 underline">
                Mais antigos
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </PageLayout>
  );
};

export default Blog;
