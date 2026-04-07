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
import type { Platform } from '../../types/product';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AffiliateEntry {
  retailer: string;
  url: string;
  price: number;
  inStock: boolean;
}

interface DemoProduct {
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
  platforms: Platform[];
  keySpec: string;
  productInput?: ProductInput;
}

// ---------------------------------------------------------------------------
// Demo data (replace with API when available)
// ---------------------------------------------------------------------------

const DEMO_PRODUCTS: Record<string, DemoProduct> = {
  'fanatec-csl-dd-8nm': {
    id: 'w1',
    name: 'Fanatec CSL DD (8 Nm)',
    slug: 'fanatec-csl-dd-8nm',
    manufacturer: 'Fanatec',
    category: 'WHEELBASE',
    keySpec: '8Nm Direct Drive',
    avgRating: 4.4,
    reviewCount: 342,
    weight: 2.7,
    platforms: ['PC', 'PLAYSTATION', 'XBOX'],
    images: [
      '/images/products/fanatec-csl-dd-1.webp',
      '/images/products/fanatec-csl-dd-2.webp',
      '/images/products/fanatec-csl-dd-3.webp',
    ],
    specs: {
      'Drive Type': 'Direct Drive',
      'Peak Torque': '8 Nm',
      'Rotation Range': '1080°',
      'Quick Release': 'Fanatec QR1 / QR2',
      Connectivity: 'USB',
      'PSU Included': true,
      'Mounting Pattern': 'Front Clamp',
      Weight: '2.7 kg',
      'Max Rotation Speed': '180°/s',
      'Encoder Resolution': '16-bit',
      Platform: 'PC / PS / Xbox',
    },
    affiliateLinks: [
      { retailer: 'Fanatec Direct', url: 'https://fanatec.com/csl-dd', price: 349.95, inStock: true },
      { retailer: 'Amazon', url: 'https://amazon.com/dp/B09EXAMPLE', price: 379.99, inStock: true },
      { retailer: 'SimRacingBay', url: 'https://simracingbay.com/csl-dd', price: 359.00, inStock: false },
    ],
    productInput: {
      id: 'w1',
      category: 'WHEELBASE',
      specs: {
        driveType: 'direct_drive',
        peakTorque: 8,
        rotationRange: 1080,
        qrType: 'fanatec_qr1',
        connectivity: ['usb'],
        psuIncluded: true,
        mountingPattern: 'front_clamp',
      } as ProductInput['specs'],
      platforms: ['PC', 'PLAYSTATION', 'XBOX'],
    },
  },
  'heusinkveld-sprint-pedals': {
    id: 'p1',
    name: 'Heusinkveld Sprint Pedals',
    slug: 'heusinkveld-sprint-pedals',
    manufacturer: 'Heusinkveld',
    category: 'PEDALS',
    keySpec: 'Load Cell / 90kg',
    avgRating: 4.8,
    reviewCount: 218,
    weight: 4.5,
    platforms: ['PC'],
    images: [
      '/images/products/heusinkveld-sprint-1.webp',
      '/images/products/heusinkveld-sprint-2.webp',
    ],
    specs: {
      'Pedal Count': 3,
      'Brake Type': 'Load Cell',
      'Max Brake Force': '90 kg',
      'Throttle Type': 'Hall Sensor',
      'Clutch Type': 'Hall Sensor',
      Connectivity: 'USB',
      'Mounting Pattern': 'Hard Mount',
      'Pedal Plate Depth': '280 mm',
      Material: 'Steel / Aluminium',
      Weight: '4.5 kg',
    },
    affiliateLinks: [
      { retailer: 'Heusinkveld', url: 'https://heusinkveld.com/sprint', price: 599, inStock: true },
      { retailer: 'Digital-Motorsports', url: 'https://digital-motorsports.com/heu-sprint', price: 619, inStock: true },
      { retailer: 'SimRacingBay', url: 'https://simracingbay.com/sprint', price: 599, inStock: true },
    ],
    productInput: {
      id: 'p1',
      category: 'PEDALS',
      specs: {
        pedalCount: 3,
        brakeType: 'load_cell',
        maxBrakeForce: 90,
        throttleType: 'hall sensor',
        clutchType: 'hall sensor',
        mountingPattern: 'hard_mount',
        connectivity: ['usb'],
        pedalPlateDepth: 280,
      } as ProductInput['specs'],
      platforms: ['PC'],
    },
  },
  'simlab-gt1-evo': {
    id: 'c3',
    name: 'SimLab GT1 Evo',
    slug: 'simlab-gt1-evo',
    manufacturer: 'SimLab',
    category: 'COCKPIT',
    keySpec: 'Aluminium Profile',
    avgRating: 4.7,
    reviewCount: 189,
    weight: 22,
    platforms: [],
    images: [
      '/images/products/simlab-gt1-1.webp',
      '/images/products/simlab-gt1-2.webp',
    ],
    specs: {
      Material: 'Aluminium',
      'Profile Size': '40×80 mm',
      'Max Wheelbase Weight': '30 kg',
      'Wheelbase Mounting': '4-bolt 66mm / 100mm / Front Clamp / Universal',
      'Pedal Mounting': 'Hard Mount / Bolt-Through / Universal',
      'Pedal Tray Depth': '380 mm',
      'Frame Width': '540 mm',
      'Seat Compatibility': 'Side Mount / Bottom Mount',
      'Weight Capacity': '160 kg',
      'Is Folding': false,
      'Seat Included': false,
      Weight: '22 kg',
    },
    affiliateLinks: [
      { retailer: 'Sim-Lab', url: 'https://sim-lab.eu/gt1-evo', price: 549, inStock: true },
      { retailer: 'Digital-Motorsports', url: 'https://digital-motorsports.com/gt1-evo', price: 579, inStock: false },
    ],
    productInput: {
      id: 'c3',
      category: 'COCKPIT',
      specs: {
        material: 'aluminium',
        profileSize: '40x80',
        maxWheelbaseWeight: 30,
        wheelbaseMounting: ['4_bolt_66mm', '4_bolt_100mm', 'front_clamp', 'universal_slotted'],
        pedalMounting: ['hard_mount', 'bolt_through', 'universal_slotted'],
        pedalTrayDepth: 380,
        frameWidth: 540,
        seatCompatibility: ['side_mount', 'bottom_mount'],
        isFolding: false,
        seatIncluded: false,
        weightCapacity: 160,
      } as ProductInput['specs'],
      platforms: [],
    },
  },
  'fanatec-mclaren-gt3-v2': {
    id: 'r1',
    name: 'Fanatec McLaren GT3 V2',
    slug: 'fanatec-mclaren-gt3-v2',
    manufacturer: 'Fanatec',
    category: 'WHEEL_RIM',
    keySpec: '300mm / Forged Carbon',
    avgRating: 4.5,
    reviewCount: 412,
    weight: 0.95,
    platforms: ['PC', 'PLAYSTATION', 'XBOX'],
    images: [
      '/images/products/fanatec-mclaren-1.webp',
      '/images/products/fanatec-mclaren-2.webp',
      '/images/products/fanatec-mclaren-3.webp',
    ],
    specs: {
      Diameter: '300 mm',
      'Button Count': 12,
      'Paddle Type': 'Magnetic',
      'Has Display': false,
      'QR Compatibility': 'Fanatec QR1 / QR2',
      Material: 'Forged Carbon',
      Weight: '0.95 kg',
      'Shifter Paddles': 'Dual / Magnetic',
      'Rotary Encoders': 2,
      'Thumb Wheels': 1,
    },
    affiliateLinks: [
      { retailer: 'Fanatec Direct', url: 'https://fanatec.com/mclaren-gt3-v2', price: 229.95, inStock: true },
      { retailer: 'Amazon', url: 'https://amazon.com/dp/B09MCLA2', price: 249.99, inStock: true },
    ],
    productInput: {
      id: 'r1',
      category: 'WHEEL_RIM',
      specs: {
        diameter: 300,
        buttonCount: 12,
        paddleType: 'magnetic',
        hasDisplay: false,
        qrCompatibility: ['fanatec_qr1', 'fanatec_qr2'],
        weight: 0.95,
        material: 'forged carbon',
      } as ProductInput['specs'],
      platforms: ['PC', 'PLAYSTATION', 'XBOX'],
    },
  },
};

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
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75 ? 1 : 0;
  const fullChar = full + (rating - full >= 0.75 ? 1 : 0);
  return '★'.repeat(fullChar) + (half ? '½' : '') + '☆'.repeat(5 - fullChar - half);
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

  const product = slug ? DEMO_PRODUCTS[slug] : undefined;

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
