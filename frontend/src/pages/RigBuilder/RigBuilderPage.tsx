import { useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './RigBuilderPage.module.scss';
import { Configurator } from '../../components/Configurator/Configurator';
import { CompatibilityPanel } from '../../components/CompatibilityPanel/CompatibilityPanel';
import { ProductSelectionView } from '../../components/ProductSelectionView/ProductSelectionView';
import type { SelectionProduct } from '../../components/ProductSelectionView/ProductSelectionView';
import { useBuildStore } from '../../stores/buildStore';
import type { CategorySlot, SelectedPart } from '../../stores/buildStore';
import type { ProductCategory } from '../../types/productSpecs';

// ---------------------------------------------------------------------------
// Demo catalog (replace with API calls)
// ---------------------------------------------------------------------------

const DEMO_CATALOG: Record<string, SelectionProduct[]> = {
  COCKPIT: [
    { id: 'c1', name: 'Trak Racer TR160S MK5', manufacturer: 'Trak Racer', keySpec: 'Aluminium Profile', price: 899, rating: 4.6, weight: 28, filterSpecs: { material: 'aluminium', isFolding: 'false' }, productInput: { id: 'c1', category: 'COCKPIT' as ProductCategory, specs: { material: 'aluminium', profileSize: '40x80', maxWheelbaseWeight: 25, wheelbaseMounting: ['4_bolt_66mm' as const, 'front_clamp' as const, 'universal_slotted' as const], pedalMounting: ['hard_mount' as const, 'bolt_through' as const, 'universal_slotted' as const], pedalTrayDepth: 350, frameWidth: 520, seatCompatibility: ['side_mount'], isFolding: false, seatIncluded: false, weightCapacity: 150 }, platforms: [] } },
    { id: 'c2', name: 'Next Level Racing F-GT Elite', manufacturer: 'Next Level Racing', keySpec: 'Aluminium Profile', price: 749, rating: 4.3, weight: 32, filterSpecs: { material: 'aluminium', isFolding: 'false' }, productInput: { id: 'c2', category: 'COCKPIT' as ProductCategory, specs: { material: 'aluminium', profileSize: '40x40', maxWheelbaseWeight: 20, wheelbaseMounting: ['front_clamp' as const, 'universal_slotted' as const], pedalMounting: ['bolt_through' as const, 'universal_slotted' as const], pedalTrayDepth: 300, frameWidth: 480, seatCompatibility: ['side_mount'], isFolding: false, seatIncluded: false, weightCapacity: 130 }, platforms: [] } },
    { id: 'c3', name: 'SimLab GT1 Evo', manufacturer: 'SimLab', keySpec: 'Aluminium Profile', price: 549, rating: 4.7, weight: 22, filterSpecs: { material: 'aluminium', isFolding: 'false' }, productInput: { id: 'c3', category: 'COCKPIT' as ProductCategory, specs: { material: 'aluminium', profileSize: '40x80', maxWheelbaseWeight: 30, wheelbaseMounting: ['4_bolt_66mm' as const, '4_bolt_100mm' as const, 'front_clamp' as const, 'universal_slotted' as const], pedalMounting: ['hard_mount' as const, 'bolt_through' as const, 'universal_slotted' as const], pedalTrayDepth: 380, frameWidth: 540, seatCompatibility: ['side_mount', 'bottom_mount'], isFolding: false, seatIncluded: false, weightCapacity: 160 }, platforms: [] } },
  ],
  WHEELBASE: [
    { id: 'w1', name: 'Fanatec CSL DD (8 Nm)', manufacturer: 'Fanatec', keySpec: '8Nm Direct Drive', price: 349.95, rating: 4.4, weight: 2.7, platforms: ['PC', 'PLAYSTATION', 'XBOX'], filterSpecs: { driveType: 'direct_drive', qrType: 'fanatec_qr1' }, productInput: { id: 'w1', category: 'WHEELBASE' as ProductCategory, specs: { driveType: 'direct_drive' as const, peakTorque: 8, rotationRange: 1080, qrType: 'fanatec_qr1' as const, connectivity: ['usb' as const], psuIncluded: true, mountingPattern: 'front_clamp' as const }, platforms: ['PC' as const, 'PLAYSTATION' as const, 'XBOX' as const] } },
    { id: 'w2', name: 'SimuCube 2 Sport', manufacturer: 'SimuCube', keySpec: '17Nm Direct Drive', price: 1299, rating: 4.9, weight: 3.8, platforms: ['PC'], filterSpecs: { driveType: 'direct_drive', qrType: 'simucube_2' }, productInput: { id: 'w2', category: 'WHEELBASE' as ProductCategory, specs: { driveType: 'direct_drive' as const, peakTorque: 17, rotationRange: 1080, qrType: 'simucube_2' as const, connectivity: ['usb' as const], psuIncluded: true, mountingPattern: '4_bolt_100mm' as const }, platforms: ['PC' as const] } },
    { id: 'w3', name: 'Moza R12', manufacturer: 'Moza', keySpec: '12Nm Direct Drive', price: 599, rating: 4.5, weight: 3.2, platforms: ['PC', 'PLAYSTATION', 'XBOX'], filterSpecs: { driveType: 'direct_drive', qrType: 'moza' }, productInput: { id: 'w3', category: 'WHEELBASE' as ProductCategory, specs: { driveType: 'direct_drive' as const, peakTorque: 12, rotationRange: 1080, qrType: 'moza' as const, connectivity: ['usb' as const], psuIncluded: true, mountingPattern: 'front_clamp' as const }, platforms: ['PC' as const, 'PLAYSTATION' as const, 'XBOX' as const] } },
    { id: 'w4', name: 'Thrustmaster T818', manufacturer: 'Thrustmaster', keySpec: '11Nm Direct Drive', price: 549.99, rating: 4.2, weight: 4.1, platforms: ['PC', 'PLAYSTATION'], filterSpecs: { driveType: 'direct_drive', qrType: 'thrustmaster' }, productInput: { id: 'w4', category: 'WHEELBASE' as ProductCategory, specs: { driveType: 'direct_drive' as const, peakTorque: 11, rotationRange: 1080, qrType: 'thrustmaster' as const, connectivity: ['usb' as const], psuIncluded: true, mountingPattern: 'front_clamp' as const }, platforms: ['PC' as const, 'PLAYSTATION' as const] } },
  ],
  WHEEL_RIM: [
    { id: 'r1', name: 'Fanatec McLaren GT3 V2', manufacturer: 'Fanatec', keySpec: '300mm / Forged Carbon', price: 229.95, rating: 4.5, weight: 0.95, platforms: ['PC', 'PLAYSTATION', 'XBOX'], filterSpecs: { material: 'forged carbon', hasDisplay: 'false' }, productInput: { id: 'r1', category: 'WHEEL_RIM' as ProductCategory, specs: { diameter: 300, buttonCount: 12, paddleType: 'magnetic' as const, hasDisplay: false, qrCompatibility: ['fanatec_qr1' as const, 'fanatec_qr2' as const], weight: 0.95, material: 'forged carbon' }, platforms: ['PC' as const, 'PLAYSTATION' as const, 'XBOX' as const] } },
    { id: 'r2', name: 'Cube Controls Formula CSX 2', manufacturer: 'Cube Controls', keySpec: '280mm / Carbon Fiber', price: 1450, rating: 4.9, weight: 1.1, platforms: ['PC'], filterSpecs: { material: 'carbon fiber', hasDisplay: 'true' }, productInput: { id: 'r2', category: 'WHEEL_RIM' as ProductCategory, specs: { diameter: 280, buttonCount: 24, paddleType: 'magnetic' as const, hasDisplay: true, displayResolution: '800x480', qrCompatibility: ['simucube_2' as const, 'universal_70mm' as const], weight: 1.1, material: 'carbon fiber' }, platforms: ['PC' as const] } },
    { id: 'r3', name: 'Moza RS V2', manufacturer: 'Moza', keySpec: '300mm / Leather', price: 239, rating: 4.3, weight: 0.85, platforms: ['PC', 'PLAYSTATION', 'XBOX'], filterSpecs: { material: 'leather', hasDisplay: 'false' }, productInput: { id: 'r3', category: 'WHEEL_RIM' as ProductCategory, specs: { diameter: 300, buttonCount: 10, paddleType: 'magnetic' as const, hasDisplay: false, qrCompatibility: ['moza' as const], weight: 0.85, material: 'leather' }, platforms: ['PC' as const, 'PLAYSTATION' as const, 'XBOX' as const] } },
    { id: 'r4', name: 'Ascher Racing B24L-SC', manufacturer: 'Ascher Racing', keySpec: '270mm / Aluminium CNC', price: 890, rating: 4.8, weight: 1.3, platforms: ['PC'], filterSpecs: { material: 'aluminium CNC', hasDisplay: 'false' }, productInput: { id: 'r4', category: 'WHEEL_RIM' as ProductCategory, specs: { diameter: 270, buttonCount: 24, paddleType: 'magnetic' as const, hasDisplay: false, qrCompatibility: ['simucube_2' as const, 'universal_70mm' as const], weight: 1.3, material: 'aluminium CNC' }, platforms: ['PC' as const] } },
  ],
  PEDALS: [
    { id: 'p1', name: 'Heusinkveld Sprint Pedals', manufacturer: 'Heusinkveld', keySpec: 'Load Cell / 90kg', price: 599, rating: 4.8, weight: 4.5, platforms: ['PC'], filterSpecs: { brakeType: 'load_cell', pedalCount: '3' }, productInput: { id: 'p1', category: 'PEDALS' as ProductCategory, specs: { pedalCount: 3 as const, brakeType: 'load_cell' as const, maxBrakeForce: 90, throttleType: 'hall sensor', clutchType: 'hall sensor', mountingPattern: 'hard_mount' as const, connectivity: ['usb' as const], pedalPlateDepth: 280 }, platforms: ['PC' as const] } },
    { id: 'p2', name: 'Fanatec CSL Pedals LC', manufacturer: 'Fanatec', keySpec: 'Load Cell / 90kg', price: 199.95, rating: 4.2, weight: 3.1, platforms: ['PC', 'PLAYSTATION', 'XBOX'], filterSpecs: { brakeType: 'load_cell', pedalCount: '3' }, productInput: { id: 'p2', category: 'PEDALS' as ProductCategory, specs: { pedalCount: 3 as const, brakeType: 'load_cell' as const, maxBrakeForce: 90, throttleType: 'potentiometer', clutchType: 'potentiometer', mountingPattern: 'bolt_through' as const, connectivity: ['usb' as const, 'rj12' as const], pedalPlateDepth: 260 }, platforms: ['PC' as const, 'PLAYSTATION' as const, 'XBOX' as const] } },
    { id: 'p3', name: 'Simtag Hydraulic Pedals', manufacturer: 'Simtag', keySpec: 'Hydraulic / 136kg', price: 1899, rating: 4.9, weight: 8.2, platforms: ['PC'], filterSpecs: { brakeType: 'hydraulic', pedalCount: '3' }, productInput: { id: 'p3', category: 'PEDALS' as ProductCategory, specs: { pedalCount: 3 as const, brakeType: 'hydraulic' as const, maxBrakeForce: 136, throttleType: 'hall sensor', clutchType: 'hydraulic', mountingPattern: 'hard_mount' as const, connectivity: ['usb' as const], pedalPlateDepth: 340 }, platforms: ['PC' as const] } },
  ],
  SHIFTER: [
    { id: 's1', name: 'Fanatec ClubSport Shifter SQ V1.5', manufacturer: 'Fanatec', keySpec: 'H-Pattern + Sequential', price: 259.95, rating: 4.3, weight: 1.5, filterSpecs: { type: 'H-Pattern + Sequential' } },
    { id: 's2', name: 'Heusinkveld Sim Shifter Sequential', manufacturer: 'Heusinkveld', keySpec: 'Sequential', price: 225, rating: 4.6, weight: 1.8, filterSpecs: { type: 'Sequential' } },
  ],
  DISPLAY: [
    { id: 'd1', name: 'Samsung Odyssey G9 (2025)', manufacturer: 'Samsung', keySpec: '49" DQHD 240Hz', price: 999.99, rating: 4.5, weight: 13.5, filterSpecs: { type: 'monitor', hdrSupport: 'true' } },
    { id: 'd2', name: 'LG 27GP850-B', manufacturer: 'LG', keySpec: '27" QHD 165Hz', price: 349.99, rating: 4.3, weight: 6.2, filterSpecs: { type: 'monitor', hdrSupport: 'false' } },
    { id: 'd3', name: 'Meta Quest 3', manufacturer: 'Meta', keySpec: 'VR 2064×2208', price: 499.99, rating: 4.4, weight: 0.515, filterSpecs: { type: 'vr_headset', hdrSupport: 'false' } },
  ],
  SEAT: [
    { id: 'st1', name: 'Sparco Grid Q', manufacturer: 'Sparco', keySpec: 'Fibreglass Bucket', price: 399, rating: 4.4, weight: 7.5, filterSpecs: { type: 'bucket' } },
    { id: 'st2', name: 'NRG FRP-301', manufacturer: 'NRG', keySpec: 'Fibreglass Bucket', price: 199, rating: 4.1, weight: 6.8, filterSpecs: { type: 'bucket' } },
  ],
  EXTRAS: [
    { id: 'e1', name: 'Buttkicker Gamer 2', manufacturer: 'Buttkicker', keySpec: 'Haptic Transducer', price: 149, rating: 4.2, weight: 1.2 },
    { id: 'e2', name: 'SRS ShakeKit', manufacturer: 'SRS', keySpec: '4-Motor Haptics', price: 499, rating: 4.6, weight: 2.4 },
  ],
};

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
  const clearBuild = useBuildStore((s) => s.clearBuild);
  const handleRemovePart = useBuildStore((s) => s.removePart);

  const filledCount = Object.keys(selectedParts).length;

  // Derive current selection slot from URL query param
  const selectParam = searchParams.get('select')?.toUpperCase() ?? null;
  const pickerSlot: CategorySlot | null =
    selectParam && VALID_SLOTS.has(selectParam)
      ? (selectParam as CategorySlot)
      : null;

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
        products={DEMO_CATALOG[pickerSlot] ?? []}
        onSelect={handlePickerSelect}
        onBack={handlePickerClose}
      />
    );
  }

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <div className={styles.logo}>
          Rig<span>Builder</span>
        </div>
        <nav className={styles.nav}>
          <a href="/admin" className={styles.navLink}>Admin</a>
          <a href="/login" className={styles.navLink}>Sign In</a>
        </nav>
      </header>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>System Builder</h1>
          <p className={styles.subtitle}>
            Select your components below. Compatibility is checked automatically.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.btnGhost} onClick={clearBuild}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New Build
          </button>
        </div>
      </div>

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
                <button type="button" className={styles.btnPrimary}>Save Build</button>
                <button type="button" className={styles.btnOutline}>Share</button>
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
