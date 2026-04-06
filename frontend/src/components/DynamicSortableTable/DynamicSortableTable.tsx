// ============================================================================
// DynamicSortableTable — Category-aware list view with clickable column
// headers for ASC/DESC sorting. Uses IBM Plex Mono for the "broadcast data"
// aesthetic. Displays humanized compatibility conflicts as sub-text rows.
// ============================================================================

import { useCallback } from 'react';
import styles from './DynamicSortableTable.module.scss';
import type { CompatibilityCode } from '../../types/compatibility';
import { humanizeConflict } from '../../utils/humanizedConflict';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortDirection = 'ASC' | 'DESC';

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface ColumnDef {
  key: string;
  label: string;
  /** Width hint (CSS value, e.g. '1fr', '120px'). */
  width?: string;
  /** How to render the cell value from the product. */
  getValue: (product: TableProduct) => string | number;
  /** Whether this column can be sorted. Default true. */
  sortable?: boolean;
  /** If true, sort numerically (strips units like "Nm", "kg", "mm" before comparing). */
  numeric?: boolean;
  /** If true, right-align cell content (used for numeric data columns). */
  alignRight?: boolean;
  /** Optional custom render for cell content (e.g. StarRating). */
  renderCell?: (product: TableProduct) => React.ReactNode;
}

export interface TableProduct {
  id: string;
  name: string;
  manufacturer: string;
  thumbnail?: string;
  keySpec: string;
  price: number;
  rating?: number;
  reviewCount?: number;
  weight?: number;
  /** Arbitrary specs for column rendering. */
  specs?: Record<string, unknown>;
}

export interface CompatInfo {
  severity: 'OK' | 'WARNING' | 'ERROR';
  reasons: string[];
  /** Raw conflict data for humanization. */
  conflicts?: Array<{ code: CompatibilityCode; message: string; severity: 'OK' | 'WARNING' | 'ERROR' }>;
}

export interface DynamicSortableTableProps {
  products: TableProduct[];
  columns: ColumnDef[];
  compatMap: Map<string, CompatInfo>;
  sort: SortState;
  onSortChange: (next: SortState) => void;
  onSelect: (product: TableProduct) => void;
}

// ---------------------------------------------------------------------------
// Category column definitions
// ---------------------------------------------------------------------------

/** Convert snake_case/lowercase spec values to Title Case for display. */
function toTitleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSpecValue(product: TableProduct, key: string, fallback = '—'): string {
  const v = product.specs?.[key];
  if (v === undefined || v === null) return fallback;
  return toTitleCase(String(v));
}

/** Inline star rating renderer: filled stars in accent-primary + muted review count. */
function StarRating({ rating, count }: { rating: number; count: number }) {
  const filled = Math.round(rating);
  return (
    <span className={styles.starRating} role="img" aria-label={`${rating.toFixed(1)} out of 5 stars, ${count} reviews`}>
      <span className={styles.stars} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= filled ? styles.starFilled : styles.starEmpty}>★</span>
        ))}
      </span>
      <span className={styles.reviewCount}>({count})</span>
    </span>
  );
}

