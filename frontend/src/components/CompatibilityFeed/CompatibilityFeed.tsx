import { useEffect, useRef } from 'react';
import styles from './CompatibilityFeed.module.scss';
import { useBuildStore } from '../../stores/buildStore';
import type { CategorySlot, SelectedPart } from '../../stores/buildStore';
import type { CompatibilitySeverity } from '../../types/compatibility';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeedEntry {
  id: string;
  severity: CompatibilitySeverity;
  message: string;
}

// ---------------------------------------------------------------------------
// Build feed entries from store state
// ---------------------------------------------------------------------------

function buildFeedEntries(
  parts: Partial<Record<CategorySlot, SelectedPart>>,
  report: { overallSeverity: CompatibilitySeverity; conflicts: { severity: CompatibilitySeverity; message: string }[] },
): FeedEntry[] {
  const entries: FeedEntry[] = [];
  let id = 0;
  const mkId = () => `f-${++id}`;

  const filled = Object.entries(parts) as [CategorySlot, SelectedPart][];
  if (filled.length === 0) {
    return [{ id: mkId(), severity: 'OK', message: 'Add components to begin compatibility checks.' }];
  }

  for (const [slot, part] of filled) {
    entries.push({ id: mkId(), severity: 'OK', message: `${slot} → ${part.name} loaded` });
  }

  // Add conflict entries from the real engine
  for (const conflict of report.conflicts) {
    entries.push({
      id: mkId(),
      severity: conflict.severity,
      message: conflict.message,
    });
  }

  // Summary
  const hasError = report.overallSeverity === 'ERROR';
  const hasWarning = report.overallSeverity === 'WARNING';

  entries.push({
    id: mkId(),
    severity: report.overallSeverity,
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
  /** Optional override; if omitted, reads from useBuildStore. */
  parts?: Partial<Record<CategorySlot, SelectedPart>>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CompatibilityFeed({ parts: propParts }: CompatibilityFeedProps) {
  const storeParts = useBuildStore((s) => s.selectedParts);
  const report = useBuildStore((s) => s.compatibilityReport);
  const parts = propParts ?? storeParts;

  const entries = buildFeedEntries(parts, report);
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
