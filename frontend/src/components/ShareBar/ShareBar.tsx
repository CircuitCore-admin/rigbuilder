// ============================================================================
// ShareBar — Permalink + markup export bar (PCPartPicker-style)
// Pinned above the build table. Dark frosted-glass aesthetic.
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './ShareBar.module.scss';
import { useBuildStore } from '../../stores/buildStore';
import type { CategorySlot, SelectedPart } from '../../stores/buildStore';
import { buildPermalink } from '../../utils/buildShortener';
import { api, ApiError } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { MarkupModal } from './MarkupModal';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareBar() {
  const selectedParts = useBuildStore((s) => s.selectedParts);
  const totalPrice = useBuildStore((s) => s.totalPrice);
  const clearBuild = useBuildStore((s) => s.clearBuild);
  const savedBuildId = useBuildStore((s) => s.savedBuildId);
  const savedBuildOwnerId = useBuildStore((s) => s.savedBuildOwnerId);
  const setSavedBuildId = useBuildStore((s) => s.setSavedBuildId);
  const isDirty = useBuildStore((s) => s.isDirty);
  const { user } = useAuth();

  const [copied, setCopied] = useState(false);
  const [modalFormat, setModalFormat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const hasParts = Object.keys(selectedParts).length > 0;
  const permalink = useMemo(
    () => (savedBuildId ? buildPermalink(savedBuildId) : ''),
    [savedBuildId],
  );

  // Ownership: can the current user overwrite this build?
  // A build with no owner (null savedBuildOwnerId) is considered "unowned" (new/unsaved).
  const isOwnBuild = savedBuildOwnerId == null || (user != null && savedBuildOwnerId === user.userId);
  const canOverwrite = user != null && isOwnBuild;

  // Save: update existing build (PUT) or create new (POST)
  const handleSave = useCallback(async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setShowLoginPrompt(false);

    try {
      const parts = (Object.entries(selectedParts) as [CategorySlot, SelectedPart][]).map(
        ([slot, part]) => ({
          productId: part.id,
          categorySlot: slot,
          pricePaid: part.price,
        }),
      );

      if (savedBuildId && canOverwrite) {
        // Update existing build — PUT keeps the same slug/URL
        await api<{ id: string; slug: string }>(`/builds/${savedBuildId}`, {
          method: 'PUT',
          body: {
            name: 'My RigBuilder Build',
            parts,
            isPublic: true,
          },
        });
        // Mark as clean (same ID, no longer dirty)
        setSavedBuildId(savedBuildId);
      } else {
        // Create new build
        const response = await api<{ id: string; slug: string }>('/builds', {
          method: 'POST',
          body: {
            name: 'My RigBuilder Build',
            parts,
            isPublic: true,
          },
        });
        setSavedBuildId(response.slug);
      }
      setCopied(false);
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? 'Please log in to save your build.'
          : err instanceof ApiError && err.status === 403
            ? 'You can only update your own builds. Use "Save As" to create a copy.'
            : err instanceof Error
              ? err.message
              : 'Failed to save build. Please try again.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }, [selectedParts, saving, savedBuildId, canOverwrite, setSavedBuildId, user]);

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

  // Save As New — create a new build with a fresh slug
  const handleSaveAsNew = useCallback(async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setShowLoginPrompt(false);

    try {
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

      setSavedBuildId(response.slug);
      setCopied(false);
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? 'Please log in to save your build.'
          : err instanceof Error
            ? err.message
            : 'Failed to save build. Please try again.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }, [selectedParts, saving, setSavedBuildId, user]);

  // New build
  const handleNew = useCallback(() => {
    clearBuild();
    setCopied(false);
    setSaveError(null);
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
              {isDirty && (
                <span className={styles.unsavedBadge} title="You have unsaved changes">
                  ● unsaved
                </span>
              )}
            </div>
          ) : saveError ? (
            <span className={styles.errorHint} title={saveError}>
              ⚠ {saveError}
            </span>
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

        {/* Login prompt banner */}
        {showLoginPrompt && !user && (
          <div className={styles.loginPrompt}>
            <span>Please log in to save your build.</span>
            <Link to="/login" className={styles.loginLink}>Sign In</Link>
            <Link to="/register" className={styles.loginLink}>Register</Link>
            <button
              type="button"
              className={styles.dismissBtn}
              onClick={() => setShowLoginPrompt(false)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className={styles.actions}>
          {/* Save button: only show when user owns the build (or it's a brand-new unsaved build) */}
          {(canOverwrite || !savedBuildId) && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleSave}
              disabled={!hasParts || saving || (savedBuildId != null && !isDirty)}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
          {/* Save As: shown when a build exists (always creates a new copy) */}
          {savedBuildId && (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
              onClick={handleSaveAsNew}
              disabled={!hasParts || saving}
            >
              Save As
            </button>
          )}
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
