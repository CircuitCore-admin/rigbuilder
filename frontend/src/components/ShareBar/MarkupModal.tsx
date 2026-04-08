// ============================================================================
// MarkupModal — Copy-to-clipboard modal for export formats
// Supports Reddit Markdown, HTML, BBCode, Plain Text
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import styles from './MarkupModal.module.scss';
import type { CategorySlot, SelectedPart } from '../../stores/buildStore';
import {
  toRedditMarkdown,
  toPlainText,
  toHtmlTable,
  toBBCode,
} from '../../utils/markupGenerator';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MarkupModalProps {
  format: string;
  parts: Partial<Record<CategorySlot, SelectedPart>>;
  totalPrice: number;
  permalink?: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Format metadata
// ---------------------------------------------------------------------------

const FORMAT_LABELS: Record<string, string> = {
  reddit: 'Reddit Markdown',
  html: 'HTML Table',
  bbcode: 'BBCode',
  text: 'Plain Text / Discord',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarkupModal({ format, parts, totalPrice, permalink, onClose }: MarkupModalProps) {
  const [copied, setCopied] = useState(false);

  const markup = useMemo(() => {
    const input = { parts, totalPrice, buildName: 'My RigBuilder Build', permalink };
    switch (format) {
      case 'reddit': return toRedditMarkdown(input);
      case 'html': return toHtmlTable(input);
      case 'bbcode': return toBBCode(input);
      case 'text': return toPlainText(input);
      default: return toPlainText(input);
    }
  }, [format, parts, totalPrice, permalink]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markup);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback selection-based copy
      const textarea = document.querySelector<HTMLTextAreaElement>('[data-markup-output]');
      if (textarea) {
        textarea.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [markup]);

  // Close on backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={handleBackdropClick} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>{FORMAT_LABELS[format] ?? format}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <textarea
          className={styles.output}
          value={markup}
          readOnly
          data-markup-output
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.copyBtn}
            onClick={handleCopy}
          >
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MarkupModal;
