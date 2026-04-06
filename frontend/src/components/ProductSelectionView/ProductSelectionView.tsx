// ============================================================================
// ProductSelectionView — Full-screen product browsing interface.
// Replaces the modal ProductPicker with a dedicated viewport takeover.
// Features: left sidebar filters, multi-mode view (list / compact / standard),
// dynamic sortable list, compatibility integration, humanized conflict
// messages, and URL-based state.
// ============================================================================

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import styles from './ProductSelectionView.module.scss';
import { DynamicSortableTable, getColumnsForCategory } from '../DynamicSortableTable/DynamicSortableTable';
import type { SortState, TableProduct, CompatInfo } from '../DynamicSortableTable/DynamicSortableTable';
import { ViewSwitcher } from '../ViewSwitcher/ViewSwitcher';
import type { ViewMode } from '../ViewSwitcher/ViewSwitcher';
import { ProductCardCompact } from '../ProductCardCompact/ProductCardCompact';
import { ProductCardStandard } from '../ProductCardStandard/ProductCardStandard';
import { Navbar } from '../Navbar/Navbar';
import { useBuildStore } from '../../stores/buildStore';
import type { CategorySlot, SelectedPart } from '../../stores/buildStore';
import { CompatibilityEngine } from '../../utils/compatibilityEngine';
import type { ProductInput, ProductCategory, Platform } from '../../types/productSpecs';
import type { CompatibilityResult } from '../../types/compatibility';
import {
  applyFilters,
  deriveManufacturers,
  derivePriceRange,
  getFiltersForCategory,
} from '../../utils/filterSystem';
import type { FilterState, FilterableProduct, SpecFilterDefinition } from '../../utils/filterSystem';

// ---------------------------------------------------------------------------
// Types (re-export PickerProduct for the page to use)
// ---------------------------------------------------------------------------

export interface SelectionProduct {
  id: string;
  name: string;
  manufacturer: string;
  thumbnail?: string;
  keySpec: string;
  price: number;
  rating?: number;
  weight?: number;
  platforms?: Platform[];
  /** Full product input for compatibility checks. */
  productInput?: ProductInput;
  /** Flat spec values for filtering. */
  filterSpecs?: Record<string, string | number | boolean | string[]>;
}

