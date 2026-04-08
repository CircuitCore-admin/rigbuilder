// ============================================================================
// ProductCardStandard — Large hero-style 2-column grid card.
// Shows a large image, expanded inline specs, and full compatibility info.
// Motorsport broadcast aesthetic with kinetic hover glow.
// ============================================================================

import styles from './ProductCardStandard.module.scss';
import type { TableProduct, CompatInfo, ColumnDef } from '../DynamicSortableTable/DynamicSortableTable';
import { humanizeConflict } from '../../utils/humanizedConflict';

export interface ProductCardStandardProps {
  product: TableProduct;
  compat: CompatInfo;
  columns: ColumnDef[];
  onSelect: (product: TableProduct) => void;
  /** Navigate to product detail page (card click area, excluding the Add button). */
  onNavigate?: (product: TableProduct) => void;
}

export function ProductCardStandard({ product, compat, columns, onSelect, onNavigate }: ProductCardStandardProps) {
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

  // Get spec columns (skip name and price, those are rendered separately)
  const specColumns = columns.filter((c) => c.key !== 'name' && c.key !== 'price');

  return (
    <div
      className={`${styles.card} ${isError ? styles.cardError : ''} ${isWarning ? styles.cardWarning : ''}`}
    >
      {/* Conflict indicator bar */}
      {hasConflict && (
        <div className={`${styles.conflictBar} ${isError ? styles.conflictBarError : styles.conflictBarWarning}`} />
      )}

      {/* Clickable area → navigates to detail page */}
      <div
        className={styles.cardBody}
        role="button"
        tabIndex={0}
        onClick={() => onNavigate ? onNavigate(product) : (!isError && onSelect(product))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigate ? onNavigate(product) : (!isError && onSelect(product));
          }
        }}
      >
        {/* Hero image */}
        <div className={styles.imageWrap}>
          {product.thumbnail ? (
            <img src={product.thumbnail} alt={product.name} className={styles.image} loading="lazy" />
          ) : (
            <div className={styles.imagePlaceholder}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <rect x="4" y="4" width="40" height="40" rx="6" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="17" cy="17" r="4" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 38l10-14 7 9 5-5 14 10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {isPopular && <span className={styles.popularTag}>Most Popular</span>}
        </div>

        {/* Content body */}
        <div className={styles.body}>
          {/* Header */}
          <div className={styles.header}>
            <span className={styles.manufacturer}>{product.manufacturer}</span>
            <h3 className={styles.name}>{product.name}</h3>
            <span className={styles.keySpec}>{product.keySpec}</span>
          </div>

          {/* Inline specs grid */}
          <div className={styles.specsGrid}>
            {specColumns.map((col) => (
              <div key={col.key} className={styles.specItem}>
                <span className={styles.specLabel}>{col.label}</span>
                <span className={styles.specValue}>{String(col.getValue(product))}</span>
              </div>
            ))}
            {product.weight != null && (
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Weight</span>
                <span className={styles.specValue}>{product.weight} kg</span>
              </div>
            )}
          </div>

          {/* Footer: Price + Rating */}
          <div className={styles.footer}>
            <span className={styles.price}>
              £{product.price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </span>
            {product.rating && (
              <span className={styles.rating}>★ {product.rating.toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Add to Build button */}
      <button
        type="button"
        className={styles.addButton}
        onClick={() => !isError && onSelect(product)}
        disabled={isError}
      >
        Add to Build
      </button>

      {/* Conflict line */}
      {hasConflict && conflictText && (
        <div className={styles.conflictLine}>
          {isError ? '✗ ' : '⚠ '}{conflictText}
        </div>
      )}
    </div>
  );
}

export default ProductCardStandard;