export const CATEGORY_COLUMNS: Record<string, ColumnDef[]> = {
  WHEELBASE: [
    { key: 'name', label: 'Name', width: '1fr', getValue: (p) => p.name },
    { key: 'driveType', label: 'Drive Type', width: '130px', getValue: (p) => getSpecValue(p, 'driveType') },
    { key: 'peakTorque', label: 'Peak Torque', width: '110px', getValue: (p) => getSpecValue(p, 'peakTorque'), numeric: true, alignRight: true },
    { key: 'qrType', label: 'QR Type', width: '130px', getValue: (p) => getSpecValue(p, 'qrType') },
    { key: 'mountingPattern', label: 'Mounting', width: '140px', getValue: (p) => getSpecValue(p, 'mountingPattern') },
    { key: 'rating', label: 'Rating', width: '140px', getValue: (p) => p.rating ?? 0, numeric: true, renderCell: (p) => <StarRating rating={p.rating ?? 0} count={p.reviewCount ?? 0} /> },
    { key: 'price', label: 'Price', width: '110px', getValue: (p) => p.price, numeric: true, alignRight: true },
  ],
  PEDALS: [
    { key: 'name', label: 'Name', width: '1fr', getValue: (p) => p.name },
    { key: 'brakeType', label: 'Brake Tech', width: '120px', getValue: (p) => getSpecValue(p, 'brakeType') },
    { key: 'maxBrakeForce', label: 'Max Force', width: '110px', getValue: (p) => getSpecValue(p, 'maxBrakeForce'), numeric: true, alignRight: true },
    { key: 'mountingPattern', label: 'Mounting', width: '140px', getValue: (p) => getSpecValue(p, 'mountingPattern') },
    { key: 'rating', label: 'Rating', width: '140px', getValue: (p) => p.rating ?? 0, numeric: true, renderCell: (p) => <StarRating rating={p.rating ?? 0} count={p.reviewCount ?? 0} /> },
    { key: 'price', label: 'Price', width: '110px', getValue: (p) => p.price, numeric: true, alignRight: true },
  ],
  COCKPIT: [
    { key: 'name', label: 'Name', width: '1fr', getValue: (p) => p.name },
    { key: 'material', label: 'Material', width: '120px', getValue: (p) => getSpecValue(p, 'material') },
    { key: 'weightCapacity', label: 'Weight Cap', width: '110px', getValue: (p) => getSpecValue(p, 'weightCapacity'), numeric: true, alignRight: true },
    { key: 'frameWidth', label: 'Frame Width', width: '110px', getValue: (p) => getSpecValue(p, 'frameWidth'), numeric: true, alignRight: true },
    { key: 'rating', label: 'Rating', width: '140px', getValue: (p) => p.rating ?? 0, numeric: true, renderCell: (p) => <StarRating rating={p.rating ?? 0} count={p.reviewCount ?? 0} /> },
    { key: 'price', label: 'Price', width: '110px', getValue: (p) => p.price, numeric: true, alignRight: true },
  ],
  WHEEL_RIM: [
    { key: 'name', label: 'Name', width: '1fr', getValue: (p) => p.name },
    { key: 'material', label: 'Material', width: '130px', getValue: (p) => getSpecValue(p, 'material') },
    { key: 'diameter', label: 'Diameter', width: '100px', getValue: (p) => getSpecValue(p, 'diameter'), numeric: true, alignRight: true },
    { key: 'buttonCount', label: 'Buttons', width: '90px', getValue: (p) => getSpecValue(p, 'buttonCount'), numeric: true, alignRight: true },
    { key: 'rating', label: 'Rating', width: '140px', getValue: (p) => p.rating ?? 0, numeric: true, renderCell: (p) => <StarRating rating={p.rating ?? 0} count={p.reviewCount ?? 0} /> },
    { key: 'price', label: 'Price', width: '110px', getValue: (p) => p.price, numeric: true, alignRight: true },
  ],
  // Fallback for other categories
  DEFAULT: [
    { key: 'name', label: 'Name', width: '1fr', getValue: (p) => p.name },
    { key: 'keySpec', label: 'Key Spec', width: '180px', getValue: (p) => p.keySpec },
    { key: 'rating', label: 'Rating', width: '140px', getValue: (p) => p.rating ?? 0, numeric: true, renderCell: (p) => <StarRating rating={p.rating ?? 0} count={p.reviewCount ?? 0} /> },
    { key: 'price', label: 'Price', width: '110px', getValue: (p) => p.price, numeric: true, alignRight: true },
  ],
};

