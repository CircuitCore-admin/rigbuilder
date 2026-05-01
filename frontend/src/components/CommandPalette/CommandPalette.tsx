import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../../hooks/useSearch';
import { resolveImageUrl } from '../../utils/api';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { SearchProduct, SearchBuild, SearchThread, SearchListing, SearchUser } from '../../hooks/useSearch';
import styles from './CommandPalette.module.scss';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading } = useSearch(query);
  const navigate = useNavigate();
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  // Cmd+K / Ctrl+K / '/' keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for external open event (from Navbar search button)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
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

  const handleSelect = useCallback((url: string) => {
    close();
    navigate(url);
  }, [close, navigate]);

  const hasResults = results.products.length > 0 || results.builds.length > 0 || results.threads.length > 0 || results.listings.length > 0 || results.users.length > 0;
  const showResults = query.trim().length >= 2;

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.palette} ref={trapRef} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputRow}>
          <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Search products, listings, threads, users…"
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

            {results.users.length > 0 && (
              <ResultSection title="Users">
                {results.users.map((u) => (
                  <UserHit key={u.id} user={u} onSelect={handleSelect} />
                ))}
              </ResultSection>
            )}

            {results.products.length > 0 && (
              <ResultSection title="Products">
                {results.products.map((p) => (
                  <ProductHit key={p.id} product={p} onSelect={handleSelect} />
                ))}
              </ResultSection>
            )}

            {results.listings.length > 0 && (
              <ResultSection title="Marketplace">
                {results.listings.map((l) => (
                  <ListingHit key={l.id} listing={l} onSelect={handleSelect} />
                ))}
              </ResultSection>
            )}

            {results.threads.length > 0 && (
              <ResultSection title="Community">
                {results.threads.map((t) => (
                  <ThreadHit key={t.id} thread={t} onSelect={handleSelect} />
                ))}
              </ResultSection>
            )}

            {results.builds.length > 0 && (
              <ResultSection title="Builds">
                {results.builds.map((b) => (
                  <BuildHit key={b.id} build={b} onSelect={handleSelect} />
                ))}
              </ResultSection>
            )}
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.hint}>
            <kbd className={styles.kbdSmall}>↑↓</kbd> Navigate
            <kbd className={styles.kbdSmall}>↵</kbd> Open
            <kbd className={styles.kbdSmall}>Ctrl</kbd>+<kbd className={styles.kbdSmall}>K</kbd> Toggle
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

function UserHit({ user, onSelect }: { user: SearchUser; onSelect: (url: string) => void }) {
  return (
    <button className={styles.hit} onClick={() => onSelect(`/profile/${user.username}`)}>
      <div className={styles.hitAvatar}>
        {user.avatarUrl ? <img src={resolveImageUrl(user.avatarUrl)} alt="" loading="lazy" decoding="async" /> : <span>{user.username[0]?.toUpperCase()}</span>}
      </div>
      <div className={styles.hitInfo}>
        <span className={styles.hitName}>{user.username}</span>
        {user.pitCred > 0 && <span className={styles.hitMeta}>{user.pitCred} Pit Cred</span>}
      </div>
    </button>
  );
}

function ProductHit({ product, onSelect }: { product: SearchProduct; onSelect: (url: string) => void }) {
  const lowestPrice = product.affiliateLinks?.length
    ? Math.min(...product.affiliateLinks.map((l) => l.price))
    : null;

  return (
    <button className={styles.hit} onClick={() => onSelect(`/products/${product.slug}`)}>
      <div className={styles.hitInfo}>
        <span className={styles.hitName}>
          {product.name}
          {product.isBundle && <span className={styles.bundleBadge}>Bundle</span>}
        </span>
        <span className={styles.hitMeta}>
          {product.manufacturer} · {product.category.replaceAll('_', ' ')}
          {product.avgRating != null && ` · ★ ${product.avgRating.toFixed(1)}`}
        </span>
      </div>
      {lowestPrice != null && (
        <span className={styles.hitPrice}>${lowestPrice.toFixed(2)}</span>
      )}
    </button>
  );
}

function ListingHit({ listing, onSelect }: { listing: SearchListing; onSelect: (url: string) => void }) {
  const currencySymbol = listing.currency === 'GBP' ? '£' : listing.currency === 'EUR' ? '€' : '$';
  return (
    <button className={styles.hit} onClick={() => onSelect(`/marketplace/${listing.id}`)}>
      <div className={styles.hitInfo}>
        <span className={styles.hitName}>{listing.title}</span>
        <span className={styles.hitMeta}>
          {listing.price != null ? `${currencySymbol}${listing.price}` : 'Offers'} · {listing.category} · {listing.sellerUsername}
        </span>
      </div>
    </button>
  );
}

function BuildHit({ build, onSelect }: { build: SearchBuild; onSelect: (url: string) => void }) {
  return (
    <button className={styles.hit} onClick={() => onSelect(`/list/${build.slug}`)}>
      <div className={styles.hitInfo}>
        <span className={styles.hitName}>{build.name}</span>
        <span className={styles.hitMeta}>by {build.userName} · ▲ {build.upvoteCount}</span>
      </div>
      <span className={styles.hitPrice}>${build.totalCost.toFixed(0)}</span>
    </button>
  );
}

function ThreadHit({ thread, onSelect }: { thread: SearchThread; onSelect: (url: string) => void }) {
  return (
    <button className={styles.hit} onClick={() => onSelect(`/community/${thread.slug}`)}>
      <div className={styles.hitInfo}>
        <span className={styles.hitName}>{thread.title}</span>
        <span className={styles.hitMeta}>
          {thread.category.replaceAll('_', ' ')} · by {thread.userName} · {thread.replyCount} replies
        </span>
      </div>
    </button>
  );
}
