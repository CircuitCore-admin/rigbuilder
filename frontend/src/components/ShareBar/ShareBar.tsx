// ============================================================================
// ShareBar — Permalink + markup export bar (PCPartPicker-style)
// Pinned above the build table. Dark frosted-glass aesthetic.
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import styles from './ShareBar.module.scss';
import { useBuildStore } from '../../stores/buildStore';
import { generateBuildId, buildPermalink } from '../../utils/buildShortener';
import { MarkupModal } from './MarkupModal';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareBar() {
  const selectedParts = useBuildStore((s) => s.selectedParts);
  const totalPrice = useBuildStore((s) => s.totalPrice);
  const clearBuild = useBuildStore((s) => s.clearBuild);

  const [savedId, setSavedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [modalFormat, setModalFormat] = useState<string | null>(null);

  const hasParts = Object.keys(selectedParts).length > 0;
  const permalink = useMemo(() => savedId ? buildPermalink(savedId) : '', [savedId]);

  // Save / generate permalink
  const handleSave = useCallback(() => {
    const id = generateBuildId();
    setSavedId(id);
    setCopied(false);
    // TODO: persist to backend when API is ready
  }, []);

  // Copy permalink
  const handleCopy = useCallback(async () => {
    if (!permalink) return;
    try {
      await navigator.clipboard.writeText(permalink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.querySelector<HTMLInputElement>('[data-sharebar-url]');
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [permalink]);

  // New build
  const handleNew = useCallback(() => {
    clearBuild();
    setSavedId(null);
    setCopied(false);
  }, [clearBuild]);

  return (
    <>
      <div className={styles.bar}>
        {/* Permalink section */}
        <div className={styles.linkSection}>
          {savedId ? (
            <div className={styles.linkGroup}>
              <input
                className={styles.linkInput}
                type="text"
                value={permalink}
                readOnly
                data-sharebar-url
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopy}
                title="Copy link"
              >
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M10 4V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5.5A1.5 1.5 0 003 10h1" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                )}
              </button>
            </div>
          ) : (
            <span className={styles.placeholder}>Save your build to get a shareable link</span>
          )}
        </div>

        {/* Markup format toggles */}
        <div className={styles.markupToggles}>
          <button
            type="button"
            className={styles.formatBtn}
            onClick={() => setModalFormat('reddit')}
            disabled={!hasParts}
            title="Reddit Markdown"
          >
            Reddit
          </button>
          <button
            type="button"
            className={styles.formatBtn}
            onClick={() => setModalFormat('html')}
            disabled={!hasParts}
            title="HTML Table"
          >
            HTML
          </button>
          <button
            type="button"
            className={styles.formatBtn}
            onClick={() => setModalFormat('bbcode')}
            disabled={!hasParts}
            title="BBCode"
          >
            BBCode
          </button>
          <button
            type="button"
            className={styles.formatBtn}
            onClick={() => setModalFormat('text')}
            disabled={!hasParts}
            title="Plain Text / Discord"
          >
            Text
          </button>
        </div>

        {/* Action buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleSave}
            disabled={!hasParts}
          >
            {savedId ? 'Save As' : 'Save'}
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnNew}`}
            onClick={handleNew}
          >
            + New
          </button>
        </div>
      </div>

      {/* Markup modal */}
      {modalFormat && (
        <MarkupModal
          format={modalFormat}
          parts={selectedParts}
          totalPrice={totalPrice}
          permalink={permalink}
          onClose={() => setModalFormat(null)}
        />
      )}
    </>
  );
}

export default ShareBar;
