import { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { api } from '../../utils/api';
import styles from './GuideTemplate.module.scss';

interface GuideAuthor {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
}

interface MentionedProduct {
  id: string;
  name: string;
  slug: string;
  manufacturer: string;
  category: string;
  specs: Record<string, unknown>;
  affiliateLinks: Array<{ retailer: string; url: string; price: number }>;
  avgRating: number | null;
  reviewCount: number;
  images: string[];
}

interface Guide {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  category: string;
  coverImage: string | null;
  author: GuideAuthor;
  tags: string[];
  productMentions: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  mentionedProducts: MentionedProduct[];
}

interface GuideTemplateProps {
  slug: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner Guide',
  BUYING: 'Buying Guide',
  MAINTENANCE: 'Maintenance',
};

const CATEGORY_COLORS: Record<string, string> = {
  BEGINNER: 'var(--accent-primary)',
  BUYING: 'var(--accent-secondary)',
  MAINTENANCE: 'var(--color-warning)',
};

export function GuideTemplate({ slug }: GuideTemplateProps) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<Guide>(`/guides/${slug}`)
      .then(setGuide)
      .catch(() => setGuide(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const readingTime = useMemo(() => {
    if (!guide) return 0;
    const words = guide.body.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [guide]);

  const sanitizedBody = useMemo(() => {
    if (!guide) return '';
    return DOMPurify.sanitize(guide.body, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'b', 'i',
        'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'table',
        'thead', 'tbody', 'tr', 'th', 'td',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'id'],
    });
  }, [guide]);

  if (loading) return <div className={styles.loading}>Loading guide…</div>;
  if (!guide) return <div className={styles.notFound}>Guide not found</div>;

  return (
    <article className={styles.article}>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: guide.seoTitle ?? guide.title,
            description: guide.seoDescription ?? guide.excerpt ?? '',
            image: guide.coverImage ?? undefined,
            author: { '@type': 'Person', name: guide.author.username },
            publisher: { '@type': 'Organization', name: 'RigBuilder' },
            datePublished: guide.publishedAt ?? guide.createdAt,
            dateModified: guide.updatedAt,
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://rigbuilder.com/guides/${guide.slug}`,
            },
          }),
        }}
      />

      {guide.coverImage && (
        <div className={styles.cover}>
          <img src={guide.coverImage} alt={guide.title} className={styles.coverImg} />
        </div>
      )}

      <header className={styles.header}>
        <span
          className={styles.categoryBadge}
          style={{ color: CATEGORY_COLORS[guide.category] ?? 'var(--text-secondary)' }}
        >
          {CATEGORY_LABELS[guide.category] ?? guide.category}
        </span>
        <h1 className={styles.title}>{guide.title}</h1>
        {guide.excerpt && <p className={styles.excerpt}>{guide.excerpt}</p>}

        <div className={styles.meta}>
          <div className={styles.authorBlock}>
            {guide.author.avatarUrl && (
              <img src={guide.author.avatarUrl} alt="" className={styles.avatar} />
            )}
            <span className={styles.authorName}>{guide.author.username}</span>
          </div>
          <span className={styles.metaDivider}>·</span>
          <span className={styles.metaDate}>
            {guide.publishedAt
              ? new Date(guide.publishedAt).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })
              : 'Draft'}
          </span>
          <span className={styles.metaDivider}>·</span>
          <span className={styles.metaReading}>{readingTime} min read</span>
        </div>

        {guide.tags.length > 0 && (
          <div className={styles.tags}>
            {guide.tags.map((tag) => (
              <span key={tag} className={styles.tag}>#{tag}</span>
            ))}
          </div>
        )}
      </header>

      <div className={styles.body} dangerouslySetInnerHTML={{ __html: sanitizedBody }} />

      {guide.mentionedProducts.length > 0 && (
        <section className={styles.productsSection}>
          <h3 className={styles.productsSectionTitle}>Featured Products</h3>
          <div className={styles.productGrid}>
            {guide.mentionedProducts.map((product) => (
              <LiveSpecCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function LiveSpecCard({ product }: { product: MentionedProduct }) {
  const lowestPrice = product.affiliateLinks?.length
    ? Math.min(...product.affiliateLinks.map((l) => l.price))
    : null;

  return (
    <div className={styles.specCard}>
      {product.images[0] && (
        <img src={product.images[0]} alt={product.name} className={styles.specCardImg} />
      )}
      <div className={styles.specCardBody}>
        <div className={styles.specCardMfr}>{product.manufacturer}</div>
        <a href={`/products/${product.slug}`} className={styles.specCardName}>{product.name}</a>
        <div className={styles.specCardMeta}>
          {product.avgRating != null && (
            <span className={styles.specCardRating}>★ {product.avgRating.toFixed(1)}</span>
          )}
          <span className={styles.specCardReviews}>{product.reviewCount} reviews</span>
        </div>
        {lowestPrice != null && (
          <div className={styles.specCardPrice}>${lowestPrice.toFixed(2)}</div>
        )}
        <button className={styles.addToBuild}>+ Add to Build</button>
      </div>
    </div>
  );
}
