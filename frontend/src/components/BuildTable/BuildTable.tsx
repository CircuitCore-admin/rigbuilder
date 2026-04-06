import { useCallback, useMemo } from 'react';
import styles from './BuildTable.module.scss';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CategorySlot =
  | 'COCKPIT'
  | 'WHEELBASE'
  | 'WHEEL_RIM'
  | 'PEDALS'
  | 'SHIFTER'
  | 'DISPLAY'
  | 'SEAT'
  | 'EXTRAS';

export type CompatStatus = 'ok' | 'warning' | 'error';

export interface SelectedPart {
  id: string;
  name: string;
  thumbnail?: string;
  keySpec: string;
  rating?: number;
  price: number;
}

export interface BuildTableProps {
  /** Map of category slot → selected product (or undefined if empty). */
  parts: Partial<Record<CategorySlot, SelectedPart>>;
  /** Overall compatibility status. */
  compatibility: { status: CompatStatus; label: string };
  /** Total estimated rig weight in kg. */
  totalWeight: number;
  /** Currency symbol. */
  currency?: string;
  /** Fired when user clicks a category row to open the product picker. */
  onSelectCategory: (slot: CategorySlot) => void;
  /** Fired when user clicks Save. */
  onSave?: () => void;
  /** Fired when user clicks Share. */
  onShare?: () => void;
}

// ---------------------------------------------------------------------------
// Slot metadata
// ---------------------------------------------------------------------------

interface SlotMeta {
  slot: CategorySlot;
  label: string;
  icon: string;
  optional?: boolean;
}

const SLOTS: SlotMeta[] = [
  { slot: 'COCKPIT', label: 'Cockpit', icon: '🪑' },
  { slot: 'WHEELBASE', label: 'Wheelbase', icon: '🔧' },
  { slot: 'WHEEL_RIM', label: 'Wheel Rim', icon: '🎡' },
  { slot: 'PEDALS', label: 'Pedals', icon: '🦶' },
  { slot: 'SHIFTER', label: 'Shifter', icon: '⬆️', optional: true },
  { slot: 'DISPLAY', label: 'Display', icon: '🖥️' },
  { slot: 'SEAT', label: 'Seat', icon: '💺', optional: true },
  { slot: 'EXTRAS', label: 'Extras', icon: '➕', optional: true },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BuildTable — The core configurator table in "Table Mode".
 *
 * Renders a category-per-row layout with inline specs, ratings, and prices.
 * Follows the broadcast-overlay design language (monospace prices,
 * accent-green left borders on filled rows, gradient-border total row).
 */
export function BuildTable({
  parts,
  compatibility,
  totalWeight,
  currency = '£',
  onSelectCategory,
  onSave,
  onShare,
}: BuildTableProps) {
  const totalPrice = useMemo(
    () =>
      Object.values(parts).reduce((sum, p) => sum + (p?.price ?? 0), 0),
    [parts],
  );

  const formatPrice = useCallback(
    (value: number) => `${currency}${value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
    [currency],
  );

  const compatClass =
    compatibility.status === 'ok'
      ? styles.statusOk
      : compatibility.status === 'warning'
        ? styles.statusWarning
        : styles.statusError;

  return (
    <div className={styles.wrapper}>
      {/* Title bar */}
      <div className={styles.tableHeader}>
        <h2 className={styles.tableTitle}>Your Build</h2>
        <div className={styles.actions}>
          {onSave && <button type="button" onClick={onSave}>Save</button>}
          {onShare && <button type="button" onClick={onShare}>Share</button>}
        </div>
      </div>

      {/* Column headers */}
      <div className={styles.headerRow} role="row">
        <span className={styles.headerCell}>Category</span>
        <span className={styles.headerCell}>Selected Part</span>
        <span className={`${styles.headerCell} ${styles.hideOnMobile}`}>Key Spec</span>
        <span className={`${styles.headerCell} ${styles.alignCenter} ${styles.hideOnMobile}`}>Rating</span>
        <span className={`${styles.headerCell} ${styles.alignRight}`}>Price</span>
      </div>

      {/* Category rows */}
      {SLOTS.map(({ slot, label, icon, optional }) => {
        const part = parts[slot];
        const isFilled = !!part;

        return (
          <div
            key={slot}
            className={`${styles.categoryRow} ${isFilled ? styles.filled : ''}`}
            role="row"
            onClick={() => onSelectCategory(slot)}
          >
            {/* Category */}
            <div className={styles.categoryLabel}>
              <span className={styles.categoryIcon} aria-hidden="true">{icon}</span>
              <span className={styles.categoryName}>{label}</span>
            </div>

            {/* Product or empty prompt */}
            {isFilled ? (
              <div className={styles.productInfo}>
                {part.thumbnail && (
                  <img
                    className={styles.productThumb}
                    src={part.thumbnail}
                    alt=""
                    loading="lazy"
                  />
                )}
                <span className={styles.productName}>{part.name}</span>
              </div>
            ) : (
              <div className={styles.emptySlot}>
                <button type="button" className={styles.chooseButton}>
                  <span className={styles.plusIcon}>+</span>
                  Choose {label}
                  {optional && ' (opt)'}
                </button>
              </div>
            )}

            {/* Key spec */}
            <div className={styles.specValue}>{part?.keySpec ?? ''}</div>

            {/* Rating */}
            <div className={styles.rating}>
              {part?.rating != null && (
                <>
                  <span className={styles.ratingStar}>★</span>
                  {part.rating.toFixed(1)}
                </>
              )}
            </div>

            {/* Price */}
            <div className={styles.price}>
              {isFilled ? formatPrice(part.price) : ''}
            </div>
          </div>
        );
      })}

      {/* Total row */}
      <div className={styles.totalRow} role="row">
        <span className={styles.totalLabel}>Estimated Total</span>
        <span className={styles.totalPrice}>{formatPrice(totalPrice)}</span>
      </div>

      {/* Compatibility status */}
      <div className={styles.statusRow} role="row">
        <span className={styles.statusLabel}>Compatibility</span>
        <span className={`${styles.statusValue} ${compatClass}`}>
          {compatibility.label}
        </span>
      </div>

      {/* Weight */}
      <div className={styles.statusRow} role="row">
        <span className={styles.statusLabel}>Estimated Weight</span>
        <span className={`${styles.statusValue} ${styles.statusOk}`}>
          {totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : '—'}
        </span>
      </div>
    </div>
  );
}

export default BuildTable;
