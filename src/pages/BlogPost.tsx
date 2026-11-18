import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import BlogPostHeader from '@/components/blog/post/BlogPostHeader';
import DOMPurify from 'dompurify';
import BlogPostContent from '@/components/blog/post/BlogPostContent';
import BlogPostFooter from '@/components/blog/post/BlogPostFooter';
import RelatedPosts from '@/components/blog/post/RelatedPosts';
import TableOfContents from '@/components/blog/post/TableOfContents';
import { getArticleImageBySlug, getFrameworkImage } from '@/components/blog/post/articles/utils/frameworkImages';
import { motion } from 'framer-motion';
import SEO from '@/components/shared/SEO';

import { blogPosts as staticBlogPosts } from '@/data/blogData';
import ContextualCTA from '@/components/blog/post/ContextualCTA';
import BookingModal from '@/components/shared/BookingModal';

// Post author
interface Author {
  name: string;
  role: string;
  avatar: string;
}

// Post shape used by this page
interface BlogPost {
  id: string | number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  author: Author;
  date: string;
  readTime: string;
  featured?: boolean;
}

const getFixedAuthorAvatar = (path?: string | null) => {
  if (!path) return "/uploads/0cf4734e-5153-4c6e-8f33-4b382577e479.png";
  if (path.startsWith('http') || path.startsWith('/')) return path;
  return `/uploads/${path}`;
};

