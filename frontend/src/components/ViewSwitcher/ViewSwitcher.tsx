// ============================================================================
// ViewSwitcher — Horizontal icon-based toggle for List / Compact / Standard
// view modes in the ProductSelectionView sub-header.
// ============================================================================

import type { ReactElement } from 'react';
import styles from './ViewSwitcher.module.scss';

export type ViewMode = 'list' | 'compact' | 'standard';

interface ViewOption {
  mode: ViewMode;
  label: string;
  icon: ReactElement;
}

const VIEW_OPTIONS: ViewOption[] = [
  {
    mode: 'list',
    label: 'List View',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 3h12M2 6.5h12M2 10h12M2 13.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    mode: 'compact',
    label: 'Compact Cards',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    mode: 'standard',
    label: 'Standard Cards',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="1" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
];

export interface ViewSwitcherProps {
  active: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewSwitcher({ active, onChange }: ViewSwitcherProps) {
  return (
    <div className={styles.switcher} role="radiogroup" aria-label="View mode">
      {VIEW_OPTIONS.map((opt) => (
        <button
          key={opt.mode}
          type="button"
          className={`${styles.btn} ${active === opt.mode ? styles.btnActive : ''}`}
          onClick={() => onChange(opt.mode)}
          role="radio"
          aria-checked={active === opt.mode}
          aria-label={opt.label}
          title={opt.label}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

export default ViewSwitcher;
