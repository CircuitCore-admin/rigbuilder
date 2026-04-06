// ============================================================================
// FilterSystem — Multi-spec filtering utility for the Product Selection View.
// Handles manufacturer checkboxes, price range, platform toggles, and
// category-specific spec filters (e.g., brake type, drive type).
// ============================================================================

import type { Platform } from '../types/productSpecs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterState {
  /** Text search query (name / manufacturer / spec). */
  search: string;
  /** Selected manufacturer names (empty = show all). */
  manufacturers: Set<string>;
  /** Price range [min, max] in GBP. */
  priceRange: [number, number];
  /** Selected platform toggles (empty = show all). */
  platforms: Set<Platform>;
  /** Category-specific spec filters: key → set of selected values. */
  specFilters: Map<string, Set<string>>;
}

/** A single filterable product (generic shape). */
export interface FilterableProduct {
  id: string;
  name: string;
  manufacturer: string;
  keySpec: string;
  price: number;
  platforms?: Platform[];
  /** Arbitrary spec values for category-specific filtering. */
  filterSpecs?: Record<string, string | number | boolean | string[]>;
}

/** Description of a filter option available for a category. */
export interface SpecFilterDefinition {
  key: string;
  label: string;
  type: 'checkbox' | 'range';
  /** Available options for checkbox-type filters. */
  options?: string[];
}

// ---------------------------------------------------------------------------
// Default state factory
// ---------------------------------------------------------------------------

export function createDefaultFilterState(
  products: FilterableProduct[],
): FilterState {
  const prices = products.map((p) => p.price);
  const minPrice = prices.length > 0 ? Math.floor(Math.min(...prices)) : 0;
  const maxPrice = prices.length > 0 ? Math.ceil(Math.max(...prices)) : 10000;

  return {
    search: '',
    manufacturers: new Set(),
    priceRange: [minPrice, maxPrice],
    platforms: new Set(),
    specFilters: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Derive filter options from product data
// ---------------------------------------------------------------------------

export function deriveManufacturers(products: FilterableProduct[]): string[] {
  const set = new Set(products.map((p) => p.manufacturer));
  return [...set].sort();
}

export function derivePriceRange(
  products: FilterableProduct[],
): [number, number] {
  if (products.length === 0) return [0, 10000];
  const prices = products.map((p) => p.price);
  return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
}

// ---------------------------------------------------------------------------
// Category-specific filter definitions
// ---------------------------------------------------------------------------

const CATEGORY_FILTERS: Record<string, SpecFilterDefinition[]> = {
  COCKPIT: [
    { key: 'material', label: 'Material', type: 'checkbox', options: ['aluminium', 'steel', 'carbon fiber'] },
    { key: 'isFolding', label: 'Folding', type: 'checkbox', options: ['true', 'false'] },
  ],
  WHEELBASE: [
    { key: 'driveType', label: 'Drive Type', type: 'checkbox', options: ['direct_drive', 'belt_drive', 'gear_drive'] },
    { key: 'qrType', label: 'Quick Release', type: 'checkbox', options: ['fanatec_qr1', 'fanatec_qr2', 'simucube_2', 'moza', 'thrustmaster'] },
  ],
  WHEEL_RIM: [
    { key: 'material', label: 'Material', type: 'checkbox', options: ['forged carbon', 'carbon fiber', 'leather', 'aluminium CNC', 'alcantara'] },
    { key: 'hasDisplay', label: 'Built-in Display', type: 'checkbox', options: ['true', 'false'] },
  ],
  PEDALS: [
    { key: 'brakeType', label: 'Brake Technology', type: 'checkbox', options: ['potentiometer', 'load_cell', 'hydraulic'] },
    { key: 'pedalCount', label: 'Pedal Count', type: 'checkbox', options: ['2', '3'] },
  ],
  SHIFTER: [
    { key: 'type', label: 'Type', type: 'checkbox', options: ['H-Pattern', 'Sequential', 'H-Pattern + Sequential'] },
  ],
  DISPLAY: [
    { key: 'type', label: 'Display Type', type: 'checkbox', options: ['monitor', 'vr_headset'] },
    { key: 'hdrSupport', label: 'HDR Support', type: 'checkbox', options: ['true', 'false'] },
  ],
  SEAT: [
    { key: 'type', label: 'Seat Type', type: 'checkbox', options: ['bucket', 'gt_style', 'oem'] },
  ],
  EXTRAS: [],
};

export function getFiltersForCategory(category: string): SpecFilterDefinition[] {
  return CATEGORY_FILTERS[category] ?? [];
}

// ---------------------------------------------------------------------------
// Core filter pipeline
// ---------------------------------------------------------------------------

export function applyFilters(
  products: FilterableProduct[],
  filters: FilterState,
): FilterableProduct[] {
  let result = products;

  // 1. Text search
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.manufacturer.toLowerCase().includes(q) ||
        p.keySpec.toLowerCase().includes(q),
    );
  }

  // 2. Manufacturer filter
  if (filters.manufacturers.size > 0) {
    result = result.filter((p) => filters.manufacturers.has(p.manufacturer));
  }

  // 3. Price range
  result = result.filter(
    (p) => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1],
  );

  // 4. Platform toggles
  if (filters.platforms.size > 0) {
    result = result.filter((p) => {
      if (!p.platforms || p.platforms.length === 0) return true;
      return p.platforms.some((plat) => filters.platforms.has(plat));
    });
  }

  // 5. Category-specific spec filters
  for (const [specKey, selectedValues] of filters.specFilters) {
    if (selectedValues.size === 0) continue;
    result = result.filter((p) => {
      const val = p.filterSpecs?.[specKey];
      if (val === undefined || val === null) return true;
      const strVal = String(val);
      return selectedValues.has(strVal);
    });
  }

  return result;
}