export interface ProductSelectionViewProps {
  slot: CategorySlot;
  slotLabel: string;
  products: SelectionProduct[];
  onSelect: (slot: CategorySlot, part: SelectedPart) => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toFilterable(p: SelectionProduct): FilterableProduct {
  return {
    id: p.id,
    name: p.name,
    manufacturer: p.manufacturer,
    keySpec: p.keySpec,
    price: p.price,
    platforms: p.platforms,
    filterSpecs: p.filterSpecs,
  };
}

function toTableProduct(p: SelectionProduct): TableProduct {
  // Extract specs from productInput for column rendering
  const specs: Record<string, unknown> = {};
  if (p.productInput?.specs) {
    Object.assign(specs, p.productInput.specs);
  }
  if (p.filterSpecs) {
    Object.assign(specs, p.filterSpecs);
  }

  return {
    id: p.id,
    name: p.name,
    manufacturer: p.manufacturer,
    thumbnail: p.thumbnail,
    keySpec: p.keySpec,
    price: p.price,
    rating: p.rating,
    weight: p.weight,
    specs,
  };
}

// Debounce hook
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// Default sort = "Most Popular" (rating DESC)
const DEFAULT_SORT: SortState = { column: 'rating', direction: 'DESC' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductSelectionView({
  slot,
  slotLabel,
  products,
  onSelect,
  onBack,
}: ProductSelectionViewProps) {
  const selectedParts = useBuildStore((s) => s.selectedParts);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // Filter state
  // -------------------------------------------------------------------------
  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebouncedValue(rawSearch, 200);

  const [selectedManufacturers, setSelectedManufacturers] = useState<Set<string>>(new Set());
  const [priceRange, setPriceRange] = useState<[number, number]>(() => derivePriceRange(products.map(toFilterable)));
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(new Set());
  const [specFilters, setSpecFilters] = useState<Map<string, Set<string>>>(new Map());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sort state
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Derive filter options
  const manufacturers = useMemo(() => deriveManufacturers(products.map(toFilterable)), [products]);
  const fullPriceRange = useMemo(() => derivePriceRange(products.map(toFilterable)), [products]);
  const categoryFilters = useMemo(() => getFiltersForCategory(slot), [slot]);
  const columns = useMemo(() => getColumnsForCategory(slot), [slot]);

  // -------------------------------------------------------------------------
  // Compatibility pre-computation (with conflict details)
  // -------------------------------------------------------------------------
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

  const compatMap = useMemo(() => {
    const map = new Map<string, CompatInfo>();
    for (const product of products) {
      if (!product.productInput || buildProducts.length === 0) {
        map.set(product.id, { severity: 'OK', reasons: [], conflicts: [] });
        continue;
      }
      const result: CompatibilityResult = CompatibilityEngine.checkCandidate(
        product.productInput,
        buildProducts,
      );
      map.set(product.id, {
        severity: result.overallSeverity,
        reasons: result.conflicts.map((c) => c.message),
        conflicts: result.conflicts.map((c) => ({
          code: c.code,
          message: c.message,
          severity: c.severity,
        })),
      });
    }
    return map;
  }, [products, buildProducts]);

  // -------------------------------------------------------------------------
  // Filter pipeline
  // -------------------------------------------------------------------------
  const filterState: FilterState = useMemo(() => ({
    search: debouncedSearch,
    manufacturers: selectedManufacturers,
    priceRange,
    platforms: selectedPlatforms,
    specFilters,
  }), [debouncedSearch, selectedManufacturers, priceRange, selectedPlatforms, specFilters]);

  const filteredProducts = useMemo(
    () => applyFilters(products.map(toFilterable), filterState),
    [products, filterState],
  );

  // Map to full products, then sort
  const sortedProducts = useMemo(() => {
    const filteredIds = new Set(filteredProducts.map((p) => p.id));
    const filtered = products.filter((p) => filteredIds.has(p.id));

    // Pre-resolve the active column definition once (avoid repeated find() in sort comparator)
    const colDef = columns.find((c) => c.key === sort.column);

    // Sort by selected column
    const sorted = [...filtered].sort((a, b) => {
      // Primary sort: compatibility (OK first, then WARNING, then ERROR)
      const severityOrder = { OK: 0, WARNING: 1, ERROR: 2 };
      const aSev = compatMap.get(a.id)?.severity ?? 'OK';
      const bSev = compatMap.get(b.id)?.severity ?? 'OK';
      if (aSev !== bSev) return severityOrder[aSev] - severityOrder[bSev];

      // Secondary sort: by column
      if (!colDef) {
        // Default: rating DESC
        const aRating = a.rating ?? 0;
        const bRating = b.rating ?? 0;
        return sort.direction === 'ASC' ? aRating - bRating : bRating - aRating;
      }

      const aTable = toTableProduct(a);
      const bTable = toTableProduct(b);
      const aVal = colDef.getValue(aTable);
      const bVal = colDef.getValue(bTable);

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.direction === 'ASC' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const cmp = aStr.localeCompare(bStr);
      return sort.direction === 'ASC' ? cmp : -cmp;
    });

    return sorted;
  }, [products, filteredProducts, compatMap, sort, columns]);

  // -------------------------------------------------------------------------
  // Active filter count (includes non-default sort)
  // -------------------------------------------------------------------------
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedManufacturers.size > 0) count++;
    if (selectedPlatforms.size > 0) count++;
    if (priceRange[0] > fullPriceRange[0] || priceRange[1] < fullPriceRange[1]) count++;
    for (const [, vals] of specFilters) {
      if (vals.size > 0) count++;
    }
    return count;
  }, [selectedManufacturers, selectedPlatforms, priceRange, fullPriceRange, specFilters]);

  const isSortNonDefault = sort.column !== DEFAULT_SORT.column || sort.direction !== DEFAULT_SORT.direction;
  const hasActiveFiltersOrSort = activeFilterCount > 0 || isSortNonDefault;
  const totalActiveCount = activeFilterCount + (isSortNonDefault ? 1 : 0);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleSelect = useCallback(
    (tableProduct: TableProduct) => {
      const product = products.find((p) => p.id === tableProduct.id);
      if (!product) return;
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
    [products, slot, onSelect],
  );

  const toggleManufacturer = useCallback((mfr: string) => {
    setSelectedManufacturers((prev) => {
      const next = new Set(prev);
      if (next.has(mfr)) next.delete(mfr);
      else next.add(mfr);
      return next;
    });
  }, []);

  const togglePlatform = useCallback((plat: Platform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(plat)) next.delete(plat);
      else next.add(plat);
      return next;
    });
  }, []);

  const toggleSpecFilter = useCallback((specKey: string, value: string) => {
    setSpecFilters((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(specKey) ?? []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      next.set(specKey, current);
      return next;
    });
  }, []);

  const clearAllFiltersAndSort = useCallback(() => {
    setRawSearch('');
    setSelectedManufacturers(new Set());
    setPriceRange(fullPriceRange);
    setSelectedPlatforms(new Set());
    setSpecFilters(new Map());
    setSort(DEFAULT_SORT);
  }, [fullPriceRange]);

  // Auto-focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Handle Escape key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // Convert to table products
  const tableProducts = useMemo(
    () => sortedProducts.map(toTableProduct),
    [sortedProducts],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className={styles.view}>
      {/* Global site header — frosted glass, z-100 */}
      <div className={styles.globalHeader}>
        <Navbar />
      </div>

      {/* Sub-header with back, category, search, view switcher */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button type="button" className={styles.backBtn} onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Build
          </button>

          <div className={styles.headerCenter}>
            <span className={styles.selectingLabel}>Selecting:</span>
            <span className={styles.categoryLabel}>{slotLabel}</span>
          </div>

          {/* View mode switcher */}
          <ViewSwitcher active={viewMode} onChange={setViewMode} />

          <div className={styles.headerSearch}>
            <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder={`Search ${slotLabel.toLowerCase()}…`}
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
            />
            {rawSearch && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setRawSearch('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Mobile sidebar toggle */}
          <button
            type="button"
            className={styles.filterToggle}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle filters"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* Main content wrapper: 1600px centered */}
      <div className={styles.contentWrapper}>
        <div className={styles.content}>
          {/* Left sidebar */}
          <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
            <div className={styles.sidebarInner}>
              {/* Clear Filters & Sort — prominent top button */}
              <button
                type="button"
                className={`${styles.clearAllBtn} ${hasActiveFiltersOrSort ? styles.clearAllActive : ''}`}
                onClick={clearAllFiltersAndSort}
                disabled={!hasActiveFiltersOrSort}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Clear Filters & Sort
                {hasActiveFiltersOrSort && (
                  <span className={styles.clearBadge}>
                    {totalActiveCount}
                  </span>
                )}
              </button>

              {/* Filter header */}
              <div className={styles.filterHeader}>
                <span className={styles.filterTitle}>Filters</span>
                {activeFilterCount > 0 && (
                  <span className={styles.filterCount}>{activeFilterCount} active</span>
                )}
              </div>

              {/* Manufacturer checkboxes */}
              <div className={styles.filterSection}>
                <h5 className={styles.filterSectionTitle}>Manufacturer</h5>
                <div className={styles.checkboxGroup}>
                  {manufacturers.map((mfr) => (
                    <label key={mfr} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selectedManufacturers.has(mfr)}
                        onChange={() => toggleManufacturer(mfr)}
                      />
                      <span className={styles.checkboxText}>{mfr}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div className={styles.filterSection}>
                <h5 className={styles.filterSectionTitle}>Price Range</h5>
                <div className={styles.priceInputs}>
                  <div className={styles.priceField}>
                    <span className={styles.priceLabel}>Min</span>
                    <input
                      type="number"
                      className={styles.priceInput}
                      value={priceRange[0]}
                      min={fullPriceRange[0]}
                      max={priceRange[1]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    />
                  </div>
                  <span className={styles.priceDash}>—</span>
                  <div className={styles.priceField}>
                    <span className={styles.priceLabel}>Max</span>
                    <input
                      type="number"
                      className={styles.priceInput}
                      value={priceRange[1]}
                      min={priceRange[0]}
                      max={fullPriceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    />
                  </div>
                </div>
                <input
                  type="range"
                  className={styles.rangeSlider}
                  min={fullPriceRange[0]}
                  max={fullPriceRange[1]}
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                />
              </div>

              {/* Platform toggles */}
              <div className={styles.filterSection}>
                <h5 className={styles.filterSectionTitle}>Platform</h5>
                <div className={styles.platformToggles}>
                  {(['PC', 'PLAYSTATION', 'XBOX'] as Platform[]).map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      className={`${styles.platformBtn} ${selectedPlatforms.has(plat) ? styles.platformActive : ''}`}
                      onClick={() => togglePlatform(plat)}
                    >
                      {plat === 'PC' ? '🖥 PC' : plat === 'PLAYSTATION' ? '🎮 PS' : '🎮 Xbox'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category-specific spec filters */}
              {categoryFilters.map((filter: SpecFilterDefinition) => (
                <div key={filter.key} className={styles.filterSection}>
                  <h5 className={styles.filterSectionTitle}>{filter.label}</h5>
                  <div className={styles.checkboxGroup}>
                    {filter.options?.map((opt) => (
                      <label key={opt} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={specFilters.get(filter.key)?.has(opt) ?? false}
                          onChange={() => toggleSpecFilter(filter.key, opt)}
                        />
                        <span className={styles.checkboxText}>
                          {opt.replace(/_/g, ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Product area — multi-mode */}
          <main className={styles.mainArea}>
            {/* Results bar */}
            <div className={styles.resultsBar}>
              <span className={styles.resultsCount}>
                {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
              </span>
              {activeFilterCount > 0 && (
                <span className={styles.filtersActive}>
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </span>
              )}
              {isSortNonDefault && (
                <span className={styles.sortActive}>
                  Sorted by {columns.find((c) => c.key === sort.column)?.label ?? sort.column} {sort.direction}
                </span>
              )}
            </div>

            {/* View: List */}
            {viewMode === 'list' && (
              <DynamicSortableTable
                products={tableProducts}
                columns={columns}
                compatMap={compatMap}
                sort={sort}
                onSortChange={setSort}
                onSelect={handleSelect}
              />
            )}

            {/* View: Compact Cards (4-column grid) */}
            {viewMode === 'compact' && (
              <div className={styles.gridCompact}>
                {tableProducts.map((product) => (
                  <ProductCardCompact
                    key={product.id}
                    product={product}
                    compat={compatMap.get(product.id) ?? { severity: 'OK', reasons: [], conflicts: [] }}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* View: Standard Cards (2-column grid) */}
            {viewMode === 'standard' && (
              <div className={styles.gridStandard}>
                {tableProducts.map((product) => (
                  <ProductCardStandard
                    key={product.id}
                    product={product}
                    compat={compatMap.get(product.id) ?? { severity: 'OK', reasons: [], conflicts: [] }}
                    columns={columns}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* Empty state fallback */}
            {sortedProducts.length === 0 && (
              <div className={styles.emptyState}>
                <p>No products match your filters.</p>
                <button type="button" className={styles.clearFiltersBtn} onClick={clearAllFiltersAndSort}>
                  Clear All Filters & Sort
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default ProductSelectionView;
