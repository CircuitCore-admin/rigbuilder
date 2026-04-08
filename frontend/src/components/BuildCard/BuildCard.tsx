import { Link } from 'react-router-dom';
import { VerifiedCreatorBadge } from '../VerifiedCreatorBadge/VerifiedCreatorBadge';
import styles from './BuildCard.module.scss';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuildCardData {
  id: string;
  title: string;
  author: string;
  authorRole?: string;
  thumbnail?: string;
  upvotes: number;
  componentCount: number;
  totalPrice: number;
}

interface BuildCardProps {
  build: BuildCardData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BuildCard — compact card for community builds in grids / carousels.
 */
export function BuildCard({ build }: BuildCardProps) {
  return (
    <Link to={`/builds/${build.id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        {build.thumbnail ? (
          <img
            src={build.thumbnail}
            alt={build.title}
            className={styles.image}
            loading="lazy"
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 22l6-5 4 3 6-6 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Upvote badge */}
        <span className={styles.upvoteBadge}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 2l4 6H2l4-6z" fill="currentColor" />
          </svg>
          {build.upvotes}
        </span>
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{build.title}</h3>
        <span className={styles.author}>
          by {build.author}
          <VerifiedCreatorBadge role={build.authorRole} />
        </span>

        <div className={styles.meta}>
          <span className={styles.metaItem}>{build.componentCount} parts</span>
          <span className={styles.metaDot}>·</span>
          <span className={styles.metaItem}>
            £{build.totalPrice.toLocaleString('en-GB', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default BuildCard;
