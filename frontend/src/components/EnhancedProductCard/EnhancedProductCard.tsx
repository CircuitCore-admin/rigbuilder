// ============================================================================
// EnhancedProductCard — Visual product card with high-res image support,
// motorsport glow effects, and compatibility status overlay.
// ============================================================================

import { useCallback } from 'react';
import styles from './EnhancedProductCard.module.scss';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductCardData {
  id: string;
  name: string;
  manufacturer: string;
  thumbnail?: string;
  keySpec: string;
  price: number;
  rating?: number;
}

export interface CompatStatus {
  severity: 'OK' | 'WARNING' | 'ERROR';
  reasons: string[];
}

export interface EnhancedProductCardProps {
  product: ProductCardData;
  compat: CompatStatus;
  onSelect: (product: ProductCardData) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnhancedProductCard({
  product,
  compat,
  onSelect,
}: EnhancedProductCardProps) {
  const isError = compat.severity === 'ERROR';
  const isWarning = compat.severity === 'WARNING';

  const handleClick = useCallback(() => {
    if (!isError) {
      onSelect(product);
    }
  }, [isError, onSelect, product]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !isError) {
        e.preventDefault();
        onSelect(product);
      }
    },
    [isError, onSelect, product],
  );

  return (
    <div
      className={`${styles.card} ${
        isError ? styles.cardError : isWarning ? styles.cardWarning : styles.cardOk
      }`}
      role="button"
      tabIndex={isError ? -1 : 0}
      aria-disabled={isError}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Image container with glow */}
      <div className={styles.imageWrap}>
        {product.thumbnail ? (
          <img
            className={styles.image}
            src={product.thumbnail}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect x="4" y="8" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="14" cy="18" r="3" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 28l10-8 6 5 6-4 10 7" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Compatibility banner overlay */}
        {isError && (
          <div className={styles.conflictBanner}>
            <span className={styles.conflictIcon}>✗</span>
            Conflict Detected
          </div>
        )}
        {isWarning && (
          <div className={styles.warningBanner}>
            <span className={styles.conflictIcon}>⚠</span>
            Check Compatibility
          </div>
        )}

        {/* Glow border (only for compatible / selected) */}
        {!isError && !isWarning && <div className={styles.glowBorder} />}
      </div>

      {/* Card body */}
      <div className={styles.body}>
        <span className={styles.manufacturer}>{product.manufacturer}</span>
        <h4 className={styles.productName}>{product.name}</h4>
        <span className={styles.keySpec}>{product.keySpec}</span>

        {/* Footer: rating + price */}
        <div className={styles.footer}>
          <div className={styles.ratingWrap}>
            {product.rating != null && (
              <>
                <span className={styles.ratingStar}>★</span>
                <span className={styles.ratingValue}>{product.rating.toFixed(1)}</span>
              </>
            )}
          </div>
          <span className={styles.price}>
            £{product.price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Conflict reason (single line) */}
        {(isError || isWarning) && compat.reasons.length > 0 && (
          <div className={styles.reasonText}>
            {compat.reasons[0]}
          </div>
        )}
      </div>

      {/* Select button */}
      {!isError && (
        <button
          type="button"
          className={styles.selectBtn}
          tabIndex={-1}
          aria-hidden="true"
        >
          Select
        </button>
      )}
    </div>
  );
}

export default EnhancedProductCard;
