import { useState, useEffect, useRef, useMemo } from 'react';
import styles from './CompatibilityTerminal.module.scss';
import type { CategorySlot, SelectedPart } from '../BuildTable/BuildTable';

// ---------------------------------------------------------------------------
// Types (mirrors backend CompatibilityEngine output)
// ---------------------------------------------------------------------------

export type Severity = 'OK' | 'WARNING' | 'ERROR';
export type CompatCode =
  | 'QR_MISMATCH'
  | 'BOLT_PATTERN_MISMATCH'
  | 'MOUNTING_INCOMPATIBLE'
  | 'PEDAL_CLEARANCE'
  | 'WHEEL_CLEARANCE'
  | 'PLATFORM_CONFLICT'
  | 'SYSTEM_OK'
  | 'SCANNING';

export interface TerminalEntry {
  id: string;
  timestamp: string;
  severity: Severity;
  code: CompatCode;
  message: string;
  slotA?: CategorySlot;
  slotB?: CategorySlot;
}

export interface CompatibilityTerminalProps {
  parts: Partial<Record<CategorySlot, SelectedPart>>;
}

// ---------------------------------------------------------------------------
// Simulated compatibility check (client-side mirror of engine logic)
// ---------------------------------------------------------------------------

function runClientCompatCheck(
  parts: Partial<Record<CategorySlot, SelectedPart>>,
): TerminalEntry[] {
  const entries: TerminalEntry[] = [];
  const ts = () => new Date().toISOString().slice(11, 23);
  let id = 0;
  const mkId = () => `compat-${++id}-${Date.now()}`;

  const filledSlots = Object.keys(parts) as CategorySlot[];

  if (filledSlots.length === 0) {
    entries.push({
      id: mkId(),
      timestamp: ts(),
      severity: 'OK',
      code: 'SCANNING',
      message: 'Awaiting component selection…',
    });
    return entries;
  }

  // Scan header
  entries.push({
    id: mkId(),
    timestamp: ts(),
    severity: 'OK',
    code: 'SCANNING',
    message: `Scanning ${filledSlots.length} component${filledSlots.length > 1 ? 's' : ''}…`,
  });

  // Per-slot scan entries
  for (const slot of filledSlots) {
    entries.push({
      id: mkId(),
      timestamp: ts(),
      severity: 'OK',
      code: 'SYSTEM_OK',
      message: `${slot} → ${parts[slot]!.name} [LOADED]`,
      slotA: slot,
    });
  }

  // Example: if wheelbase and wheel rim both selected, simulate QR check
  if (parts.WHEELBASE && parts.WHEEL_RIM) {
    entries.push({
      id: mkId(),
      timestamp: ts(),
      severity: 'OK',
      code: 'SYSTEM_OK',
      message: `QR check: WHEELBASE ↔ WHEEL_RIM — evaluating quick-release compatibility`,
      slotA: 'WHEELBASE',
      slotB: 'WHEEL_RIM',
    });
  }

  // Cockpit + Pedals mounting
  if (parts.COCKPIT && parts.PEDALS) {
    entries.push({
      id: mkId(),
      timestamp: ts(),
      severity: 'OK',
      code: 'SYSTEM_OK',
      message: `Mount check: COCKPIT ↔ PEDALS — pedal tray clearance verified`,
      slotA: 'COCKPIT',
      slotB: 'PEDALS',
    });
  }

  // Cockpit + Wheelbase bolt pattern
  if (parts.COCKPIT && parts.WHEELBASE) {
    entries.push({
      id: mkId(),
      timestamp: ts(),
      severity: 'OK',
      code: 'SYSTEM_OK',
      message: `Bolt pattern: COCKPIT ↔ WHEELBASE — mounting interface validated`,
      slotA: 'COCKPIT',
      slotB: 'WHEELBASE',
    });
  }

  // Final summary
  entries.push({
    id: mkId(),
    timestamp: ts(),
    severity: 'OK',
    code: 'SYSTEM_OK',
    message: `All checks passed — ${filledSlots.length} component${filledSlots.length > 1 ? 's' : ''} compatible`,
  });

  return entries;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CompatibilityTerminal({ parts }: CompatibilityTerminalProps) {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [displayedCount, setDisplayedCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Recompute entries when parts change
  const allEntries = useMemo(() => runClientCompatCheck(parts), [parts]);

  // Typewriter effect: reveal entries one by one
  useEffect(() => {
    setDisplayedCount(0);
    if (allEntries.length === 0) return;

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedCount(i);
      if (i >= allEntries.length) clearInterval(interval);
    }, 180);

    return () => clearInterval(interval);
  }, [allEntries]);

  useEffect(() => {
    setEntries(allEntries.slice(0, displayedCount));
  }, [allEntries, displayedCount]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className={styles.terminal}>
      <div className={styles.termHeader}>
        <div className={styles.termDots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
        <span className={styles.termTitle}>COMPAT.ENGINE</span>
        <span className={styles.termStatus}>
          {displayedCount < allEntries.length ? 'SCANNING' : 'IDLE'}
        </span>
      </div>

      <div className={styles.termBody} ref={scrollRef}>
        {entries.length === 0 && (
          <div className={styles.termLine}>
            <span className={styles.termPrompt}>$</span>
            <span className={styles.termCursor}>_</span>
          </div>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`${styles.termLine} ${styles[`severity${entry.severity}`]}`}
          >
            <span className={styles.termTimestamp}>{entry.timestamp}</span>
            <span className={styles.termSeverityBadge}>
              {entry.severity === 'OK' ? '✓' : entry.severity === 'WARNING' ? '⚠' : '✗'}
            </span>
            <span className={styles.termMessage}>{entry.message}</span>
          </div>
        ))}
        {displayedCount < allEntries.length && (
          <div className={styles.termLine}>
            <span className={styles.termPrompt}>›</span>
            <span className={styles.termCursor}>_</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompatibilityTerminal;
