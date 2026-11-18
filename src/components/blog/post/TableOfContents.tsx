import { useEffect, useState } from 'react';
import type { PostHeading } from '@/lib/blog/parse';
import { cn } from '@/lib/utils';

interface TableOfContentsProps {
  headings: PostHeading[];
  /** `sidebar`: coluna fixa a partir de 1280 px. `inline`: bloco recolhido abaixo disso. */
  variant: 'sidebar' | 'inline';
}

const TableOfContents = ({ headings, variant }: TableOfContentsProps) => {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (variant !== 'sidebar' || headings.length < 3) return;
    const elements = headings.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px' },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings, variant]);

  if (headings.length < 3) return null;

  if (variant === 'inline') {
    return (
      <details className="my-6 border-y border-zinc-200 py-3 xl:hidden">
        <summary className="cursor-pointer font-mono text-xs uppercase text-zinc-500">Neste artigo</summary>
        <ul className="mt-3 space-y-2">
          {headings.map((h) => (
            <li key={h.id}>
              <a href={'#' + h.id} className="text-sm text-zinc-600 hover:text-zinc-950">
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </details>
    );
  }

  return (
    <nav aria-label="Neste artigo" className="sticky top-32 hidden w-52 xl:block">
      <p className="font-mono text-xs uppercase text-zinc-500">Neste artigo</p>
      <ul className="mt-3 space-y-2">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={'#' + h.id}
              className={cn(
                'block text-sm',
                activeId === h.id ? 'border-l-2 border-[#00CC6A] pl-3 text-zinc-950' : 'text-zinc-500 hover:text-zinc-950',
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TableOfContents;
