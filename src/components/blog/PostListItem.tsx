import { Link } from 'react-router-dom';
import { authors } from '@/data/authors';
import { formatDateShort } from '@/lib/blog';
import type { PostMeta } from '@/lib/blog/parse';
import { cn } from '@/lib/utils';

interface PostListItemProps {
  post: PostMeta;
  featured?: boolean;
}

const PostListItem = ({ post, featured = false }: PostListItemProps) => {
  const author = authors[post.author];

  return (
    <article className="border-b border-zinc-200 py-6 sm:grid sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-8">
      <div className="mb-2 flex gap-3 font-mono text-xs text-zinc-500 sm:mb-0 sm:block sm:space-y-1">
        <p>{formatDateShort(post.date)}</p>
        <p className="uppercase">{post.category}</p>
      </div>
      <div>
        <h2
          className={cn(
            'text-zinc-950',
            featured ? 'text-[2rem] font-black leading-tight sm:text-[2.5rem]' : 'text-[1.375rem] font-extrabold leading-snug sm:text-2xl',
          )}
        >
          <Link to={'/blog/' + post.slug} className="hover:underline">
            {post.title}
          </Link>
        </h2>
        <p className={cn('mt-2 text-zinc-600', featured ? 'text-lg' : 'line-clamp-2 text-base')}>{post.description}</p>
        <p className="mt-3 text-sm text-zinc-500">
          {author?.name} · {post.readingMinutes} min de leitura
        </p>
      </div>
    </article>
  );
};

export default PostListItem;
