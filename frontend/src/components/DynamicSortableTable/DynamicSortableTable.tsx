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
}

export interface TableProduct {
  id: string;
  name: string;
  manufacturer: string;
  thumbnail?: string;
  keySpec: string;
  price: number;
  rating?: number;
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

function getSpecValue(product: TableProduct, key: string, fallback = '—'): string {
  const v = product.specs?.[key];
  if (v === undefined || v === null) return fallback;
  return String(v).replace(/_/g, ' ');
}

export const CATEGORY_COLUMNS: Record<string, ColumnDef[]> = {
  WHEELBASE: [
    { key: 'name', label: 'Name', width: '1fr', getValue: (p) => p.name },
    { key: 'driveType', label: 'Drive Type', width: '140px', getValue: (p) => getSpecValue(p, 'driveType') },
    { key: 'peakTorque', label: 'Peak Torque', width: '120px', getValue: (p) => getSpecValue(p, 'peakTorque') },
    { key: 'qrType', label: 'QR Type', width: '140px', getValue: (p) => getSpecValue(p, 'qrType') },
    { key: 'price', label: 'Price', width: '120px', getValue: (p) => p.price },
  ],
  PEDALS: [
    { key: 'name', label: 'Name', width: '1fr', getValue: (p) => p.name },
    { key: 'brakeType', label: 'Brake Tech', width: '130px', getValue: (p) => getSpecValue(p, 'brakeType') },
    { key: 'pedalCount', label: 'Pedal Count', width: '110px', getValue: (p) => getSpecValue(p, 'pedalCount') },
    { key: 'maxBrakeForce', label: 'Max Force', width: '110px', getValue: (p) => getSpecValue(p, 'maxBrakeForce') },
    { key: 'price', label: 'Price', width: '120px', getValue: (p) => p.price },
  ],
  COCKPIT: [
    { key: 'name', label: 'Name', width: '1fr', getValue: (p) => p.name },
    { key: 'material', label: 'Material', width: '130px', getValue: (p) => getSpecValue(p, 'material') },
    { key: 'weightCapacity', label: 'Weight Cap', width: '120px', getValue: (p) => getSpecValue(p, 'weightCapacity') },
    { key: 'frameWidth', label: 'Frame Width', width: '120px', getValue: (p) => getSpecValue(p, 'frameWidth') },
    { key: 'price', label: 'Price', width: '120px', getValue: (p) => p.price },
  ],
  WHEEL_RIM: [
    { key: 'name', label: 'Name', width: '1fr', getValue: (p) => p.name },
    { key: 'material', label: 'Material', width: '140px', getValue: (p) => getSpecValue(p, 'material') },
    { key: 'diameter', label: 'Diameter', width: '100px', getValue: (p) => getSpecValue(p, 'diameter') },
    { key: 'buttonCount', label: 'Buttons', width: '90px', getValue: (p) => getSpecValue(p, 'buttonCount') },
    { key: 'price', label: 'Price', width: '120px', getValue: (p) => p.price },
  ],
  // Fallback for other categories
  DEFAULT: [
    { key: 'name', label: 'Name', width: '1fr', getValue: (p) => p.name },
    { key: 'keySpec', label: 'Key Spec', width: '200px', getValue: (p) => p.keySpec },
    { key: 'rating', label: 'Rating', width: '90px', getValue: (p) => p.rating ?? 0 },
    { key: 'price', label: 'Price', width: '120px', getValue: (p) => p.price },
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
                  {isSorted ? (sort.direction === 'ASC' ? '▲' : '▼') : '⇅'}
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

                return (
                  <span
                    key={col.key}
                    className={`${styles.cell} ${isName ? styles.cellName : ''} ${isPrice ? styles.cellPrice : ''}`}
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
                      </span>
                    ) : isPrice ? (
                      `£${Number(val).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
                    ) : (
                      String(val)
                    )}
                  </span>
                );
              })}
            </button>

            {/* Humanized conflict sub-text */}
            {hasConflict && humanizedText && (
              <div className={styles.conflictSubtext}>
                {isError ? '✗ ' : '⚠ '}
                {humanizedText}
              </div>
            )}
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
