import { useCallback, useMemo, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './RigBuilderPage.module.scss';
import { Configurator } from '../../components/Configurator/Configurator';
import { CompatibilityPanel } from '../../components/CompatibilityPanel/CompatibilityPanel';
import { ShareBar } from '../../components/ShareBar/ShareBar';
import { ProductSelectionView } from '../../components/ProductSelectionView/ProductSelectionView';
import type { SelectionProduct } from '../../components/ProductSelectionView/ProductSelectionView';
import { useBuildStore } from '../../stores/buildStore';
import type { CategorySlot, SelectedPart } from '../../stores/buildStore';
import type { ProductCategory, Platform } from '../../types/productSpecs';
import { api } from '../../utils/api';

// ---------------------------------------------------------------------------
// API product → SelectionProduct mapper
// ---------------------------------------------------------------------------

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  manufacturer: string;
  category: ProductCategory;
  specs: Record<string, unknown>;
  weight?: number | null;
  platforms: Platform[];
  affiliateLinks?: Array<{ retailer: string; url: string; price: number }> | null;
  images: string[];
  avgRating?: number | null;
  reviewCount?: number;
}

interface ProductListResponse {
  items: ApiProduct[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** Derive a human-readable key spec string from category-specific specs. */
function deriveKeySpec(category: string, specs: Record<string, unknown>): string {
  switch (category) {
    case 'WHEELBASE': {
      const torque = specs.peakTorque ?? '';
      const drive = String(specs.driveType ?? '').replace(/_/g, ' ');
      return `${torque}Nm ${drive.charAt(0).toUpperCase() + drive.slice(1)}`.trim();
    }
    case 'WHEEL_RIM': {
      const dia = specs.diameter ?? '';
      const mat = specs.material ?? '';
      return `${dia}mm / ${mat}`.trim();
    }
    case 'PEDALS': {
      const brake = String(specs.brakeType ?? '').replace(/_/g, ' ');
      const force = specs.maxBrakeForce ? ` / ${specs.maxBrakeForce}kg` : '';
      return `${brake.charAt(0).toUpperCase() + brake.slice(1)}${force}`.trim();
    }
    case 'COCKPIT': {
      const mat = String(specs.material ?? '');
      return mat.charAt(0).toUpperCase() + mat.slice(1);
    }
    case 'DISPLAY': {
      const size = specs.screenSize ? `${specs.screenSize}"` : '';
      const res = specs.resolution ?? '';
      const hz = specs.refreshRate ? `${specs.refreshRate}Hz` : '';
      return [size, res, hz].filter(Boolean).join(' ');
    }
    case 'SEAT':
      return String(specs.type ?? 'Seat').replace(/_/g, ' ');
    case 'SHIFTER':
      return String(specs.type ?? 'Shifter').replace(/_/g, ' ');
    default:
      return String(specs.subCategory ?? 'Accessory');
  }
}

/** Extract the best price from affiliate links. */
function extractPrice(links?: Array<{ price: number }> | null): number {
  if (!links || links.length === 0) return 0;
  return Math.min(...links.map((l) => l.price));
}

/** Convert an API product to the SelectionProduct interface. */
function toSelectionProduct(p: ApiProduct): SelectionProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    manufacturer: p.manufacturer,
    thumbnail: p.images[0],
    keySpec: deriveKeySpec(p.category, p.specs),
    price: extractPrice(p.affiliateLinks),
    rating: p.avgRating ?? undefined,
    reviewCount: p.reviewCount,
    weight: p.weight ?? undefined,
    platforms: p.platforms as Platform[],
    productInput: {
      id: p.id,
      category: p.category as ProductCategory,
      specs: p.specs as SelectionProduct['productInput'] extends { specs: infer S } ? S : never,
      platforms: p.platforms as Platform[],
    },
    filterSpecs: p.specs as Record<string, string | number | boolean | string[]>,
  };
}

// ---------------------------------------------------------------------------
// Slot metadata
// ---------------------------------------------------------------------------

interface SlotMeta {
  slot: CategorySlot;
  label: string;
}

const SLOT_META: SlotMeta[] = [
  { slot: 'COCKPIT', label: 'Cockpit / Frame' },
  { slot: 'WHEELBASE', label: 'Wheelbase' },
  { slot: 'WHEEL_RIM', label: 'Wheel Rim' },
  { slot: 'PEDALS', label: 'Pedals' },
  { slot: 'SHIFTER', label: 'Shifter' },
  { slot: 'DISPLAY', label: 'Display' },
  { slot: 'SEAT', label: 'Seat' },
  { slot: 'EXTRAS', label: 'Extras' },
];

