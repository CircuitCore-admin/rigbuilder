import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearch } from '../../hooks/useSearch';
import type { SearchProduct, SearchBuild, SearchThread } from '../../hooks/useSearch';
import styles from './CommandPalette.module.scss';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading } = useSearch(query);

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const hasResults = results.products.length > 0 || results.builds.length > 0 || results.threads.length > 0;
  const showResults = query.trim().length >= 2;

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputRow}>
          <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Search products, builds, discussions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className={styles.kbd}>ESC</kbd>
        </div>

        {showResults && (
          <div className={styles.results}>
            {loading && <div className={styles.loader}>Searching…</div>}

            {!loading && !hasResults && (
              <div className={styles.empty}>No results for &ldquo;{query}&rdquo;</div>
            )}

            {results.products.length > 0 && (
              <ResultSection title="Products">
                {results.products.map((p) => (
                  <ProductHit key={p.id} product={p} onSelect={close} />
                ))}
              </ResultSection>
            )}

            {results.builds.length > 0 && (
              <ResultSection title="Builds">
                {results.builds.map((b) => (
                  <BuildHit key={b.id} build={b} onSelect={close} />
                ))}
              </ResultSection>
            )}

            {results.threads.length > 0 && (
              <ResultSection title="Discussions">
                {results.threads.map((t) => (
                  <ThreadHit key={t.id} thread={t} onSelect={close} />
                ))}
              </ResultSection>
            )}
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.hint}>
            <kbd className={styles.kbdSmall}>↑↓</kbd> Navigate
            <kbd className={styles.kbdSmall}>↵</kbd> Open
            <kbd className={styles.kbdSmall}>ESC</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function ProductHit({ product, onSelect }: { product: SearchProduct; onSelect: () => void }) {
  const lowestPrice = product.affiliateLinks?.length
    ? Math.min(...product.affiliateLinks.map((l) => l.price))
    : null;

  return (
    <a href={`/products/${product.slug}`} className={styles.hit} onClick={onSelect}>
      <div className={styles.hitInfo}>
        <span className={styles.hitName}>
          {product.name}
          {product.isBundle && <span className={styles.bundleBadge}>Bundle</span>}
        </span>
        <span className={styles.hitMeta}>
          {product.manufacturer} · {product.category.replace('_', ' ')}
          {product.avgRating != null && ` · ★ ${product.avgRating.toFixed(1)}`}
        </span>
      </div>
      {lowestPrice != null && (
        <span className={styles.hitPrice}>${lowestPrice.toFixed(2)}</span>
      )}
    </a>
  );
}

function BuildHit({ build, onSelect }: { build: SearchBuild; onSelect: () => void }) {
  return (
    <a href={`/builds/${build.slug}`} className={styles.hit} onClick={onSelect}>
      <div className={styles.hitInfo}>
        <span className={styles.hitName}>{build.name}</span>
        <span className={styles.hitMeta}>by {build.userName} · ▲ {build.upvoteCount}</span>
      </div>
      <span className={styles.hitPrice}>${build.totalCost.toFixed(0)}</span>
    </a>
  );
}

function ThreadHit({ thread, onSelect }: { thread: SearchThread; onSelect: () => void }) {
  return (
    <a href={`/community/${thread.slug}`} className={styles.hit} onClick={onSelect}>
      <div className={styles.hitInfo}>
        <span className={styles.hitName}>{thread.title}</span>
        <span className={styles.hitMeta}>
          {thread.category.replace('_', ' ')} · by {thread.userName} · {thread.replyCount} replies
        </span>
      </div>
    </a>
  );
}
