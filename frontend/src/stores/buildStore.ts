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

  /** Persisted build ID (set after save or when loading a shared build). */
  savedBuildId: string | null;
  /** Owner user ID of the loaded build (null for unsaved / own builds). */
  savedBuildOwnerId: string | null;
  /** Transient flag: true after loadBuild — prevents persist rehydration from overwriting. */
  _hydratedFromShare: boolean;

  // Actions
  addPart: (slot: CategorySlot, part: SelectedPart) => void;
  removePart: (slot: CategorySlot) => void;
  clearBuild: () => void;
  calculateTotals: () => void;
  /** Replace the entire build state from an external source (API / shared link). */
  loadBuild: (parts: Partial<Record<CategorySlot, SelectedPart>>, buildId: string, ownerId?: string | null) => void;
  /** Mark the build as saved with the given permalink ID. */
  setSavedBuildId: (id: string) => void;
  /** Reset saved-build metadata without clearing parts. */
  resetSavedMeta: () => void;
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
      savedBuildId: null,
      savedBuildOwnerId: null,
      _hydratedFromShare: false,

      addPart: (slot: CategorySlot, part: SelectedPart) => {
        const next = { ...get().selectedParts, [slot]: part };
        const { totalPrice, totalWeight } = computeTotals(next);
        const compatibilityReport = computeCompatibility(next);

        // Clear stale permalink unless the build belongs to a logged-in account
        const clearLink = !get().savedBuildOwnerId ? { savedBuildId: null } : {};

        set({
          selectedParts: next,
          totalPrice,
          totalWeight,
          compatibilityReport,
          ...clearLink,
        });
      },

      removePart: (slot: CategorySlot) => {
        const next = { ...get().selectedParts };
        delete next[slot];
        const { totalPrice, totalWeight } = computeTotals(next);
        const compatibilityReport = computeCompatibility(next);

        // Clear stale permalink unless the build belongs to a logged-in account
        const clearLink = !get().savedBuildOwnerId ? { savedBuildId: null } : {};

        set({
          selectedParts: next,
          totalPrice,
          totalWeight,
          compatibilityReport,
          ...clearLink,
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
          savedBuildId: null,
          savedBuildOwnerId: null,
          _hydratedFromShare: false,
        });
      },

      calculateTotals: () => {
        const { totalPrice, totalWeight } = computeTotals(get().selectedParts);
        const compatibilityReport = computeCompatibility(get().selectedParts);
        set({ totalPrice, totalWeight, compatibilityReport });
      },

      loadBuild: (parts, buildId, ownerId = null) => {
        const { totalPrice, totalWeight } = computeTotals(parts);
        const compatibilityReport = computeCompatibility(parts);
        set({
          selectedParts: parts,
          totalPrice,
          totalWeight,
          compatibilityReport,
          savedBuildId: buildId,
          savedBuildOwnerId: ownerId ?? null,
          _hydratedFromShare: true,
        });
      },

      setSavedBuildId: (id: string) => {
        set({ savedBuildId: id });
      },

      resetSavedMeta: () => {
        set({ savedBuildId: null, savedBuildOwnerId: null });
      },
    }),
    {
      name: 'rigbuilder-build',
      // Only persist selectedParts and savedBuildId; totals and compatibility are derived
      partialize: (state) => ({
        selectedParts: state.selectedParts,
        savedBuildId: state.savedBuildId,
      }),
      // Merge strategy: if a shared build was loaded via API, keep it and don't
      // let stale localStorage data overwrite it.
      merge: (persisted, current) => {
        if (current._hydratedFromShare) {
          return current;
        }
        const p = (persisted ?? {}) as Partial<BuildState>;
        return {
          ...current,
          selectedParts: p.selectedParts ?? current.selectedParts,
          savedBuildId: p.savedBuildId ?? current.savedBuildId,
        };
      },
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
