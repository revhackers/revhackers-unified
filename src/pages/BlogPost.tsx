import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import SEO from '@/components/shared/SEO';
import BookingModal from '@/components/shared/BookingModal';
import ArticleBody from '@/components/blog/ArticleBody';
import PostListItem from '@/components/blog/PostListItem';
import PostCTA from '@/components/blog/post/PostCTA';
import TableOfContents from '@/components/blog/post/TableOfContents';
import { authors } from '@/data/authors';
import { formatDateLong, getPostMeta, loadPostBody, posts } from '@/lib/blog';
import NotFound from './NotFound';

const SITE = 'https://revhackers.com.br';

const BlogPostPage = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const meta = getPostMeta(slug);
  const [body, setBody] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBody(null);
    setFailed(false);
    window.scrollTo(0, 0);
    if (!meta) return;
    let cancelled = false;
    loadPostBody(slug)
      .then((text) => {
        if (!cancelled) setBody(text);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, meta]);

  if (!meta) return <NotFound />;

  const author = authors[meta.author];
  const canonical = `${SITE}/blog/${meta.slug}`;
  const related = posts.filter((p) => p.category === meta.category && p.slug !== meta.slug).slice(0, 3);

  const copyLink = async () => {
    await navigator.clipboard.writeText(canonical);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageLayout>
      <SEO
        title={meta.title}
        description={meta.description.slice(0, 160)}
        canonical={canonical}
        type="article"
        publishedTime={meta.date}
        modifiedTime={meta.updated ?? meta.date}
        author={author?.name}
        image={meta.cover ? SITE + meta.cover : SITE + '/og/home.png'}
        breadcrumbs={[
          { name: 'Home', url: SITE + '/' },
          { name: 'Blog', url: SITE + '/blog' },
          { name: meta.title, url: canonical },
        ]}
        keywords={[meta.category, 'Revenue Operations', 'RevOps', 'Growth B2B', 'RevHackers']}
      />
      <div className="mx-auto max-w-[72rem] bg-white px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-16">
          <article className="min-w-0">
            <header className="max-w-[41rem]">
              <nav aria-label="Trilha" className="font-mono text-xs uppercase text-zinc-500">
                <Link to="/blog" className="hover:text-zinc-950">
                  Blog
                </Link>
                {' / '}
                <Link to={'/blog?categoria=' + encodeURIComponent(meta.category)} className="hover:text-zinc-950">
                  {meta.category}
                </Link>
              </nav>
              <h1 className="mt-4 text-[2rem] font-black leading-tight text-zinc-950 sm:text-[2.5rem] lg:text-5xl">{meta.title}</h1>
              <p className="mt-4 text-xl text-zinc-600">{meta.description}</p>
              <p className="mt-4 text-sm text-zinc-500">
                Por {author?.name}
                {author?.role ? `, ${author.role}` : ''} · {formatDateLong(meta.date)}
                {meta.updated ? ` · Atualizado em ${formatDateLong(meta.updated)}` : ''} · {meta.readingMinutes} min de leitura
              </p>
              <div className="mt-6 border-b border-zinc-200" />
            </header>

            {meta.cover && (
              <figure className="my-8">
                <img src={meta.cover} alt={meta.coverAlt} className="h-auto w-full border border-zinc-200" />
                <figcaption className="mt-2 text-sm text-zinc-500">{meta.coverCredit}</figcaption>
              </figure>
            )}

            <TableOfContents headings={meta.headings} variant="inline" />

            <div className="mt-8">
              {body !== null ? (
                <ArticleBody markdown={body} headings={meta.headings} />
              ) : failed ? (
                <p className="text-zinc-700">Não foi possível carregar o texto. Atualize a página para tentar de novo.</p>
              ) : (
                <div className="min-h-[40vh]" />
              )}
            </div>

            <p className="mt-12 text-sm text-zinc-500">
              Compartilhar:{' '}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-950 underline"
              >
                LinkedIn
              </a>
              {' · '}
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(meta.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-950 underline"
              >
                X
              </a>
              {' · '}
              <button type="button" onClick={copyLink} className="text-zinc-950 underline">
                {copied ? 'Link copiado' : 'Copiar link'}
              </button>
            </p>

            {author && (
              <div className="mt-8 flex max-w-[41rem] gap-4 border-t border-zinc-200 pt-6">
                {author.avatar && <img src={author.avatar} alt="" width={48} height={48} className="h-12 w-12 object-cover" />}
                <div>
                  <p className="font-bold text-zinc-950">{author.name}</p>
                  {author.role && <p className="text-sm text-zinc-500">{author.role}</p>}
                  {author.bio && <p className="mt-2 text-sm text-zinc-600">{author.bio}</p>}
                  {author.linkedin && (
                    <a href={author.linkedin} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-zinc-950 underline">
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            )}

            <PostCTA onClick={() => setIsBookingModalOpen(true)} />

            {related.length > 0 && (
              <section className="mt-16">
                <h2 className="border-b-2 border-zinc-900 pb-2 text-xl font-extrabold text-zinc-950">Leia também</h2>
                {related.map((post) => (
                  <PostListItem key={post.slug} post={post} />
                ))}
              </section>
            )}
          </article>

          <aside>
            <TableOfContents headings={meta.headings} variant="sidebar" />
          </aside>
        </div>
      </div>
      <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} />
    </PageLayout>
  );
};

export default BlogPostPage;
