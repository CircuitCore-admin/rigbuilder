import { useState, useMemo, useCallback } from 'react';
import styles from './Configurator.module.scss';
import type { CategorySlot, SelectedPart } from '../BuildTable/BuildTable';

// ---------------------------------------------------------------------------
// Slot metadata
// ---------------------------------------------------------------------------

interface SlotMeta {
  slot: CategorySlot;
  label: string;
  specLabel: string;
  optional?: boolean;
}

const SLOTS: SlotMeta[] = [
  { slot: 'COCKPIT', label: 'Cockpit / Frame', specLabel: 'Material' },
  { slot: 'WHEELBASE', label: 'Wheelbase', specLabel: 'Torque' },
  { slot: 'WHEEL_RIM', label: 'Wheel Rim', specLabel: 'Diameter' },
  { slot: 'PEDALS', label: 'Pedals', specLabel: 'Type' },
  { slot: 'SHIFTER', label: 'Shifter', specLabel: 'Mode', optional: true },
  { slot: 'DISPLAY', label: 'Display', specLabel: 'Size' },
  { slot: 'SEAT', label: 'Seat', specLabel: 'Type', optional: true },
  { slot: 'EXTRAS', label: 'Extras', specLabel: 'Type', optional: true },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConfiguratorProps {
  parts: Partial<Record<CategorySlot, SelectedPart>>;
  onSelectCategory: (slot: CategorySlot) => void;
  onRemovePart: (slot: CategorySlot) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Configurator({ parts, onSelectCategory, onRemovePart }: ConfiguratorProps) {
  const [hoveredSlot, setHoveredSlot] = useState<CategorySlot | null>(null);

  const totalPrice = useMemo(
    () => Object.values(parts).reduce((sum, p) => sum + (p?.price ?? 0), 0),
    [parts],
  );

  const filledCount = Object.keys(parts).length;

  return (
    <div className={styles.table}>
      {/* Column headers */}
      <div className={styles.headerRow}>
        <span className={styles.headerCell}>Component</span>
        <span className={styles.headerCell}>Selection</span>
        <span className={`${styles.headerCell} ${styles.specCol}`}>Base</span>
        <span className={`${styles.headerCell} ${styles.ratingCol}`}>Rating</span>
        <span className={`${styles.headerCell} ${styles.priceCol}`}>Price</span>
        <span className={`${styles.headerCell} ${styles.actionCol}`}></span>
      </div>

      {/* Category rows */}
      {SLOTS.map(({ slot, label, specLabel, optional }) => {
        const part = parts[slot];
        const isFilled = !!part;
        const isHovered = hoveredSlot === slot;

        return (
          <div
            key={slot}
            className={`${styles.row} ${isFilled ? styles.rowFilled : ''} ${isHovered ? styles.rowHover : ''}`}
            onMouseEnter={() => setHoveredSlot(slot)}
            onMouseLeave={() => setHoveredSlot(null)}
          >
            {/* Category */}
            <div className={styles.categoryCell}>
              <div className={styles.categoryDot} data-filled={isFilled} />
              <div>
                <span className={styles.categoryName}>{label}</span>
                {optional && <span className={styles.optionalTag}>OPT</span>}
              </div>
            </div>

            {/* Selection */}
            <div className={styles.selectionCell}>
              {isFilled ? (
                <div className={styles.partInfo}>
                  {part.thumbnail && (
                    <img className={styles.partThumb} src={part.thumbnail} alt="" loading="lazy" />
                  )}
                  <div className={styles.partDetails}>
                    <span className={styles.partName}>{part.name}</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.chooseBtn}
                  onClick={() => onSelectCategory(slot)}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.plusIcon}>
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Choose A {label}
                </button>
              )}
            </div>

            {/* Key spec */}
            <div className={`${styles.specCell} ${styles.specCol}`}>
              {isFilled && (
                <span className={styles.specValue}>{part.keySpec}</span>
              )}
            </div>

            {/* Rating */}
            <div className={`${styles.ratingCell} ${styles.ratingCol}`}>
              {part?.rating != null && (
                <div className={styles.ratingWrap}>
                  <span className={styles.ratingStar}>★</span>
                  <span>{part.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className={`${styles.priceCell} ${styles.priceCol}`}>
              {isFilled && (
                <span className={styles.priceValue}>
                  £{part.price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className={`${styles.actionCell} ${styles.actionCol}`}>
              {isFilled ? (
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.buyBtn}
                    title="Buy"
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => onRemovePart(slot)}
                    title="Remove"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.browseBtn}
                  onClick={() => onSelectCategory(slot)}
                >
                  Browse →
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Total row */}
      <div className={styles.totalRow}>
        <div className={styles.totalLabel}>
          <span className={styles.totalText}>Estimated Total</span>
          <span className={styles.totalCount}>{filledCount} component{filledCount !== 1 ? 's' : ''}</span>
        </div>
        <div className={styles.totalPrice}>
          £{totalPrice.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

export default Configurator;
