import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, resolveImageUrl } from '../../utils/api';
import styles from './ComparePage.module.scss';

const CATEGORY_LABELS: Record<string, string> = {
  WHEELBASE: 'Wheel Base',
  WHEEL_RIM: 'Wheel Rim',
  PEDALS: 'Pedals',
  COCKPIT: 'Cockpit',
  SEAT: 'Seat',
  SHIFTER: 'Shifter',
  DISPLAY: 'Display',
  EXTRAS: 'Extras',
};

const CATEGORY_ORDER = ['WHEELBASE', 'WHEEL_RIM', 'PEDALS', 'COCKPIT', 'SEAT', 'SHIFTER', 'DISPLAY', 'EXTRAS'];

interface BuildPart {
  categorySlot: string;
  pricePaid: number | null;
  product: {
    id: string;
    name: string;
    slug: string;
    manufacturer: string;
    category: string;
    images: string[];
    avgRating: number | null;
  };
}

interface CompareBuild {
  id: string;
  name: string;
  slug: string;
  totalCost: number | null;
  ratings: Record<string, number> | null;
  user: { id: string; username: string; avatarUrl: string | null };
  parts: BuildPart[];
}

interface SearchBuild {
  id: string;
  name: string;
  slug: string;
  totalCost: number | null;
  user?: { username: string };
}

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [builds, setBuilds] = useState<CompareBuild[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchBuild[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    searchParams.get('ids')?.split(',').filter(Boolean) ?? []
  );

  // Fetch builds when IDs change
  useEffect(() => {
    if (selectedIds.length < 2) {
      setBuilds([]);
      return;
    }
    setLoading(true);
    api<CompareBuild[]>(`/builds/compare?ids=${selectedIds.join(',')}`)
      .then(setBuilds)
      .catch(() => setBuilds([]))
      .finally(() => setLoading(false));
    setSearchParams({ ids: selectedIds.join(',') });
  }, [selectedIds, setSearchParams]);

  // Search builds
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api<{ items: SearchBuild[] }>(`/builds?search=${encodeURIComponent(searchQuery)}&limit=5`)
        .then(d => setSearchResults(d.items ?? []))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addBuild = (id: string) => {
    if (selectedIds.length >= 3 || selectedIds.includes(id)) return;
    setSelectedIds([...selectedIds, id]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeBuild = (id: string) => {
    setSelectedIds(selectedIds.filter(i => i !== id));
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Compare Builds</h1>
      <p className={styles.pageDesc}>Compare up to 3 builds side-by-side to find the best setup for you.</p>

      {/* Build selector */}
      <div className={styles.selector}>
        {selectedIds.length < 3 && (
          <div className={styles.searchWrapper}>
            <input
              className={styles.searchInput}
              placeholder="Search for a build to add..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className={styles.searchDropdown}>
                {searchResults.map(b => (
                  <button key={b.id} className={styles.searchResult} onClick={() => addBuild(b.id)}>
                    <span className={styles.searchResultName}>{b.name}</span>
                    <span className={styles.searchResultMeta}>
                      {b.user?.username ?? 'Unknown'} — £{b.totalCost?.toFixed(0) ?? '0'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && <p className={styles.emptyState}>Loading builds…</p>}

      {/* Comparison table */}
      {builds.length >= 2 && (
        <div className={styles.compareGrid} style={{ gridTemplateColumns: `200px repeat(${builds.length}, 1fr)` }}>
          {/* Header row — build names */}
          <div className={styles.compareLabel} />
          {builds.map(b => (
            <div key={b.id} className={styles.compareHeader}>
              <a href={`/list/${b.slug}`} className={styles.compareBuildName}>{b.name}</a>
              <span className={styles.compareBuildUser}>by {b.user.username}</span>
              <button className={styles.removeBtn} onClick={() => removeBuild(b.id)}>Remove</button>
            </div>
          ))}

          {/* Total cost row */}
          <div className={styles.compareLabel}>Total Cost</div>
          {builds.map(b => (
            <div key={b.id} className={styles.compareCellHighlight}>
              £{b.totalCost?.toFixed(0) ?? '—'}
            </div>
          ))}

          {/* Parts rows by category */}
          {CATEGORY_ORDER.map(cat => {
            const anyHasPart = builds.some(b => b.parts.find(p => p.categorySlot === cat));
            if (!anyHasPart) return null;

            return (
              <div key={cat} className={styles.compareRow}>
                <div className={styles.compareLabel}>{CATEGORY_LABELS[cat]}</div>
                {builds.map(b => {
                  const part = b.parts.find(p => p.categorySlot === cat);
                  return (
                    <div key={b.id} className={styles.compareCell}>
                      {part ? (
                        <div className={styles.partCell}>
                          {part.product.images?.[0] && (
                            <img src={resolveImageUrl(part.product.images[0])} alt="" className={styles.partImage} />
                          )}
                          <a href={`/products/${part.product.slug}`} className={styles.partName}>
                            {part.product.name}
                          </a>
                          <span className={styles.partManufacturer}>{part.product.manufacturer}</span>
                          {part.pricePaid != null && (
                            <span className={styles.partPrice}>£{part.pricePaid.toFixed(0)}</span>
                          )}
                          {part.product.avgRating != null && (
                            <span className={styles.partRating}>★ {part.product.avgRating.toFixed(1)}</span>
                          )}
                        </div>
                      ) : (
                        <span className={styles.noPart}>—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Ratings row */}
          <div className={styles.compareLabel}>Builder Rating</div>
          {builds.map(b => (
            <div key={b.id} className={styles.compareCell}>
              {b.ratings ? (
                <div className={styles.ratingsCell}>
                  {Object.entries(b.ratings).map(([key, val]) => (
                    <div key={key} className={styles.ratingRow}>
                      <span className={styles.ratingLabel}>{key}</span>
                      <div className={styles.ratingBar}>
                        <div className={styles.ratingBarFill} style={{ width: `${(val / 10) * 100}%` }} />
                      </div>
                      <span className={styles.ratingValue}>{val}/10</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className={styles.noPart}>No rating</span>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedIds.length < 2 && !loading && (
        <div className={styles.emptyState}>
          <p>Search and add at least 2 builds to compare them side-by-side.</p>
        </div>
      )}
    </div>
  );
}

export default ComparePage;
