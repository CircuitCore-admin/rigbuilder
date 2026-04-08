// ============================================================================
// ProductDetailPage — Full product detail for sim racing equipment
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import styles from './ProductDetailPage.module.scss';
import { useBuildStore } from '../../stores/buildStore';
import type { CategorySlot, SelectedPart } from '../../stores/buildStore';
import { PriceHistoryChart } from '../../components/PriceHistoryChart/PriceHistoryChart';
import type { ProductInput } from '../../types/productSpecs';
import { api } from '../../utils/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AffiliateEntry {
  retailer: string;
  url: string;
  price: number;
  inStock?: boolean;
}

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  manufacturer: string;
  category: string;
  specs: Record<string, unknown>;
  weight?: number | null;
  platforms: string[];
  affiliateLinks?: AffiliateEntry[] | null;
  images: string[];
  avgRating?: number | null;
  reviewCount?: number;
}

interface DisplayProduct {
  id: string;
  name: string;
  slug: string;
  manufacturer: string;
  category: string;
  specs: Record<string, string | number | boolean>;
  images: string[];
  affiliateLinks: AffiliateEntry[];
  avgRating: number;
  reviewCount: number;
  weight: number;
  platforms: string[];
  keySpec: string;
  productInput?: ProductInput;
}

// ---------------------------------------------------------------------------
// API response → display product mapper
// ---------------------------------------------------------------------------

/** Convert camelCase/snake_case to Title Case display label. */
function toDisplayLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Format spec values for human-readable display. */
function formatSpecForDisplay(value: unknown): string | number | boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) return value.map((v) => toDisplayLabel(String(v))).join(' / ');
  return toDisplayLabel(String(value));
}

/** Derive a human-readable key spec string from category-specific specs. */
function deriveKeySpec(category: string, specs: Record<string, unknown>): string {
  switch (category) {
    case 'WHEELBASE': {
      const torque = specs.peakTorque ?? '';
      const drive = String(specs.driveType ?? '').replace(/_/g, ' ');
      return `${torque}Nm ${drive.charAt(0).toUpperCase() + drive.slice(1)}`.trim();
    }
    case 'WHEEL_RIM': {
      const dia = specs.diameter ?? '';
      const mat = specs.material ?? '';
      return `${dia}mm / ${mat}`.trim();
    }
    case 'PEDALS': {
      const brake = String(specs.brakeType ?? '').replace(/_/g, ' ');
      const force = specs.maxBrakeForce ? ` / ${specs.maxBrakeForce}kg` : '';
      return `${brake.charAt(0).toUpperCase() + brake.slice(1)}${force}`.trim();
    }
    case 'COCKPIT': {
      const mat = String(specs.material ?? '');
      return mat.charAt(0).toUpperCase() + mat.slice(1);
    }
    case 'DISPLAY': {
      const size = specs.screenSize ? `${specs.screenSize}"` : '';
      const res = specs.resolution ?? '';
      const hz = specs.refreshRate ? `${specs.refreshRate}Hz` : '';
      return [size, res, hz].filter(Boolean).join(' ');
    }
    default:
      return String(specs.type ?? specs.subCategory ?? '');
  }
}

/** Convert API product to display format. */
function toDisplayProduct(p: ApiProduct): DisplayProduct {
  const displaySpecs: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(p.specs)) {
    displaySpecs[toDisplayLabel(key)] = formatSpecForDisplay(value);
  }

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    manufacturer: p.manufacturer,
    category: p.category,
    specs: displaySpecs,
    images: p.images,
    affiliateLinks: (p.affiliateLinks ?? []).map((l) => ({
      ...l,
      inStock: l.inStock ?? true,
    })),
    avgRating: p.avgRating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    weight: p.weight ?? 0,
    platforms: p.platforms,
    keySpec: deriveKeySpec(p.category, p.specs),
    productInput: {
      id: p.id,
      category: p.category as ProductInput['category'],
      specs: p.specs as ProductInput['specs'],
      platforms: p.platforms as ProductInput['platforms'],
    },
  };
}

// ---------------------------------------------------------------------------
// Placeholder build cards for community section
// ---------------------------------------------------------------------------

const FEATURED_BUILDS = [
  { title: 'Budget GT Rig', user: '@simracer42', price: '$1,450' },
  { title: 'Pro Formula Setup', user: '@f1fanatic', price: '$4,200' },
  { title: 'Compact Rally Station', user: '@dirtking', price: '$2,100' },
  { title: 'Endurance Rig', user: '@lemans24h', price: '$3,800' },
];

