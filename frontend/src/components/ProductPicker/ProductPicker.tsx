// ============================================================================
// ProductPicker — Expandable panel for choosing a product in a category slot.
// Uses the CompatibilityEngine to grey out incompatible products in real-time.
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import styles from './ProductPicker.module.scss';
import type { CategorySlot, SelectedPart } from '../../stores/buildStore';
import { useBuildStore } from '../../stores/buildStore';
import { CompatibilityEngine } from '../../utils/compatibilityEngine';
import type { ProductInput, ProductCategory } from '../../types/productSpecs';
import type { CompatibilityResult } from '../../types/compatibility';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PickerProduct {
  id: string;
  name: string;
  manufacturer: string;
  thumbnail?: string;
  keySpec: string;
  price: number;
  rating?: number;
  weight?: number;
  /** Full product input for compatibility checks. */
  productInput?: ProductInput;
}

export interface ProductPickerProps {
  /** Which category slot this picker is selecting for. */
  slot: CategorySlot;
  /** Label for the category. */
  slotLabel: string;
  /** Available products to choose from. */
  products: PickerProduct[];
  /** Called when user selects a product. */
  onSelect: (slot: CategorySlot, part: SelectedPart) => void;
  /** Called when user closes the picker. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Compatibility status for a single product
// ---------------------------------------------------------------------------

interface ProductCompatStatus {
  severity: 'OK' | 'WARNING' | 'ERROR';
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductPicker({
  slot,
  slotLabel,
  products,
  onSelect,
  onClose,
}: ProductPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const selectedParts = useBuildStore((s) => s.selectedParts);

  // Build list of currently selected products (excluding the slot being picked)
  const buildProducts = useMemo(() => {
    const result: ProductInput[] = [];
    for (const [s, part] of Object.entries(selectedParts) as [CategorySlot, SelectedPart][]) {
      if (s === slot || !part) continue;
      if (part.productInput) {
        result.push(part.productInput);
      } else {
        result.push({
          id: part.id,
          category: s as ProductCategory,
          specs: {} as ProductInput['specs'],
          platforms: [],
        });
      }
    }
    return result;
  }, [selectedParts, slot]);

  // Pre-compute compatibility for ALL products in the list
  const compatMap = useMemo(() => {
    const map = new Map<string, ProductCompatStatus>();

    for (const product of products) {
      if (!product.productInput || buildProducts.length === 0) {
        map.set(product.id, { severity: 'OK', reasons: [] });
        continue;
      }

      const result: CompatibilityResult = CompatibilityEngine.checkCandidate(
        product.productInput,
        buildProducts,
      );

      const reasons = result.conflicts.map((c) => c.message);
      map.set(product.id, {
        severity: result.overallSeverity,
        reasons,
      });
    }

    return map;
  }, [products, buildProducts]);

  // Filter by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.manufacturer.toLowerCase().includes(q) ||
        p.keySpec.toLowerCase().includes(q),
    );
  }, [products, searchQuery]);

  // Sort: compatible first, then warnings, then errors
  const sortedProducts = useMemo(() => {
    const severityOrder = { OK: 0, WARNING: 1, ERROR: 2 };
    return [...filteredProducts].sort((a, b) => {
      const aSev = compatMap.get(a.id)?.severity ?? 'OK';
      const bSev = compatMap.get(b.id)?.severity ?? 'OK';
      return severityOrder[aSev] - severityOrder[bSev];
    });
  }, [filteredProducts, compatMap]);

  const handleSelect = useCallback(
    (product: PickerProduct) => {
      const part: SelectedPart = {
        id: product.id,
        name: product.name,
        thumbnail: product.thumbnail,
        keySpec: product.keySpec,
        price: product.price,
        rating: product.rating,
        weight: product.weight,
        productInput: product.productInput,
      };
      onSelect(slot, part);
    },
    [slot, onSelect],
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h3 className={styles.title}>Choose {slotLabel}</h3>
            <span className={styles.count}>
              {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={`Search ${slotLabel.toLowerCase()}…`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Product list */}
        <div className={styles.list}>
          {sortedProducts.length === 0 && (
            <div className={styles.emptyState}>
              No products match your search.
            </div>
          )}

          {sortedProducts.map((product) => {
            const compat = compatMap.get(product.id) ?? { severity: 'OK' as const, reasons: [] };
            const isError = compat.severity === 'ERROR';
            const isWarning = compat.severity === 'WARNING';

            return (
              <button
                key={product.id}
                type="button"
                className={`${styles.productRow} ${
                  isError ? styles.productError : isWarning ? styles.productWarning : ''
                }`}
                onClick={() => handleSelect(product)}
                disabled={isError}
              >
                {/* Thumbnail */}
                <div className={styles.thumbWrap}>
                  {product.thumbnail ? (
                    <img
                      className={styles.thumb}
                      src={product.thumbnail}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.thumbPlaceholder} />
                  )}
                </div>

                {/* Product info */}
                <div className={styles.productInfo}>
                  <span className={styles.productName}>{product.name}</span>
                  <span className={styles.manufacturer}>{product.manufacturer}</span>
                </div>

                {/* Key spec */}
                <div className={styles.specCol}>
                  <span className={styles.specValue}>{product.keySpec}</span>
                </div>

                {/* Rating */}
                <div className={styles.ratingCol}>
                  {product.rating != null && (
                    <span className={styles.rating}>
                      <span className={styles.ratingStar}>★</span>
                      {product.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className={styles.priceCol}>
                  <span className={styles.price}>
                    £{product.price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Compatibility badge */}
                <div className={styles.compatCol}>
                  {isError && (
                    <div className={styles.compatBadge} data-severity="error">
                      <span className={styles.compatIcon}>✗</span>
                      <span className={styles.compatLabel}>Incompatible</span>
                    </div>
                  )}
                  {isWarning && (
                    <div className={styles.compatBadge} data-severity="warning">
                      <span className={styles.compatIcon}>⚠</span>
                      <span className={styles.compatLabel}>Check Compat</span>
                    </div>
                  )}
                  {!isError && !isWarning && (
                    <div className={styles.compatBadge} data-severity="ok">
                      <span className={styles.compatIcon}>✓</span>
                    </div>
                  )}
                </div>

                {/* Reason tooltip row (shown for incompatible/warning) */}
                {(isError || isWarning) && compat.reasons.length > 0 && (
                  <div className={styles.reasonRow}>
                    {isError ? '❌ ' : '⚠️ '}
                    {compat.reasons[0]}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ProductPicker;
