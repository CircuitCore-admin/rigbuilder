// ============================================================================
// ShareBar — Permalink + markup export bar (PCPartPicker-style)
// Pinned above the build table. Dark frosted-glass aesthetic.
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import styles from './ShareBar.module.scss';
import { useBuildStore } from '../../stores/buildStore';
import type { CategorySlot, SelectedPart } from '../../stores/buildStore';
import { generateBuildId, buildPermalink } from '../../utils/buildShortener';
import { api } from '../../utils/api';
import { MarkupModal } from './MarkupModal';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareBar() {
  const selectedParts = useBuildStore((s) => s.selectedParts);
  const totalPrice = useBuildStore((s) => s.totalPrice);
  const clearBuild = useBuildStore((s) => s.clearBuild);
  const savedBuildId = useBuildStore((s) => s.savedBuildId);
  const setSavedBuildId = useBuildStore((s) => s.setSavedBuildId);
  const resetSavedMeta = useBuildStore((s) => s.resetSavedMeta);

  const [copied, setCopied] = useState(false);
  const [modalFormat, setModalFormat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hasParts = Object.keys(selectedParts).length > 0;
  const permalink = useMemo(
    () => (savedBuildId ? buildPermalink(savedBuildId) : ''),
    [savedBuildId],
  );

  // Save build to backend and generate permalink
  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);

    try {
      // Build the parts array for the API
      const parts = (Object.entries(selectedParts) as [CategorySlot, SelectedPart][]).map(
        ([slot, part]) => ({
          productId: part.id,
          categorySlot: slot,
          pricePaid: part.price,
        }),
      );

      const response = await api<{ id: string; slug: string }>('/builds', {
        method: 'POST',
        body: {
          name: 'My RigBuilder Build',
          parts,
          isPublic: true,
        },
      });

      setSavedBuildId(response.id);
      setCopied(false);
    } catch {
      // If the backend is not available, fall back to local-only ID generation
      const id = generateBuildId();
      setSavedBuildId(id);
      setCopied(false);
    } finally {
      setSaving(false);
    }
  }, [selectedParts, saving, setSavedBuildId]);

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

  // Save As New — clone with a fresh ID
  const handleSaveAsNew = useCallback(async () => {
    resetSavedMeta();
    // Slight delay so UI updates before triggering save
    setTimeout(() => handleSave(), 50);
  }, [resetSavedMeta, handleSave]);

  // New build
  const handleNew = useCallback(() => {
    clearBuild();
    setCopied(false);
  }, [clearBuild]);

  return (
    <>
      <div className={styles.bar}>
        {/* Permalink section */}
        <div className={styles.linkSection}>
          {savedBuildId ? (
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
            onClick={savedBuildId ? handleSaveAsNew : handleSave}
            disabled={!hasParts || saving}
          >
            {saving ? 'Saving…' : savedBuildId ? 'Save As' : 'Save'}
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