// Simulated rating distribution (percentage per star level)
const RATING_DISTRIBUTION = [
  { stars: 5, pct: 58 },
  { stars: 4, pct: 24 },
  { stars: 3, pct: 10 },
  { stars: 2, pct: 5 },
  { stars: 1, pct: 3 },
];

// ---------------------------------------------------------------------------
// Valid slots
// ---------------------------------------------------------------------------

const VALID_SLOTS = new Set<string>([
  'COCKPIT', 'WHEELBASE', 'WHEEL_RIM', 'PEDALS',
  'SHIFTER', 'DISPLAY', 'SEAT', 'EXTRAS',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderStars(rating: number): string {
  const fractional = rating - Math.floor(rating);
  const hasHalfStar = fractional >= 0.25 && fractional < 0.75;
  const filledStars = Math.floor(rating) + (fractional >= 0.75 ? 1 : 0);
  const emptyStars = 5 - filledStars - (hasHalfStar ? 1 : 0);
  return '★'.repeat(filledStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(emptyStars);
}

function formatSpecValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addPart = useBuildStore((s) => s.addPart);

  const slotParam = searchParams.get('slot')?.toUpperCase() ?? null;
  const slot: CategorySlot | null =
    slotParam && VALID_SLOTS.has(slotParam) ? (slotParam as CategorySlot) : null;

  // ── Fetch product from API by slug ────────────────────────────────────
  const [product, setProduct] = useState<DisplayProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }

    let cancelled = false;
    setLoading(true);

    api<ApiProduct>(`/products/slug/${slug}`)
      .then((data) => {
        if (!cancelled) setProduct(toDisplayProduct(data));
      })
      .catch((err) => {
        console.error('Failed to load product', slug, err);
        if (!cancelled) setProduct(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Lowest price from affiliate links
  const lowestPrice = useMemo(() => {
    if (!product || product.affiliateLinks.length === 0) return null;
    return Math.min(...product.affiliateLinks.map((l) => l.price));
  }, [product]);

  // JSON-LD structured data
  const jsonLd = useMemo(() => {
    if (!product) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      brand: { '@type': 'Brand', name: product.manufacturer },
      image: product.images[0] ?? '',
      description: `${product.name} — ${product.keySpec}`,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.avgRating,
        reviewCount: product.reviewCount,
      },
      offers: product.affiliateLinks.map((link) => ({
        '@type': 'Offer',
        url: link.url,
        priceCurrency: 'USD',
        price: link.price,
        availability: link.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: link.retailer },
      })),
    };
  }, [product]);

  // Dynamic document title
  useEffect(() => {
    if (product) {
      document.title = `${product.name} — ${product.manufacturer} | RigBuilder`;
    } else {
      document.title = 'Product Not Found | RigBuilder';
    }
    return () => {
      document.title = 'RigBuilder';
    };
  }, [product]);

  // --- Add to Build handler ---
  const handleAddToBuild = () => {
    if (!product || !slot) return;

    const part: SelectedPart = {
      id: product.id,
      name: product.name,
      thumbnail: product.images[0],
      keySpec: product.keySpec,
      price: lowestPrice ?? product.affiliateLinks[0]?.price ?? 0,
      rating: product.avgRating,
      weight: product.weight,
      productInput: product.productInput,
    };

    addPart(slot, part);
    navigate('/build');
  };

  // --- Not found ---
  if (loading) {
    return (
      <div className={styles.page}>
        <p>Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.page}>
        <div className={styles.breadcrumbs}>
          <Link to="/build" className={styles.breadcrumbLink}>← Back to Build</Link>
        </div>
        <h1 className={styles.productName}>Product not found</h1>
        <p>No product matches the slug &ldquo;{slug}&rdquo;.</p>
      </div>
    );
  }

  const specEntries = Object.entries(product.specs);
  const primaryImage = product.images[activeImageIdx] ?? '/images/placeholder-product.webp';

  return (
    <div className={styles.page}>
      {/* JSON-LD */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs}>
        {slot && (
          <>
            <Link
              to={`/build?select=${slot.toLowerCase()}`}
              className={styles.breadcrumbLink}
            >
              ← Back to Selection
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
          </>
        )}
        <Link to="/build" className={styles.breadcrumbLink}>
          ← Back to Build
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{product.name}</span>
      </nav>

      {/* Hero: Gallery + Info */}
      <section className={styles.hero}>
        <div className={styles.gallery}>
          <img
            className={styles.primaryImage}
            src={primaryImage}
            alt={product.name}
          />
          {product.images.length > 1 && (
            <div className={styles.thumbnailStrip}>
              {product.images.map((src, idx) => (
                <img
                  key={src}
                  className={`${styles.thumbnail} ${idx === activeImageIdx ? styles.thumbnailActive : ''}`}
                  src={src}
                  alt={`${product.name} view ${idx + 1}`}
                  onClick={() => setActiveImageIdx(idx)}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.info}>
          <span className={styles.manufacturer}>{product.manufacturer}</span>
          <h1 className={styles.productName}>{product.name}</h1>

          <div className={styles.ratingRow}>
            <span className={styles.stars}>{renderStars(product.avgRating)}</span>
            <span className={styles.ratingText}>
              {product.avgRating.toFixed(1)} ({product.reviewCount} reviews)
            </span>
          </div>

          {lowestPrice !== null && (
            <div className={styles.lowestPrice}>
              <span className={styles.priceLabel}>From</span>
              <span className={styles.priceValue}>
                ${lowestPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <span className={styles.keySpec}>{product.keySpec}</span>

          {product.platforms.length > 0 && (
            <div className={styles.platforms}>
              {product.platforms.map((p) => (
                <span key={p} className={styles.platformBadge}>{p}</span>
              ))}
            </div>
          )}

          <button
            type="button"
            className={`${styles.addBtn} ${!slot ? styles.addBtnDisabled : ''}`}
            onClick={handleAddToBuild}
            disabled={!slot}
            title={!slot ? 'Open this product from the Build page to add it' : undefined}
          >
            Add to Build
          </button>
          {!slot && (
            <span className={styles.tooltip}>Open from Build page to add to your rig</span>
          )}
        </div>
      </section>

      {/* Technical Spec Sheet */}
      <section className={styles.specSection}>
        <h2 className={styles.sectionTitle}>Technical Specifications</h2>
        <div className={styles.specGrid}>
          {specEntries.map(([key, value]) => (
            <div key={key} className={styles.specRow}>
              <span className={styles.specKey}>{key}</span>
              <span className={styles.specValue}>{formatSpecValue(value)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing & Sellers */}
      <section className={styles.sellerSection}>
        <h2 className={styles.sectionTitle}>Pricing &amp; Sellers</h2>
        <table className={styles.sellerTable}>
          <thead>
            <tr>
              <th>Retailer</th>
              <th>Price</th>
              <th>Availability</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {product.affiliateLinks.map((link) => (
              <tr key={link.retailer}>
                <td className={styles.retailerName}>{link.retailer}</td>
                <td className={styles.sellerPrice}>
                  ${link.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <span className={link.inStock ? styles.inStock : styles.outOfStock}>
                    {link.inStock ? '● In Stock' : '○ Out of Stock'}
                  </span>
                </td>
                <td>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.buyLink}
                  >
                    Buy Now →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Price History */}
      <section className={styles.priceHistorySection}>
        <h2 className={styles.sectionTitle}>Price History</h2>
        <PriceHistoryChart productId={product.id} productName={product.name} />
      </section>

      {/* Community & Social Proof */}
      <section className={styles.communitySection}>
        <h2 className={styles.sectionTitle}>Featured in Builds</h2>
        <div className={styles.buildGrid}>
          {FEATURED_BUILDS.map((build) => (
            <div key={build.title} className={styles.buildCard}>
              <span className={styles.buildCardTitle}>{build.title}</span>
              <span className={styles.buildCardUser}>{build.user}</span>
              <span className={styles.buildCardPrice}>{build.price}</span>
            </div>
          ))}
        </div>

        <h2 className={styles.sectionTitle}>Review Summary</h2>
        <div className={styles.reviewSummary}>
          <div>
            <div className={styles.reviewScore}>{product.avgRating.toFixed(1)}</div>
            <div className={styles.reviewStars}>{renderStars(product.avgRating)}</div>
            <div className={styles.reviewCount}>{product.reviewCount} reviews</div>
          </div>
          <div className={styles.ratingBars}>
            {RATING_DISTRIBUTION.map((row) => (
              <div key={row.stars} className={styles.ratingBarRow}>
                <span className={styles.ratingBarLabel}>{row.stars}★</span>
                <div className={styles.ratingBarTrack}>
                  <div
                    className={styles.ratingBarFill}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <span className={styles.ratingBarCount}>{row.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProductDetailPage;
