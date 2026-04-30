import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, resolveImageUrl } from '../../utils/api';
import styles from './CategoryLandingPage.module.scss';

// ---------------------------------------------------------------------------
// Category metadata (SEO + descriptions)
// ---------------------------------------------------------------------------

const CATEGORY_INFO: Record<string, { title: string; description: string; seoDesc: string }> = {
  WHEELBASE: {
    title: 'Wheel Bases',
    description: 'The heart of your sim racing setup. From belt-driven entry-level to high-torque direct drive units.',
    seoDesc: 'Compare and find the best sim racing wheel bases. Direct drive, belt drive, and gear drive options from Fanatec, Moza, Simucube, and more.',
  },
  WHEEL_RIM: {
    title: 'Wheel Rims',
    description: 'Round, D-shape, GT, Formula — find the right rim for your driving style.',
    seoDesc: 'Browse the best sim racing wheel rims. GT, formula, and drift wheels from Fanatec, Cube Controls, Ascher Racing, and more.',
  },
  PEDALS: {
    title: 'Pedals',
    description: 'Load cell, hydraulic, and potentiometer pedals for every budget and driving style.',
    seoDesc: 'Find the best sim racing pedals. Load cell, hydraulic, and potentiometer options from Heusinkveld, Fanatec, Moza, and more.',
  },
  COCKPIT: {
    title: 'Cockpits & Rigs',
    description: 'Aluminium profile rigs, folding cockpits, and full motion platforms to anchor your setup.',
    seoDesc: 'Find the best sim racing cockpits and rigs. Aluminium profile, steel, and folding options from Trak Racer, Sim-Lab, and more.',
  },
  SEAT: {
    title: 'Seats',
    description: 'Bucket seats, GT-style seats, and OEM options for maximum comfort during long stints.',
    seoDesc: 'Compare sim racing seats. Bucket, GT-style, and OEM seats from Sparco, NRG, and more for your sim rig.',
  },
  SHIFTER: {
    title: 'Shifters',
    description: 'Sequential, H-pattern, and dual-mode shifters to complete your transmission feel.',
    seoDesc: 'Find the best sim racing shifters. Sequential, H-pattern, and dual-mode options from Fanatec, Thrustmaster, and more.',
  },
  DISPLAY: {
    title: 'Displays',
    description: 'Monitors, ultra-wides, triples, and VR headsets for immersive racing visuals.',
    seoDesc: 'Compare sim racing displays. Ultra-wide monitors, triple screen setups, and VR headsets for the ultimate racing experience.',
  },
  EXTRAS: {
    title: 'Accessories',
    description: 'Button boxes, handbrakes, wind simulators, and everything else to elevate your rig.',
    seoDesc: 'Browse sim racing accessories. Button boxes, handbrakes, bass shakers, and more to enhance your setup.',
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryProduct {
  id: string;
  name: string;
  slug: string;
  manufacturer: string;
  avgRating: number | null;
  reviewCount: number;
  images: string[];
  affiliateLinks: any;
}

interface CategoryReview {
  id: string;
  ratingOverall: number;
  pros: string;
  cons: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
  product: { id: string; name: string; slug: string };
}

interface CategoryThread {
  id: string;
  title: string;
  slug: string;
  replyCount: number;
  viewCount: number;
  category: string;
  createdAt: string;
  user: { id: string; username: string };
}

interface CategoryListing {
  id: string;
  title: string;
  price: string | null;
  imageUrls: string[];
  createdAt: string;
  user: { id: string; username: string };
}

interface CategoryGuide {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
}

interface CategoryData {
  category: string;
  stats: { productCount: number; avgPrice: number | null };
  topProducts: CategoryProduct[];
  recentReviews: CategoryReview[];
  relatedThreads: CategoryThread[];
  activeListings: CategoryListing[];
  relatedGuides: CategoryGuide[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CategoryLandingPage() {
  const { category: categoryParam } = useParams<{ category: string }>();
  const category = (categoryParam ?? '').toUpperCase();
  const info = CATEGORY_INFO[category];

  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!info) {
      setError('Category not found');
      setLoading(false);
      return;
    }

    document.title = `${info.title} — RigBuilder`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', info.seoDesc);

    setLoading(true);
    setError(null);
    api<CategoryData>(`/landing/${category.toLowerCase()}`)
      .then(setData)
      .catch(() => setError('Failed to load category data'))
      .finally(() => setLoading(false));
  }, [category, info]);

  if (!info) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <h1>Category Not Found</h1>
          <p>The category you&apos;re looking for doesn&apos;t exist.</p>
          <Link to="/" className={styles.ctaButton}>Back to Home</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading {info.title}…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <h1>{info.title}</h1>
          <p>{error ?? 'Something went wrong.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>{info.title}</h1>
          <p className={styles.heroDesc}>{info.description}</p>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>{data.stats.productCount}</span>
              <span className={styles.heroStatLabel}>Products</span>
            </div>
            {data.stats.avgPrice != null ? (
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>£{Math.round(data.stats.avgPrice)}</span>
                <span className={styles.heroStatLabel}>Avg. Price</span>
              </div>
            ) : (
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>—</span>
                <span className={styles.heroStatLabel}>Avg. Price</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Top Rated Products */}
      {data.topProducts.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Top Rated {info.title}</h2>
            </div>
            <div className={styles.productScroll}>
              {data.topProducts.map((p) => (
                <Link to={`/products/${p.slug}`} key={p.id} className={styles.productCard}>
                  <div className={styles.productImage}>
                    {p.images[0] ? (
                      <img src={resolveImageUrl(p.images[0])} alt={p.name} loading="lazy" decoding="async" />
                    ) : (
                      <div className={styles.productPlaceholder}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" /></svg>
                      </div>
                    )}
                  </div>
                  <div className={styles.productBody}>
                    <span className={styles.productManufacturer}>{p.manufacturer}</span>
                    <h3 className={styles.productName}>{p.name}</h3>
                    <div className={styles.productMeta}>
                      {p.avgRating != null && (
                        <span className={styles.productRating}>★ {p.avgRating.toFixed(1)}</span>
                      )}
                      <span className={styles.productReviews}>{p.reviewCount} reviews</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Buying Guides */}
      {data.relatedGuides.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Buying Guides</h2>
              <Link to="/guides" className={styles.viewAll}>View All →</Link>
            </div>
            <div className={styles.guidesGrid}>
              {data.relatedGuides.map((g) => (
                <Link to={`/guides/${g.slug}`} key={g.id} className={styles.guideCard}>
                  {g.coverImage && (
                    <div className={styles.guideImage}>
                      <img src={resolveImageUrl(g.coverImage)} alt="" loading="lazy" decoding="async" />
                    </div>
                  )}
                  <div className={styles.guideBody}>
                    <h3 className={styles.guideTitle}>{g.title}</h3>
                    {g.excerpt && <p className={styles.guideExcerpt}>{g.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Community Discussions */}
      {data.relatedThreads.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Community Discussions</h2>
              <Link to="/community" className={styles.viewAll}>View All →</Link>
            </div>
            <div className={styles.threadList}>
              {data.relatedThreads.map((t) => (
                <Link to={`/community/${t.slug}`} key={t.id} className={styles.threadCard}>
                  <h3 className={styles.threadTitle}>{t.title}</h3>
                  <div className={styles.threadMeta}>
                    <span>{t.user.username}</span>
                    <span className={styles.metaDot}>·</span>
                    <span>{t.replyCount} replies</span>
                    <span className={styles.metaDot}>·</span>
                    <span>{t.viewCount} views</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Marketplace */}
      {data.activeListings.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Marketplace</h2>
              <Link to="/marketplace" className={styles.viewAll}>View All →</Link>
            </div>
            <div className={styles.listingsGrid}>
              {data.activeListings.map((l) => (
                <Link to={`/marketplace/${l.id}`} key={l.id} className={styles.listingCard}>
                  <div className={styles.listingImage}>
                    {l.imageUrls[0] ? (
                      <img src={resolveImageUrl(l.imageUrls[0])} alt={l.title} loading="lazy" decoding="async" />
                    ) : (
                      <div className={styles.productPlaceholder}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" /></svg>
                      </div>
                    )}
                  </div>
                  <div className={styles.listingBody}>
                    <h3 className={styles.listingTitle}>{l.title}</h3>
                    {l.price && <span className={styles.listingPrice}>£{Number(l.price).toLocaleString('en-GB')}</span>}
                    <span className={styles.listingSeller}>by {l.user.username}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Reviews */}
      {data.recentReviews.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Reviews</h2>
            </div>
            <div className={styles.reviewList}>
              {data.recentReviews.map((r) => (
                <Link to={`/products/${r.product.slug}`} key={r.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.reviewRating}>★ {r.ratingOverall.toFixed(1)}</span>
                    <span className={styles.reviewProduct}>{r.product.name}</span>
                  </div>
                  <p className={styles.reviewPros}>{r.pros}</p>
                  <div className={styles.reviewMeta}>
                    <span>{r.user.username}</span>
                    <span className={styles.metaDot}>·</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.ctaTitle}>Build your rig with {info.title.toLowerCase()} →</h2>
          <p className={styles.ctaDesc}>Use our configurator to find the perfect {info.title.toLowerCase()} for your setup.</p>
          <Link to="/build" className={styles.ctaButton}>Open Rig Builder</Link>
        </div>
      </section>
    </div>
  );
}

export default CategoryLandingPage;
