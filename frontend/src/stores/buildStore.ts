// ============================================================================
// RigBuilder — useBuildStore (Zustand)
// Centralized state management for the current rig build.
// Persisted to localStorage so users don't lose progress on refresh.
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CompatibilityResult, CompatibilityConflict } from '../types/compatibility';
import type { ProductInput, ProductCategory } from '../types/productSpecs';
import { CompatibilityEngine } from '../utils/compatibilityEngine';

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

export interface SelectedPart {
  id: string;
  name: string;
  thumbnail?: string;
  keySpec: string;
  rating?: number;
  price: number;
  weight?: number;
  /** Full product input for compatibility checks (optional, enriched data). */
  productInput?: ProductInput;
}

export interface CompatibilityReport {
  overallSeverity: 'OK' | 'WARNING' | 'ERROR';
  isCompatible: boolean;
  conflicts: CompatibilityConflict[];
}

export interface BuildState {
  selectedParts: Partial<Record<CategorySlot, SelectedPart>>;
  totalPrice: number;
  totalWeight: number;
  compatibilityReport: CompatibilityReport;

  // Actions
  addPart: (slot: CategorySlot, part: SelectedPart) => void;
  removePart: (slot: CategorySlot) => void;
  clearBuild: () => void;
  calculateTotals: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeTotals(parts: Partial<Record<CategorySlot, SelectedPart>>) {
  let totalPrice = 0;
  let totalWeight = 0;

  for (const part of Object.values(parts)) {
    if (part) {
      totalPrice += part.price;
      totalWeight += part.weight ?? 0;
    }
  }

  return { totalPrice, totalWeight };
}

function computeCompatibility(
  parts: Partial<Record<CategorySlot, SelectedPart>>,
): CompatibilityReport {
  const products: ProductInput[] = [];

  for (const [slot, part] of Object.entries(parts) as [CategorySlot, SelectedPart][]) {
    if (part?.productInput) {
      products.push(part.productInput);
    } else if (part) {
      // Minimal fallback — no spec data, so limited checking
      products.push({
        id: part.id,
        category: slot as ProductCategory,
        specs: {} as ProductInput['specs'],
        platforms: [],
      });
    }
  }

  if (products.length < 2) {
    return { overallSeverity: 'OK', isCompatible: true, conflicts: [] };
  }

  const result: CompatibilityResult = CompatibilityEngine.checkBuild(products);

  return {
    overallSeverity: result.overallSeverity,
    isCompatible: result.isCompatible,
    conflicts: result.conflicts,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBuildStore = create<BuildState>()(
  persist(
    (set, get) => ({
      selectedParts: {},
      totalPrice: 0,
      totalWeight: 0,
      compatibilityReport: {
        overallSeverity: 'OK',
        isCompatible: true,
        conflicts: [],
      },

      addPart: (slot: CategorySlot, part: SelectedPart) => {
        const next = { ...get().selectedParts, [slot]: part };
        const { totalPrice, totalWeight } = computeTotals(next);
        const compatibilityReport = computeCompatibility(next);

        set({
          selectedParts: next,
          totalPrice,
          totalWeight,
          compatibilityReport,
        });
      },

      removePart: (slot: CategorySlot) => {
        const next = { ...get().selectedParts };
        delete next[slot];
        const { totalPrice, totalWeight } = computeTotals(next);
        const compatibilityReport = computeCompatibility(next);

        set({
          selectedParts: next,
          totalPrice,
          totalWeight,
          compatibilityReport,
        });
      },

      clearBuild: () => {
        set({
          selectedParts: {},
          totalPrice: 0,
          totalWeight: 0,
          compatibilityReport: {
            overallSeverity: 'OK',
            isCompatible: true,
            conflicts: [],
          },
        });
      },

      calculateTotals: () => {
        const { totalPrice, totalWeight } = computeTotals(get().selectedParts);
        const compatibilityReport = computeCompatibility(get().selectedParts);
        set({ totalPrice, totalWeight, compatibilityReport });
      },
    }),
    {
      name: 'rigbuilder-build',
      // Only persist selectedParts; totals and compatibility are derived
      partialize: (state) => ({
        selectedParts: state.selectedParts,
      }),
      // Rehydrate derived fields after loading from localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          const { totalPrice, totalWeight } = computeTotals(state.selectedParts);
          const compatibilityReport = computeCompatibility(state.selectedParts);
          state.totalPrice = totalPrice;
          state.totalWeight = totalWeight;
          state.compatibilityReport = compatibilityReport;
        }
      },
    },
  ),
);

export default useBuildStore;