export function getColumnsForCategory(category: string): ColumnDef[] {
  return CATEGORY_COLUMNS[category] ?? CATEGORY_COLUMNS.DEFAULT;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DynamicSortableTable({
  products,
  columns,
  compatMap,
  sort,
  onSortChange,
  onSelect,
}: DynamicSortableTableProps) {
  const handleHeaderClick = useCallback(
    (colKey: string) => {
      if (sort.column === colKey) {
        onSortChange({ column: colKey, direction: sort.direction === 'ASC' ? 'DESC' : 'ASC' });
      } else {
        onSortChange({ column: colKey, direction: 'ASC' });
      }
    },
    [sort, onSortChange],
  );

  const gridCols = columns.map((c) => c.width ?? '1fr').join(' ');

  return (
    <div className={styles.table} role="table" aria-label="Product list">
      {/* Header row */}
      <div
        className={styles.headerRow}
        style={{ gridTemplateColumns: gridCols }}
        role="row"
      >
        {columns.map((col) => {
          const isSorted = sort.column === col.key;
          const sortable = col.sortable !== false;
          return (
            <button
              key={col.key}
              type="button"
              className={`${styles.headerCell} ${isSorted ? styles.headerActive : ''}`}
              onClick={sortable ? () => handleHeaderClick(col.key) : undefined}
              disabled={!sortable}
              role="columnheader"
              aria-sort={isSorted ? (sort.direction === 'ASC' ? 'ascending' : 'descending') : 'none'}
            >
              <span className={styles.headerLabel}>{col.label}</span>
              {sortable && (
                <span className={styles.sortIndicator}>
                  {isSorted ? (sort.direction === 'ASC' ? '↑' : '↓') : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Data rows */}
      {products.map((product) => {
        const compat = compatMap.get(product.id) ?? { severity: 'OK' as const, reasons: [], conflicts: [] };
        const isError = compat.severity === 'ERROR';
        const isWarning = compat.severity === 'WARNING';
        const hasConflict = isError || isWarning;

        // Humanize the first conflict for sub-text
        let humanizedText = '';
        if (hasConflict && compat.conflicts && compat.conflicts.length > 0) {
          const first = compat.conflicts[0];
          const result = humanizeConflict(first.code, first.message, first.severity);
          humanizedText = result.text;
        } else if (hasConflict && compat.reasons.length > 0) {
          humanizedText = compat.reasons[0];
        }

        return (
          <div
            key={product.id}
            className={`${styles.dataRow} ${
              isError ? styles.rowError : isWarning ? styles.rowWarning : ''
            }`}
            role="row"
          >
            {/* Conflict left-bar indicator */}
            {hasConflict && (
              <div
                className={`${styles.conflictBar} ${isError ? styles.conflictBarError : styles.conflictBarWarning}`}
              />
            )}

            {/* Main row content */}
            <button
              type="button"
              className={styles.rowBtn}
              style={{ gridTemplateColumns: gridCols }}
              onClick={() => !isError && onSelect(product)}
              disabled={isError}
            >
              {columns.map((col) => {
                const val = col.getValue(product);
                const isName = col.key === 'name';
                const isPrice = col.key === 'price';
                const hasCustomRender = !!col.renderCell;

                return (
                  <span
                    key={col.key}
                    className={`${styles.cell} ${isName ? styles.cellName : ''} ${isPrice ? styles.cellPrice : ''} ${col.alignRight ? styles.cellRight : ''}`}
                  >
                    {isName && product.thumbnail && (
                      <img
                        className={styles.rowThumb}
                        src={product.thumbnail}
                        alt=""
                        loading="lazy"
                      />
                    )}
                    {isName ? (
                      <span className={styles.nameWrap}>
                        <span className={styles.productName}>{val}</span>
                        <span className={styles.manufacturer}>{product.manufacturer}</span>
                        {hasConflict && humanizedText && (
                          <span className={`${styles.conflictInline} ${isError ? styles.conflictInlineError : styles.conflictInlineWarning}`}>
                            ⚠️ {humanizedText}
                          </span>
                        )}
                      </span>
                    ) : hasCustomRender ? (
                      col.renderCell!(product)
                    ) : isPrice ? (
                      `£${Number(val).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
                    ) : (
                      String(val)
                    )}
                  </span>
                );
              })}
            </button>
          </div>
        );
      })}

      {products.length === 0 && (
        <div className={styles.emptyRow}>
          No products match your filters.
        </div>
      )}
    </div>
  );
}

export default DynamicSortableTable;
