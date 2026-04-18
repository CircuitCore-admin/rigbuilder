import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, resolveImageUrl } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast/Toast';
import { useBuildStore, type CategorySlot, type SelectedPart } from '../../stores/buildStore';
import styles from './ProductComparePage.module.scss';

interface CompareProduct {
  id: string;
  name: string;
  slug: string;
  manufacturer: string;
  category: string;
  specs: Record<string, unknown>;
  weight?: number | null;
  dimensions?: { length?: number; width?: number; height?: number } | null;
  platforms: string[];
  images: string[];
  avgRating?: number | null;
  reviewCount?: number;
  latestPrice?: { price: number; currency: string; retailer: string } | null;
  reviews: { ratingOverall: number; wouldBuyAgain: boolean }[];
  _count: { reviews: number; buildParts: number };
}

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  manufacturer: string;
  category: string;
  images: string[];
  avgRating?: number | null;
}

/** Convert camelCase/snake_case to Title Case display label. */
function toDisplayLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function formatSpecValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
  if (value == null) return '—';
  return String(value);
}

export function ProductComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(
    searchParams.get('slugs')?.split(',').filter(Boolean) ?? []
  );
  const addPart = useBuildStore((s) => s.addPart);

  // Fetch products when slugs change
  useEffect(() => {
    if (selectedSlugs.length < 2) {
      setProducts([]);
      return;
    }
    setLoading(true);
    api<CompareProduct[]>(`/products/compare?slugs=${selectedSlugs.join(',')}`)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
    setSearchParams({ slugs: selectedSlugs.join(',') });
  }, [selectedSlugs, setSearchParams]);

  // Search products
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api<{ items: SearchProduct[] }>(`/products?search=${encodeURIComponent(searchQuery)}&limit=5`)
        .then((d) => setSearchResults(d.items ?? []))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addProduct = (slug: string) => {
    if (selectedSlugs.length >= 4 || selectedSlugs.includes(slug)) return;
    setSelectedSlugs([...selectedSlugs, slug]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeProduct = (slug: string) => {
    setSelectedSlugs(selectedSlugs.filter((s) => s !== slug));
  };

  // Gather all unique spec keys across compared products
  const allSpecKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const p of products) {
      if (p.specs && typeof p.specs === 'object') {
        for (const key of Object.keys(p.specs)) {
          keys.add(key);
        }
      }
    }
    return Array.from(keys);
  }, [products]);

  // Compute average wouldBuyAgain percentage
  const wouldBuyAgainPct = (p: CompareProduct) => {
    if (!p.reviews || p.reviews.length === 0) return null;
    const yes = p.reviews.filter((r) => r.wouldBuyAgain).length;
    return Math.round((yes / p.reviews.length) * 100);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Compare Products</h1>
      <p className={styles.pageDesc}>Compare up to 4 products side-by-side to find the best gear for your rig.</p>

      {/* Product selector */}
      <div className={styles.selector}>
        {selectedSlugs.length < 4 && (
          <div className={styles.searchWrapper}>
            <input
              className={styles.searchInput}
              placeholder="Search for a product to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className={styles.searchDropdown}>
                {searchResults.map((p) => (
                  <button key={p.id} className={styles.searchResult} onClick={() => addProduct(p.slug)}>
                    <span className={styles.searchResultName}>{p.name}</span>
                    <span className={styles.searchResultMeta}>
                      {p.manufacturer} — {p.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && <p className={styles.emptyState}>Loading products…</p>}

      {/* Comparison table */}
      {products.length >= 2 && (
        <div className={styles.compareGrid} style={{ gridTemplateColumns: `200px repeat(${products.length}, 1fr)` }}>
          {/* Header row — product images & names */}
          <div className={styles.compareLabel} />
          {products.map((p) => (
            <div key={p.id} className={styles.compareHeader}>
              {p.images?.[0] && (
                <img src={resolveImageUrl(p.images[0])} alt={p.name} className={styles.productImage} />
              )}
              <a href={`/products/${p.slug}`} className={styles.compareProductName}>{p.name}</a>
              <span className={styles.compareProductMfr}>{p.manufacturer}</span>
              <button className={styles.removeBtn} onClick={() => removeProduct(p.slug)}>Remove</button>
            </div>
          ))}

          {/* Category row */}
          <div className={styles.compareLabel}>Category</div>
          {products.map((p) => (
            <div key={p.id} className={styles.compareCell}>
              {toDisplayLabel(p.category)}
            </div>
          ))}

          {/* Price row */}
          <div className={styles.compareLabel}>Latest Price</div>
          {products.map((p) => (
            <div key={p.id} className={styles.compareCellHighlight}>
              {p.latestPrice
                ? `${p.latestPrice.currency === 'GBP' ? '£' : p.latestPrice.currency === 'EUR' ? '€' : '$'}${p.latestPrice.price.toFixed(2)}`
                : '—'}
            </div>
          ))}

          {/* Rating row */}
          <div className={styles.compareLabel}>Rating</div>
          {products.map((p) => (
            <div key={p.id} className={styles.compareCell}>
              {p.avgRating != null ? `★ ${p.avgRating.toFixed(1)} (${p._count.reviews})` : 'No reviews'}
            </div>
          ))}

          {/* Would Buy Again row */}
          <div className={styles.compareLabel}>Would Buy Again</div>
          {products.map((p) => {
            const pct = wouldBuyAgainPct(p);
            return (
              <div key={p.id} className={styles.compareCell}>
                {pct != null ? `${pct}%` : '—'}
              </div>
            );
          })}

          {/* Build Count row */}
          <div className={styles.compareLabel}>Used in Builds</div>
          {products.map((p) => (
            <div key={p.id} className={styles.compareCell}>
              {p._count.buildParts}
            </div>
          ))}

          {/* Platforms row */}
          <div className={styles.compareLabel}>Platforms</div>
          {products.map((p) => (
            <div key={p.id} className={styles.compareCell}>
              {p.platforms.length > 0 ? p.platforms.join(', ') : '—'}
            </div>
          ))}

          {/* Weight row */}
          <div className={styles.compareLabel}>Weight</div>
          {products.map((p) => (
            <div key={p.id} className={styles.compareCell}>
              {p.weight ? `${p.weight} kg` : '—'}
            </div>
          ))}

          {/* Dimensions row */}
          <div className={styles.compareLabel}>Dimensions</div>
          {products.map((p) => {
            const d = p.dimensions;
            return (
              <div key={p.id} className={styles.compareCell}>
                {d && (d.length || d.width || d.height)
                  ? `${d.length ?? '?'} × ${d.width ?? '?'} × ${d.height ?? '?'} mm`
                  : '—'}
              </div>
            );
          })}

          {/* Dynamic spec rows */}
          {allSpecKeys.map((key) => (
            <div key={key} className={styles.compareRow}>
              <div className={styles.compareLabel}>{toDisplayLabel(key)}</div>
              {products.map((p) => (
                <div key={p.id} className={styles.compareCell}>
                  {p.specs && key in (p.specs as Record<string, unknown>)
                    ? formatSpecValue((p.specs as Record<string, unknown>)[key])
                    : '—'}
                </div>
              ))}
            </div>
          ))}

          {/* Action row */}
          <div className={styles.compareLabel} />
          {products.map((p) => (
            <div key={p.id} className={styles.compareCell}>
              <div className={styles.actionButtons}>
                <button
                  className={styles.viewProductBtn}
                  onClick={() => navigate(`/products/${p.slug}`)}
                >
                  View Product
                </button>
                <button
                  className={styles.addToBuildBtn}
                  onClick={() => {
                    const slot = p.category as CategorySlot;
                    const part: SelectedPart = {
                      id: p.id,
                      name: p.name,
                      thumbnail: p.images?.[0],
                      keySpec: '',
                      price: p.latestPrice?.price ?? 0,
                      rating: p.avgRating ?? undefined,
                      weight: p.weight ?? undefined,
                    };
                    addPart(slot, part);
                    showToast(`${p.name} added to build`, 'success');
                    navigate('/build');
                  }}
                >
                  Add to Build
                </button>
                <button
                  className={styles.priceAlertBtn}
                  onClick={() => navigate(`/products/${p.slug}`)}
                >
                  Set Price Alert
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSlugs.length < 2 && !loading && (
        <div className={styles.emptyState}>
          <p>Search and add at least 2 products to compare them side-by-side.</p>
        </div>
      )}
    </div>
  );
}

export default ProductComparePage;
