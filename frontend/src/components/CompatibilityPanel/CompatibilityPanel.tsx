// ============================================================================
// CompatibilityPanel — Summarises all active conflicts in the current build.
// Collapsible sidebar widget with colour-coded conflict entries.
// ============================================================================

import { useState } from 'react';
import styles from './CompatibilityPanel.module.scss';
import { useBuildStore } from '../../stores/buildStore';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CompatibilityPanel() {
  const [expanded, setExpanded] = useState(true);
  const selectedParts = useBuildStore((s) => s.selectedParts);
  const report = useBuildStore((s) => s.compatibilityReport);

  const filledCount = Object.keys(selectedParts).length;
  const hasConflicts = report.conflicts.length > 0;

  const severityIcon =
    report.overallSeverity === 'OK'
      ? '✓'
      : report.overallSeverity === 'WARNING'
        ? '⚠'
        : '✗';

  const severityLabel =
    report.overallSeverity === 'OK'
      ? 'All Clear'
      : report.overallSeverity === 'WARNING'
        ? `${report.conflicts.length} Warning${report.conflicts.length !== 1 ? 's' : ''}`
        : `${report.conflicts.length} Issue${report.conflicts.length !== 1 ? 's' : ''}`;

  return (
    <div className={styles.panel}>
      {/* Header (always visible) */}
      <button
        type="button"
        className={styles.header}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className={styles.headerLeft}>
          <span className={styles.title}>Compatibility Status</span>
          <span className={styles.componentCount}>
            {filledCount} component{filledCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className={styles.headerRight}>
          <span
            className={`${styles.badge} ${styles[`badge${report.overallSeverity}`]}`}
          >
            {severityIcon} {severityLabel}
          </span>
          <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>
            ›
          </span>
        </div>
      </button>

      {/* Expandable body */}
      {expanded && (
        <div className={styles.body}>
          {filledCount === 0 && (
            <div className={styles.emptyState}>
              Add components to begin compatibility checks.
            </div>
          )}

          {filledCount > 0 && !hasConflicts && (
            <div className={styles.allClear}>
              <span className={styles.allClearIcon}>✓</span>
              <span>All {filledCount} components are compatible.</span>
            </div>
          )}

          {hasConflicts && (
            <div className={styles.conflictList}>
              {report.conflicts.map((conflict, i) => (
                <div
                  key={`${conflict.code}-${conflict.productAId}-${conflict.productBId}-${i}`}
                  className={`${styles.conflictEntry} ${
                    conflict.severity === 'ERROR'
                      ? styles.conflictError
                      : styles.conflictWarning
                  }`}
                >
                  <span className={styles.conflictIcon}>
                    {conflict.severity === 'ERROR' ? '✗' : '⚠'}
                  </span>
                  <div className={styles.conflictContent}>
                    <span className={styles.conflictCode}>{conflict.code.replace(/_/g, ' ')}</span>
                    <span className={styles.conflictMessage}>{conflict.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CompatibilityPanel;
