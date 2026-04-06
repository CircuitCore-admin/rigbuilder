// ============================================================================
// ProductCardCompact — Small 4-column grid card.
// Shows image, price, key spec, and a "Most Popular" tag for top-rated items.
// Uses motorsport broadcast aesthetic with kinetic hover glow.
// ============================================================================

import styles from './ProductCardCompact.module.scss';
import type { TableProduct, CompatInfo } from '../DynamicSortableTable/DynamicSortableTable';
import { humanizeConflict } from '../../utils/humanizedConflict';

export interface ProductCardCompactProps {
  product: TableProduct;
  compat: CompatInfo;
  onSelect: (product: TableProduct) => void;
}

export function ProductCardCompact({ product, compat, onSelect }: ProductCardCompactProps) {
  const isError = compat.severity === 'ERROR';
  const isWarning = compat.severity === 'WARNING';
  const hasConflict = isError || isWarning;
  const isPopular = (product.rating ?? 0) >= 4.5;

  // Humanize conflict
  let conflictText = '';
  if (hasConflict && compat.conflicts && compat.conflicts.length > 0) {
    const first = compat.conflicts[0];
    conflictText = humanizeConflict(first.code, first.message, first.severity).text;
  } else if (hasConflict && compat.reasons.length > 0) {
    conflictText = compat.reasons[0];
  }

  return (
    <button
      type="button"
      className={`${styles.card} ${isError ? styles.cardError : ''} ${isWarning ? styles.cardWarning : ''}`}
      onClick={() => !isError && onSelect(product)}
      disabled={isError}
    >
      {/* Conflict indicator bar */}
      {hasConflict && (
        <div className={`${styles.conflictBar} ${isError ? styles.conflictBarError : styles.conflictBarWarning}`} />
      )}

      {/* Image area */}
      <div className={styles.imageWrap}>
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.name} className={styles.image} loading="lazy" />
        ) : (
          <div className={styles.imagePlaceholder}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 22l6-8 4 5 3-3 7 6" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {isPopular && <span className={styles.popularTag}>Popular</span>}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <span className={styles.manufacturer}>{product.manufacturer}</span>
        <span className={styles.name}>{product.name}</span>
        <span className={styles.keySpec}>{product.keySpec}</span>
      </div>

      {/* Price */}
      <div className={styles.priceRow}>
        <span className={styles.price}>
          £{product.price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
        </span>
        {product.rating && (
          <span className={styles.rating}>★ {product.rating.toFixed(1)}</span>
        )}
      </div>

      {/* Conflict tooltip */}
      {hasConflict && conflictText && (
        <div className={styles.conflictHint}>
          {isError ? '✗ ' : '⚠ '}{conflictText}
        </div>
      )}
    </button>
  );
}

export default ProductCardCompact;
