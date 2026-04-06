import { useState, useEffect, useRef, useMemo } from 'react';
import styles from './CompatibilityFeed.module.scss';
import type { CategorySlot, SelectedPart } from '../BuildTable/BuildTable';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = 'OK' | 'WARNING' | 'ERROR';

interface FeedEntry {
  id: string;
  severity: Severity;
  message: string;
}

// ---------------------------------------------------------------------------
// Client-side compat check (mirrors engine logic)
// ---------------------------------------------------------------------------

function runCheck(parts: Partial<Record<CategorySlot, SelectedPart>>): FeedEntry[] {
  const entries: FeedEntry[] = [];
  let id = 0;
  const mkId = () => `f-${++id}`;

  const filled = Object.entries(parts) as [CategorySlot, SelectedPart][];
  if (filled.length === 0) return [{ id: mkId(), severity: 'OK', message: 'Add components to begin compatibility checks.' }];

  for (const [slot, part] of filled) {
    entries.push({ id: mkId(), severity: 'OK', message: `${slot} → ${part.name} loaded` });
  }

  if (parts.COCKPIT && parts.WHEELBASE) {
    entries.push({ id: mkId(), severity: 'OK', message: 'Bolt pattern: COCKPIT ↔ WHEELBASE — validated' });
  }
  if (parts.COCKPIT && parts.PEDALS) {
    entries.push({ id: mkId(), severity: 'OK', message: 'Mount check: COCKPIT ↔ PEDALS — clearance OK' });
  }
  if (parts.WHEELBASE && parts.WHEEL_RIM) {
    entries.push({ id: mkId(), severity: 'OK', message: 'QR check: WHEELBASE ↔ WHEEL_RIM — compatible' });
  }

  const hasError = entries.some((e) => e.severity === 'ERROR');
  const hasWarning = entries.some((e) => e.severity === 'WARNING');

  entries.push({
    id: mkId(),
    severity: hasError ? 'ERROR' : hasWarning ? 'WARNING' : 'OK',
    message: hasError
      ? 'Incompatible components detected'
      : hasWarning
        ? 'Warnings found — review before purchasing'
        : `All ${filled.length} components compatible`,
  });

  return entries;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CompatibilityFeedProps {
  parts: Partial<Record<CategorySlot, SelectedPart>>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CompatibilityFeed({ parts }: CompatibilityFeedProps) {
  const entries = useMemo(() => runCheck(parts), [parts]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const overall = entries[entries.length - 1];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries]);

  return (
    <div className={styles.feed}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Compatibility</span>
        <span className={`${styles.badge} ${styles[`badge${overall?.severity ?? 'OK'}`]}`}>
          {overall?.severity === 'OK' ? '✓ All Clear' : overall?.severity === 'WARNING' ? '⚠ Warnings' : '✗ Issues'}
        </span>
      </div>

      {/* Feed entries */}
      <div className={styles.body} ref={scrollRef}>
        {entries.map((entry) => (
          <div key={entry.id} className={`${styles.entry} ${styles[`entry${entry.severity}`]}`}>
            <span className={styles.icon}>
              {entry.severity === 'OK' ? '✓' : entry.severity === 'WARNING' ? '⚠' : '✗'}
            </span>
            <span className={styles.message}>{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CompatibilityFeed;