// ---------------------------------------------------------------------------
// Valid slots for URL param validation
// ---------------------------------------------------------------------------

const VALID_SLOTS = new Set<string>([
  'COCKPIT', 'WHEELBASE', 'WHEEL_RIM', 'PEDALS',
  'SHIFTER', 'DISPLAY', 'SEAT', 'EXTRAS',
]);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RigBuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedParts = useBuildStore((s) => s.selectedParts);
  const totalPrice = useBuildStore((s) => s.totalPrice);
  const totalWeight = useBuildStore((s) => s.totalWeight);
  const addPart = useBuildStore((s) => s.addPart);
  const handleRemovePart = useBuildStore((s) => s.removePart);

  const filledCount = Object.keys(selectedParts).length;

  // Derive current selection slot from URL query param
  const selectParam = searchParams.get('select')?.toUpperCase() ?? null;
  const pickerSlot: CategorySlot | null =
    selectParam && VALID_SLOTS.has(selectParam)
      ? (selectParam as CategorySlot)
      : null;

  // ── Fetch products for the active picker slot from the API ──────────────
  const [catalogProducts, setCatalogProducts] = useState<SelectionProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    if (!pickerSlot) return;

    let cancelled = false;
    setCatalogLoading(true);

    api<ProductListResponse>(`/products?category=${pickerSlot}&limit=50`)
      .then((data) => {
        if (!cancelled) {
          setCatalogProducts(data.items.map(toSelectionProduct));
        }
      })
      .catch((err) => {
        console.error('Failed to load products for', pickerSlot, err);
        if (!cancelled) setCatalogProducts([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => { cancelled = true; };
  }, [pickerSlot]);

  const handleSelectCategory = useCallback(
    (slot: CategorySlot) => {
      setSearchParams({ select: slot.toLowerCase() });
    },
    [setSearchParams],
  );

  const handlePickerSelect = useCallback(
    (slot: CategorySlot, part: SelectedPart) => {
      addPart(slot, part);
      setSearchParams({});
    },
    [addPart, setSearchParams],
  );

  const handlePickerClose = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // Sync browser back button: clear invalid select params
  useEffect(() => {
    if (selectParam && !VALID_SLOTS.has(selectParam)) {
      setSearchParams({});
    }
  }, [selectParam, setSearchParams]);

  const pickerLabel = useMemo(() => {
    if (!pickerSlot) return '';
    return SLOT_META.find((m) => m.slot === pickerSlot)?.label ?? pickerSlot;
  }, [pickerSlot]);

  // If a selection view is active, render the full-screen view
  if (pickerSlot) {
    return (
      <ProductSelectionView
        slot={pickerSlot}
        slotLabel={pickerLabel}
        products={catalogProducts}
        onSelect={handlePickerSelect}
        onBack={handlePickerClose}
      />
    );
  }

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>System Builder</h1>
          <p className={styles.subtitle}>
            Select your components below. Compatibility is checked automatically.
          </p>
        </div>
      </div>

      {/* Share / Save / Export bar */}
      <ShareBar />

      {/* Main layout */}
      <div className={styles.layout}>
        <main className={styles.main}>
          <Configurator
            onSelectCategory={handleSelectCategory}
            onRemovePart={handleRemovePart}
          />
        </main>

        <aside className={styles.sidebar}>
          {/* Summary card */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryTitle}>Build Summary</span>
            </div>
            <div className={styles.summaryBody}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Components</span>
                <span className={styles.summaryValue}>{filledCount} / 8</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Est. Weight</span>
                <span className={styles.summaryValue}>
                  {totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : '—'}
                </span>
              </div>

              <div className={styles.priceBreakdown}>
                {(Object.entries(selectedParts) as [CategorySlot, SelectedPart][]).map(([slot, part]) => (
                  <div key={slot} className={styles.priceRow}>
                    <span className={styles.priceRowLabel}>{slot.replace('_', ' ')}</span>
                    <span className={styles.priceRowValue}>
                      £{part.price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <div className={styles.totalBlock}>
                <span className={styles.totalLabel}>Total</span>
                <span className={styles.totalValue}>
                  £{totalPrice.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className={styles.summaryActions}>
                <button type="button" className={styles.btnOutline} onClick={() => {
                  /* Scroll to top where ShareBar lives */
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}>Share / Export</button>
              </div>
            </div>
          </div>

          <CompatibilityPanel />
        </aside>
      </div>
    </div>
  );
}

export default RigBuilderPage;
