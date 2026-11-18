import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import type { PostHeading } from '@/lib/blog/parse';
import '@/styles/article.css';

interface ArticleBodyProps {
  markdown: string;
  headings: PostHeading[];
}

const ArticleBody = ({ markdown, headings }: ArticleBodyProps) => {
  let h2Index = 0;

  return (
    <div className="post-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2 id={headings[h2Index++]?.id}>{children}</h2>,
          a: ({ href = '', children }) =>
            href.startsWith('/') ? (
              <Link to={href}>{children}</Link>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          img: ({ src, alt }) => (
            <figure>
              <img loading="lazy" decoding="async" alt={alt} src={src} />
              <figcaption>{alt}</figcaption>
            </figure>
          ),
          table: ({ children }) => (
            <div className="post-table">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default ArticleBody;