// Posts vem do bundle local (src/data/blogData): disponíveis já no primeiro render
const allPosts: BlogPost[] = staticBlogPosts.map(p => ({
  id: `static-${p.id}`,
  title: p.title.replace(/<span>|<\/span>/g, ''),
  slug: p.slug,
  excerpt: p.excerpt,
  content: p.content || '',
  category: p.category,
  image: p.image || '',
  author: {
    name: p.author.name,
    role: p.author.role,
    avatar: getFixedAuthorAvatar(p.author.avatar)
  },
  date: p.date,
  readTime: p.readTime,
  featured: p.featured || false
}));

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // State for hero image (must be at top level)
  const [heroImgSrc, setHeroImgSrc] = useState<string>('');

  // Post atual, encontrado na lista local
  const post = allPosts.find(p => p.slug === slug);

  // Calculate resolved image safely
  // If from DB, explicitly respect NULL/EMPTY to allow deletion in Admin
  const isStatic = post && (typeof post.id === 'number' || post.id.toString().startsWith('static-'));
  const resolvedImage = post
    ? (post.image && post.image !== ''
      ? post.image
      : (isStatic
        ? (getArticleImageBySlug(post.slug) || getFrameworkImage(post.category, post.slug))
        : getFrameworkImage(post.category, post.slug))
    )
    : '';

  // Update hero image when resolvedImage changes
  useEffect(() => {
    if (resolvedImage) {
      setHeroImgSrc(resolvedImage);
    }
  }, [resolvedImage]);

  const handleHeroImageError = () => {
    if (post) {
      const fallback = getFrameworkImage(post.category, post.slug);
      if (heroImgSrc !== fallback) {
        setHeroImgSrc(fallback);
      }
    }
  };

  // Get related posts
  const relatedPosts = post
    ? allPosts
      .filter(p => p.category === post.category && p.id !== post.id)
      .slice(0, 3)
    : [];

  // Format date to Portuguese
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };

  // If post not found, redirect to blog page
  useEffect(() => {
    if (!post) {
      navigate('/blog', { replace: true });
    }
  }, [post, navigate]);

  // Handle Primary CTA (Booking/Consultancy)
  const handlePrimaryCTAClick = () => {
    setIsBookingModalOpen(true);
  };

  if (!post) {
    return null; // Will redirect in useEffect
  }

  // Get custom image if available for this article
  const customImage = getArticleImageBySlug(post.slug);

  // Copy the post but update the image if custom one exists
  const updatedPost = {
    ...post,
    image: customImage || post.image
  };

  return (
    <PageLayout>
      <SEO
        title={post.title}
        description={post.excerpt?.replace(/<[^>]*>?/gm, '').substring(0, 160) || 'Artigo RevHackers sobre Growth e Revenue Operations'}
        canonical={`https://revhackers.com.br/blog/${post.slug}`}
        image={resolvedImage || undefined}
        type="article"
        publishedTime={post.date}
        author={post.author.name}
        wordCount={post.content ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length : undefined}
        keywords={[post.category, 'Revenue Operations', 'RevOps', 'Growth B2B', 'RevHackers']}
      />
      {/* 1. Hero Section - Matching Landing Page EXACTLY (HeroSection.tsx) */}
      <section className="relative min-h-[60vh] flex flex-col items-center justify-center pt-24 pb-20 overflow-hidden bg-black">
        {/* Full-bleed high-impact background (Fixed: "sem imagem no banner") */}
        <div className="absolute inset-0 z-0">
          {heroImgSrc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <img
                src={heroImgSrc}
                alt=""
                fetchPriority="high"
                onError={handleHeroImageError}
                className="w-full h-full object-cover blur-xl scale-110"
              />
            </motion.div>
          )}
          <div className="absolute inset-0 bg-black/70"></div>
          {/* Noise overlay for texture */}
          <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        </div>

        <div className="container-custom flex flex-col items-center text-center max-w-6xl relative z-10">
          <header className="max-w-7xl pt-8 w-full">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
                <span className="bg-revgreen/10 text-revgreen border border-revgreen/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
                  {post.category}
                </span>
                <div className="hidden md:block h-px w-8 bg-white/20"></div>
                <div className="flex items-center gap-4 text-zinc-400 text-xs font-medium uppercase tracking-[0.2em]">
                  <span>{post.readTime} reading</span>
                  <span className="text-revgreen/40">•</span>
                  <span>{formatDate(updatedPost.date)}</span>
                </div>
              </div>

              <h1
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight tracking-tight max-w-5xl mx-auto [&>span]:text-[#00CC6A]"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    post.title.includes('<')
                      ? post.title
                      : post.title.includes(':')
                        ? `<span>${post.title.split(':')[0]}</span>: ${post.title.split(':').slice(1).join(':').trim()}`
                        : post.title
                  )
                }}
              />

              {/* Authentic Visual Banner - NUNCA CORTA A IMAGEM (object-contain) */}
              {heroImgSrc && (
                <div className="my-8 max-w-4xl mx-auto rounded-2xl overflow-hidden border border-zinc-800/90 bg-zinc-950/90 p-3 sm:p-6 shadow-2xl flex items-center justify-center">
                  <img
                    src={heroImgSrc}
                    alt={post.title}
                    className="w-auto max-w-full max-h-[500px] object-contain mx-auto rounded-lg"
                  />
                </div>
              )}
            </motion.div>
          </header>

          {/* Subheadline/Excerpt */}
          {updatedPost.excerpt && (
            <p className="text-lg md:text-xl text-zinc-300 mb-10 max-w-4xl leading-relaxed font-normal text-balance mx-auto">
              {updatedPost.excerpt.replace(/<[^>]*>?/gm, "")}
            </p>
          )}

          {/* Metadata */}
          <div className="w-full border-t border-white/10 pt-8 mt-4 animate-fade-in-up">
            <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-xxs md:text-xs font-mono text-zinc-400 uppercase tracking-[0.3em]">
              <div className="flex items-center gap-2 hover:text-[#00CC6A] transition-colors cursor-default group">
                <span className="text-[#00CC6A] group-hover:animate-pulse">•</span> {formatDate(updatedPost.date)}
              </div>
              <div className="flex items-center gap-2 hover:text-[#00CC6A] transition-colors cursor-default group">
                <span className="text-[#00CC6A] group-hover:animate-pulse">•</span> {updatedPost.readTime}
              </div>
              <div className="flex items-center gap-2 hover:text-[#00CC6A] transition-colors cursor-default group">
                <span className="text-[#00CC6A] group-hover:animate-pulse">•</span> {updatedPost.author.name}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Content Section - White Background (Fixes "Totally Dark" issue) */}
      <section className="py-20 bg-white border-t border-zinc-100">
        <div className="container px-4 md:px-6 mx-auto max-w-7xl">

          {/* Changed grid to give more space to content (col-span-12 on mobile, col-span-8 or 9 on desktop) */}
          <div className="grid grid-cols-12 gap-8 lg:gap-16">

            {/* TOC Sidebar - Hidden on mobile, sticky on desktop */}
            <div className="hidden lg:col-span-3 lg:block">
              <div className="sticky top-32">
                <h4 className="font-bold text-black mb-6 border-l-4 border-black pl-4 uppercase tracking-widest text-xs">Neste Artigo</h4>
                <TableOfContents containerRef={contentRef} />
              </div>
            </div>

            {/* Main Content - Expanded width (col-span-9) */}
            <div ref={contentRef} className="col-span-12 lg:col-span-9 lg:pl-10 border-l border-zinc-50">

              {/* The content below will render either the database 'content' or a custom article component */}
              <div className="animate-fade-in">
                <BlogPostContent
                  content={post.content}
                  category={post.category}
                  authorName={post.author.name}
                  authorRole={post.author.role}
                  authorAvatar={post.author.avatar}
                  slug={post.slug}
                  onCTAClick={handlePrimaryCTAClick} // Pass Booking Handler for Primary
                />

                {/* Contextual Diagnostic CTA */}
                <ContextualCTA title={post.title} category={post.category} />
              </div>
              <BlogPostFooter />
            </div>
          </div>
        </div>
      </section>

      {/* Global Booking Modal (Diagnosis) */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </PageLayout>
  );
};

export default BlogPostPage;
