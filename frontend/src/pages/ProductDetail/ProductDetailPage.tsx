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
import { api, resolveImageUrl } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast/Toast';
import { CustomSelect } from '../../components/CustomSelect/CustomSelect';

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
  const { user } = useAuth();
  const { showToast } = useToast();

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

  // ── Reviews ────────────────────────────────────────────────────────────
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userReview, setUserReview] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(7);
  const [reviewPros, setReviewPros] = useState('');
  const [reviewCons, setReviewCons] = useState('');
  const [reviewWouldBuy, setReviewWouldBuy] = useState(true);
  const [reviewOwnership, setReviewOwnership] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    if (!product) return;
    api<{ items: any[] }>(`/reviews?productId=${product.id}`)
      .then((d) => setReviews(d.items ?? []))
      .catch(() => {});
  }, [product]);

  useEffect(() => {
    if (!user || !product) return;
    api<{ items: any[] }>(`/reviews?productId=${product.id}&userId=${user.userId}`)
      .then((d) => {
        const items = d.items ?? [];
        if (items.length > 0) setUserReview(items[0]);
      })
      .catch(() => {});
  }, [user, product]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewSubmitting || !product) return;
    setReviewSubmitting(true);
    try {
      const review = await api<any>('/reviews', {
        method: 'POST',
        body: {
          productId: product.id,
          ratingOverall: reviewRating,
          pros: reviewPros,
          cons: reviewCons,
          wouldBuyAgain: reviewWouldBuy,
          ownershipDuration: reviewOwnership || null,
        },
      });
      setUserReview(review);
      setShowReviewForm(false);
      setReviews((prev) => [review, ...prev]);
      showToast('Review submitted!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit review', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Q&A ────────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  useEffect(() => {
    if (!product) return;
    api<any[]>(`/qa/products/${product.id}/questions`)
      .then(setQuestions)
      .catch(() => {});
  }, [product]);

  const handleAskQuestion = async () => {
    if (!newQuestion.trim() || askingQuestion || !product) return;
    setAskingQuestion(true);
    try {
      const q = await api<any>(`/qa/products/${product.id}/questions`, {
        method: 'POST',
        body: { question: newQuestion.trim() },
      });
      setQuestions((prev) => [q, ...prev]);
      setNewQuestion('');
      showToast('Question posted!', 'success');
    } catch {
      showToast('Failed to post question', 'error');
    } finally {
      setAskingQuestion(false);
    }
  };

  const handlePostAnswer = async (questionId: string) => {
    if (!answerText.trim()) return;
    try {
      const answer = await api<any>(`/qa/questions/${questionId}/answers`, {
        method: 'POST',
        body: { body: answerText.trim() },
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, answers: [...q.answers, answer], _count: { answers: q._count.answers + 1 } }
            : q,
        ),
      );
      setAnsweringId(null);
      setAnswerText('');
      showToast('Answer posted!', 'success');
    } catch {
      showToast('Failed to post answer', 'error');
    }
  };

  const handleAcceptAnswer = async (questionId: string, answerId: string) => {
    try {
      await api(`/qa/answers/${answerId}/accept`, { method: 'PUT' });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, answers: q.answers.map((a: any) => ({ ...a, isAccepted: a.id === answerId })) }
            : q,
        ),
      );
    } catch {
      showToast('Failed to accept answer', 'error');
    }
  };

  // ── Price Alerts ──────────────────────────────────────────────────────
  const [priceAlert, setPriceAlert] = useState<any>(null);
  const [alertPrice, setAlertPrice] = useState('');
  const [showAlertForm, setShowAlertForm] = useState(false);

  useEffect(() => {
    if (!user || !product) return;
    api<{ alert: any }>(`/products/${product.slug}/price-alert`)
      .then((d) => setPriceAlert(d.alert))
      .catch(() => {});
  }, [user, product]);

  const handleSetAlert = async () => {
    if (!alertPrice || !product) return;
    try {
      const alert = await api<any>(`/products/${product.slug}/price-alert`, {
        method: 'POST',
        body: { targetPrice: parseFloat(alertPrice), currency: 'GBP' },
      });
      setPriceAlert(alert);
      setShowAlertForm(false);
      showToast('Price alert set!', 'success');
    } catch {
      showToast('Failed to set price alert', 'error');
    }
  };

  const handleRemoveAlert = async () => {
    if (!product) return;
    await api(`/products/${product.slug}/price-alert`, { method: 'DELETE' });
    setPriceAlert(null);
    showToast('Alert removed', 'success');
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

          <button
            type="button"
            className={styles.compareProductBtn}
            onClick={() => {
              navigate(`/products/compare?slugs=${product.slug}`);
            }}
          >
            Compare
          </button>

          {user && (
            <div className={styles.priceAlertSection}>
              {priceAlert ? (
                <div className={styles.alertActive}>
                  <span>Alert set: £{priceAlert.targetPrice}</span>
                  <button className={styles.removeAlertBtn} onClick={handleRemoveAlert}>Remove</button>
                </div>
              ) : showAlertForm ? (
                <div className={styles.alertForm}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={styles.alertInput}
                    placeholder="Alert me when below..."
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                  />
                  <button className={styles.setAlertBtn} onClick={handleSetAlert}>Set Alert</button>
                  <button className={styles.cancelAlertBtn} onClick={() => setShowAlertForm(false)}>Cancel</button>
                </div>
              ) : (
                <button className={styles.createAlertBtn} onClick={() => setShowAlertForm(true)}>
                  Set Price Alert
                </button>
              )}
            </div>
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

      {/* Write a Review */}
      <section className={styles.communitySection}>
        <h2 className={styles.sectionTitle}>Reviews</h2>

        {user && !userReview && (
          <button className={styles.writeReviewBtn} onClick={() => setShowReviewForm(!showReviewForm)}>
            Write a Review
          </button>
        )}

        {showReviewForm && (
          <form className={styles.reviewForm} onSubmit={handleSubmitReview}>
            <h3 className={styles.reviewFormTitle}>Your Review</h3>

            <div className={styles.ratingField}>
              <label className={styles.fieldLabel}>Overall Rating: {reviewRating}/10</label>
              <input
                type="range" min="1" max="10" step="1"
                value={reviewRating}
                onChange={(e) => setReviewRating(parseInt(e.target.value))}
                className={styles.ratingSlider}
              />
              <div className={styles.ratingScale}>
                <span>Poor</span><span>Average</span><span>Excellent</span>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>How long have you owned this?</label>
              <CustomSelect
                value={reviewOwnership}
                onChange={setReviewOwnership}
                placeholder="Select..."
                options={[
                  { value: 'less_than_month', label: 'Less than a month' },
                  { value: '1_3_months', label: '1-3 months' },
                  { value: '3_6_months', label: '3-6 months' },
                  { value: '6_12_months', label: '6-12 months' },
                  { value: '1_2_years', label: '1-2 years' },
                  { value: '2_plus_years', label: '2+ years' },
                ]}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Pros</label>
              <textarea
                className={styles.reviewTextarea}
                placeholder="What do you like about this product?"
                value={reviewPros}
                onChange={(e) => setReviewPros(e.target.value)}
                rows={3}
                required
                maxLength={2000}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Cons</label>
              <textarea
                className={styles.reviewTextarea}
                placeholder="What could be improved?"
                value={reviewCons}
                onChange={(e) => setReviewCons(e.target.value)}
                rows={3}
                required
                maxLength={2000}
              />
            </div>

            <label className={styles.checkboxField}>
              <input type="checkbox" checked={reviewWouldBuy} onChange={(e) => setReviewWouldBuy(e.target.checked)} />
              <span>I would buy this product again</span>
            </label>

            <div className={styles.reviewFormActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowReviewForm(false)}>Cancel</button>
              <button type="submit" className={styles.submitBtn} disabled={reviewSubmitting}>
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}

        {reviews.length > 0 && (
          <div className={styles.reviewList}>
            {reviews.map((r) => (
              <div key={r.id} className={styles.reviewCard}>
                <div className={styles.reviewCardHeader}>
                  <a href={`/profile/${r.user?.username}`} className={styles.reviewAuthor}>{r.user?.username}</a>
                  <span className={styles.reviewRatingBadge}>{r.ratingOverall}/10</span>
                  {r.ownershipDuration && (
                    <span className={styles.reviewOwnership}>Owned: {r.ownershipDuration.replace(/_/g, ' ')}</span>
                  )}
                  <span className={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div className={styles.reviewProsCons}>
                  <div className={styles.reviewPros}>
                    <h5>Pros</h5>
                    <p>{r.pros}</p>
                  </div>
                  <div className={styles.reviewCons}>
                    <h5>Cons</h5>
                    <p>{r.cons}</p>
                  </div>
                </div>
                <div className={styles.reviewCardFooter}>
                  {r.wouldBuyAgain ? (
                    <span className={styles.wouldBuyYes}>Would buy again</span>
                  ) : (
                    <span className={styles.wouldBuyNo}>Would not buy again</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Questions & Answers */}
      <section className={styles.qaSection}>
        <h2 className={styles.sectionTitle}>Questions &amp; Answers ({questions.length})</h2>

        {user && (
          <div className={styles.askQuestionRow}>
            <input
              className={styles.questionInput}
              placeholder="Have a question about this product?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              maxLength={500}
            />
            <button
              className={styles.askBtn}
              onClick={handleAskQuestion}
              disabled={!newQuestion.trim() || askingQuestion}
            >
              Ask
            </button>
          </div>
        )}

        <div className={styles.questionList}>
          {questions.map((q) => (
            <div key={q.id} className={styles.questionCard}>
              <div className={styles.questionHeader}>
                <span className={styles.questionLabel}>Q</span>
                <p className={styles.questionText}>{q.question}</p>
              </div>
              <div className={styles.questionMeta}>
                <a href={`/profile/${q.user.username}`}>{q.user.username}</a>
                <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                <span>{q._count.answers} answer{q._count.answers !== 1 ? 's' : ''}</span>
              </div>

              {q.answers.map((a: any) => (
                <div key={a.id} className={`${styles.answerCard} ${a.isAccepted ? styles.answerAccepted : ''}`}>
                  <div className={styles.answerHeader}>
                    <span className={styles.answerLabel}>A</span>
                    {a.isAccepted && <span className={styles.acceptedBadge}>Accepted</span>}
                  </div>
                  <p className={styles.answerText}>{a.body}</p>
                  <div className={styles.answerMeta}>
                    <a href={`/profile/${a.user.username}`}>{a.user.username}</a>
                    <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    {user && q.userId === user.userId && !a.isAccepted && (
                      <button
                        className={styles.acceptAnswerBtn}
                        onClick={() => handleAcceptAnswer(q.id, a.id)}
                      >
                        Accept Answer
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {user && answeringId !== q.id && (
                <button className={styles.answerBtn} onClick={() => { setAnsweringId(q.id); setAnswerText(''); }}>
                  Answer this question
                </button>
              )}
              {answeringId === q.id && (
                <div className={styles.answerForm}>
                  <textarea
                    className={styles.answerTextarea}
                    placeholder="Write your answer..."
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    rows={3}
                    maxLength={2000}
                  />
                  <div className={styles.answerFormActions}>
                    <button className={styles.cancelBtn} onClick={() => setAnsweringId(null)}>Cancel</button>
                    <button className={styles.submitBtn} onClick={() => handlePostAnswer(q.id)}>Post Answer</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ProductDetailPage;
