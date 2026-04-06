import { Link } from 'react-router-dom';
import styles from './FeaturedPostCard.module.scss';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeaturedPostCardData {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  thumbnail?: string;
  href: string;
  /** Star rating 1–5, shown only for reviews */
  rating?: number;
}

interface FeaturedPostCardProps {
  post: FeaturedPostCardData;
  /** Visual variant — guides use accent-secondary, reviews show stars */
  variant?: 'guide' | 'review';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FeaturedPostCard — reusable card for guides and product reviews.
 */
export function FeaturedPostCard({ post, variant = 'guide' }: FeaturedPostCardProps) {
  return (
    <Link
      to={post.href}
      className={`${styles.card} ${variant === 'review' ? styles.reviewVariant : styles.guideVariant}`}
    >
      {post.thumbnail && (
        <div className={styles.imageWrap}>
          <img src={post.thumbnail} alt="" className={styles.image} loading="lazy" />
        </div>
      )}

      <div className={styles.body}>
        <span className={styles.category}>{post.category}</span>
        <h3 className={styles.title}>{post.title}</h3>
        <p className={styles.excerpt}>{post.excerpt}</p>

        {variant === 'review' && post.rating != null && (
          <div className={styles.stars} aria-label={`${post.rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={i < post.rating! ? styles.starFilled : styles.starEmpty}
              >
                ★
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default FeaturedPostCard;
