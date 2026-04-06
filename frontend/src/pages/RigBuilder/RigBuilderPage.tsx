import { useState, useMemo, useCallback } from 'react';
import styles from './RigBuilderPage.module.scss';
import { Configurator } from '../../components/Configurator/Configurator';
import { CompatibilityFeed } from '../../components/CompatibilityFeed/CompatibilityFeed';
import type { CategorySlot, SelectedPart } from '../../components/BuildTable/BuildTable';

// ---------------------------------------------------------------------------
// Demo data (replace with API calls)
// ---------------------------------------------------------------------------

const DEMO_PARTS: Partial<Record<CategorySlot, SelectedPart>> = {
  COCKPIT: { id: '1', name: 'Trak Racer TR160S MK5', keySpec: 'Aluminium Profile', price: 899, rating: 4.6 },
  WHEELBASE: { id: '2', name: 'Fanatec CSL DD (8 Nm)', keySpec: '8Nm Direct Drive', price: 349.95, rating: 4.4 },
  PEDALS: { id: '3', name: 'Heusinkveld Sprint Pedals', keySpec: 'Load Cell', price: 599, rating: 4.8 },
  DISPLAY: { id: '4', name: 'Samsung Odyssey G9 (2025)', keySpec: '49" DQHD 240Hz', price: 999.99, rating: 4.5 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RigBuilderPage() {
  const [parts, setParts] = useState<Partial<Record<CategorySlot, SelectedPart>>>(DEMO_PARTS);

  const totalPrice = useMemo(
    () => Object.values(parts).reduce((sum, p) => sum + (p?.price ?? 0), 0),
    [parts],
  );

  const filledCount = Object.keys(parts).length;

  const handleSelectCategory = useCallback((slot: CategorySlot) => {
    console.log('Browse:', slot);
  }, []);

  const handleRemovePart = useCallback((slot: CategorySlot) => {
    setParts((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }, []);

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
          <button type="button" className={styles.btnGhost}>
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
            parts={parts}
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
                <span className={styles.summaryValue}>{(filledCount * 8.5).toFixed(1)} kg</span>
              </div>

              <div className={styles.priceBreakdown}>
                {(Object.entries(parts) as [CategorySlot, SelectedPart][]).map(([slot, part]) => (
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

          <CompatibilityFeed parts={parts} />
        </aside>
      </div>
    </div>
  );
}

export default RigBuilderPage;
