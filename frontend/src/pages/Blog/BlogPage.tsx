import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { api } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import styles from './BlogPage.module.scss';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt: string | null;
  viewCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  author: { id: string; username: string; avatarUrl: string | null };
}

interface PaginatedPosts {
  items: BlogPost[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'NEWS', label: 'News' },
  { value: 'PRODUCT_LAUNCH', label: 'Product Launches' },
  { value: 'FIRMWARE', label: 'Firmware' },
  { value: 'ESPORTS', label: 'Esports' },
  { value: 'PLATFORM_UPDATE', label: 'Platform Updates' },
  { value: 'EDITORIAL', label: 'Editorial' },
];

const CATEGORY_LABELS: Record<string, string> = {
  NEWS: 'News',
  PRODUCT_LAUNCH: 'Product Launch',
  FIRMWARE: 'Firmware',
  ESPORTS: 'Esports',
  PLATFORM_UPDATE: 'Platform Update',
  EDITORIAL: 'Editorial',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export function BlogPage() {
  const { slug } = useParams<{ slug: string }>();
  if (slug) return <BlogPostDetail slug={slug} />;
  return <BlogListView />;
}

// ---------------------------------------------------------------------------
// Blog List
// ---------------------------------------------------------------------------

function BlogListView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [featured, setFeatured] = useState<BlogPost | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const category = searchParams.get('category') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1') || 1;

  // Fetch featured post on initial load (only if no category filter)
  useEffect(() => {
    if (category) { setFeatured(null); return; }
    api<PaginatedPosts>('/blog?featured=true&limit=1')
      .then(d => setFeatured(d.items[0] ?? null))
      .catch(() => setFeatured(null));
  }, [category]);

  // Fetch posts
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '12' });
    if (category) params.set('category', category);

    api<PaginatedPosts>(`/blog?${params}`)
      .then(d => {
        setPosts(d.items);
        setTotalPages(d.pagination.totalPages);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [category, page]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Sim Racing News</h1>
        <p className={styles.subtitle}>
          Product launches, firmware updates, esports, and platform news
        </p>
      </header>

      {/* Category filters */}
      <div className={styles.filters}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            className={`${styles.filterBtn} ${category === cat.value ? styles.active : ''}`}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              if (cat.value) next.set('category', cat.value);
              else next.delete('category');
              next.set('page', '1');
              setSearchParams(next);
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Featured post */}
      {featured && !category && page === 1 && (
        <Link to={`/blog/${featured.slug}`} className={styles.featuredCard}>
          {featured.coverImage && (
            <img src={featured.coverImage} alt="" className={styles.featuredImage} />
          )}
          <div className={styles.featuredOverlay}>
            <span className={styles.featuredBadge}>Featured</span>
            <span className={styles.categoryBadge}>{CATEGORY_LABELS[featured.category] ?? featured.category}</span>
            <h2 className={styles.featuredTitle}>{featured.title}</h2>
            {featured.excerpt && <p className={styles.featuredExcerpt}>{featured.excerpt}</p>}
            <div className={styles.featuredMeta}>
              <span>{featured.author.username}</span>
              {featured.publishedAt && <time>{formatDate(featured.publishedAt)}</time>}
            </div>
          </div>
        </Link>
      )}

      {/* Post grid */}
      {loading ? (
        <div className={styles.loadingState}>Loading posts…</div>
      ) : posts.length === 0 ? (
        <div className={styles.emptyState}>No posts found</div>
      ) : (
        <div className={styles.grid}>
          {posts
            .filter(p => !featured || p.id !== featured.id || category || page !== 1)
            .map(post => (
            <Link key={post.id} to={`/blog/${post.slug}`} className={styles.card}>
              {post.coverImage && (
                <img src={post.coverImage} alt="" className={styles.cardImage} />
              )}
              <div className={styles.cardBody}>
                <span className={styles.cardCategory}>
                  {CATEGORY_LABELS[post.category] ?? post.category}
                </span>
                <h3 className={styles.cardTitle}>{post.title}</h3>
                {post.excerpt && <p className={styles.cardExcerpt}>{post.excerpt}</p>}
                <div className={styles.cardMeta}>
                  <span>{post.author.username}</span>
                  {post.publishedAt && <time>{formatDate(post.publishedAt)}</time>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.activePage : ''}`}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('page', String(p));
                setSearchParams(next);
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blog Post Detail
// ---------------------------------------------------------------------------

function BlogPostDetail({ slug }: { slug: string }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    api<BlogPost>(`/blog/${slug}`)
      .then(p => {
        setPost(p);
        // Fetch related posts in same category
        api<PaginatedPosts>(`/blog?category=${p.category}&limit=3`)
          .then(d => setRelated(d.items.filter(r => r.id !== p.id).slice(0, 3)))
          .catch(() => setRelated([]));
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className={styles.container}><div className={styles.loadingState}>Loading…</div></div>;
  if (!post) return <div className={styles.container}><div className={styles.emptyState}>Post not found</div></div>;

  const sanitizedBody = DOMPurify.sanitize(post.body);

  return (
    <article className={styles.articleContainer}>
      {/* Cover image */}
      {post.coverImage && (
        <div className={styles.articleCover}>
          <img src={post.coverImage} alt="" className={styles.articleCoverImg} />
        </div>
      )}

      <div className={styles.articleContent}>
        {/* Category & meta */}
        <div className={styles.articleTopMeta}>
          <span className={styles.categoryBadge}>
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
          {post.publishedAt && (
            <time className={styles.articleDate}>{formatDate(post.publishedAt)}</time>
          )}
          <span className={styles.articleReadTime}>{readingTime(post.body)}</span>
        </div>

        <h1 className={styles.articleTitle}>{post.title}</h1>

        {/* Author */}
        <div className={styles.articleAuthor}>
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} alt="" className={styles.authorAvatar} />
          ) : (
            <div className={styles.authorAvatarFallback}>
              {post.author.username[0]?.toUpperCase()}
            </div>
          )}
          <Link to={`/profile/${post.author.username}`} className={styles.authorName}>
            {post.author.username}
          </Link>
        </div>

        {/* Body */}
        <div
          className={styles.articleBody}
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />

        {/* View count */}
        <div className={styles.articleFooter}>
          <span className={styles.viewCount}>{post.viewCount.toLocaleString()} views</span>
          {post.tags.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map(tag => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <div className={styles.relatedSection}>
          <h2 className={styles.relatedTitle}>Related Articles</h2>
          <div className={styles.relatedGrid}>
            {related.map(r => (
              <Link key={r.id} to={`/blog/${r.slug}`} className={styles.card}>
                {r.coverImage && <img src={r.coverImage} alt="" className={styles.cardImage} />}
                <div className={styles.cardBody}>
                  <span className={styles.cardCategory}>
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </span>
                  <h3 className={styles.cardTitle}>{r.title}</h3>
                  {r.publishedAt && (
                    <div className={styles.cardMeta}>
                      <time>{formatDate(r.publishedAt)}</time>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
