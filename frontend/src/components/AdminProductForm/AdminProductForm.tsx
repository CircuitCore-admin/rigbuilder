import { useState, useEffect, useCallback } from 'react';
import styles from './AdminProductForm.module.scss';
import { api, ApiError } from '../../utils/api';
import type { Product, ProductCategory, AffiliateLink, SpecFieldMeta } from '../../types/product';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'COCKPIT', label: 'Cockpit / Frame' },
  { value: 'WHEELBASE', label: 'Wheelbase' },
  { value: 'WHEEL_RIM', label: 'Wheel Rim' },
  { value: 'PEDALS', label: 'Pedals' },
  { value: 'SHIFTER', label: 'Shifter' },
  { value: 'DISPLAY', label: 'Display' },
  { value: 'SEAT', label: 'Seat' },
  { value: 'EXTRAS', label: 'Extras' },
];

const PLATFORMS = ['PC', 'PLAYSTATION', 'XBOX'] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AdminProductFormProps {
  /** If provided, form is in edit mode. */
  product?: Product | null;
  /** Called after successful save. */
  onSaved: () => void;
  /** Called when form is dismissed. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Slide-over panel form for creating/editing products.
 *
 * Key behaviour: when the Category select changes, the component fetches
 * the spec field metadata from `/api/v1/products/spec-fields/:category`
 * and dynamically renders the correct inputs for that category.
 */
export function AdminProductForm({ product, onSaved, onClose }: AdminProductFormProps) {
  const isEdit = !!product;

  // ── Base fields ─────────────────────────────────────────────────────────
  const [name, setName] = useState(product?.name ?? '');
  const [manufacturer, setManufacturer] = useState(product?.manufacturer ?? '');
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? 'WHEELBASE');
  const [releaseYear, setReleaseYear] = useState<string>(product?.releaseYear?.toString() ?? '');
  const [weight, setWeight] = useState<string>(product?.weight?.toString() ?? '');
  const [platforms, setPlatforms] = useState<string[]>(product?.platforms ?? []);
  const [images, setImages] = useState<string>(product?.images?.join('\n') ?? '');

  // ── Dynamic spec fields ─────────────────────────────────────────────────
  const [specFields, setSpecFields] = useState<SpecFieldMeta[]>([]);
  const [specValues, setSpecValues] = useState<Record<string, unknown>>(
    (product?.specs as Record<string, unknown>) ?? {},
  );

  // ── Affiliate links ─────────────────────────────────────────────────────
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>(
    product?.affiliateLinks ?? [],
  );

  // ── UI state ────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch spec field metadata when category changes ─────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fields = await api<SpecFieldMeta[]>(`/products/spec-fields/${category}`);
        if (!cancelled) {
          setSpecFields(fields);
          // Preserve existing spec values that match, clear the rest
          if (!isEdit || product?.category !== category) {
            setSpecValues({});
          }
        }
      } catch {
        if (!cancelled) setSpecFields([]);
      }
    })();
    return () => { cancelled = true; };
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Spec value helpers ──────────────────────────────────────────────────

  const setSpec = useCallback((key: string, value: unknown) => {
    setSpecValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleMultiSelect = useCallback((key: string, option: string) => {
    setSpecValues((prev) => {
      const current = (prev[key] as string[]) ?? [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  }, []);

  // ── Affiliate link helpers ──────────────────────────────────────────────

  const addAffiliateLink = () => {
    setAffiliateLinks((prev) => [...prev, { retailer: '', url: '', price: 0 }]);
  };

  const updateAffiliateLink = (idx: number, field: keyof AffiliateLink, value: string | number) => {
    setAffiliateLinks((prev) =>
      prev.map((link, i) => (i === idx ? { ...link, [field]: value } : link)),
    );
  };

  const removeAffiliateLink = (idx: number) => {
    setAffiliateLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    // Coerce numeric spec values from strings
    const coercedSpecs: Record<string, unknown> = {};
    for (const field of specFields) {
      const raw = specValues[field.key];
      if (field.type === 'number' && typeof raw === 'string') {
        coercedSpecs[field.key] = raw === '' ? undefined : parseFloat(raw);
      } else if (field.type === 'select' && field.key === 'pedalCount') {
        coercedSpecs[field.key] = raw ? parseInt(raw as string, 10) : undefined;
      } else {
        coercedSpecs[field.key] = raw;
      }
    }

    const body = {
      name,
      manufacturer,
      category,
      specs: coercedSpecs,
      releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      platforms,
      affiliateLinks: affiliateLinks.filter((l) => l.retailer && l.url),
      images: images.split('\n').map((s) => s.trim()).filter(Boolean),
    };

    try {
      if (isEdit) {
        await api(`/products/${product!.id}`, { method: 'PUT', body });
      } else {
        await api('/products', { method: 'POST', body });
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        const issues = err.issues
          ? Object.entries(err.issues).map(([k, v]) => `${k}: ${v.join(', ')}`).join(' | ')
          : '';
        setError(`${err.message}${issues ? ` — ${issues}` : ''}`);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────

  /** Renders a single dynamic spec field based on its metadata. */
  const renderSpecField = (field: SpecFieldMeta) => {
    const value = specValues[field.key];

    switch (field.type) {
      case 'text':
        return (
          <div className={styles.field} key={field.key}>
            <label className={styles.label}>
              {field.label}
              {field.unit && <span className={styles.unit}>({field.unit})</span>}
              {field.required && <span className={styles.required}>*</span>}
            </label>
            <input
              className={styles.input}
              type="text"
              placeholder={field.placeholder}
              value={(value as string) ?? ''}
              onChange={(e) => setSpec(field.key, e.target.value)}
            />
          </div>
        );

      case 'number':
        return (
          <div className={styles.field} key={field.key}>
            <label className={styles.label}>
              {field.label}
              {field.unit && <span className={styles.unit}>({field.unit})</span>}
              {field.required && <span className={styles.required}>*</span>}
            </label>
            <input
              className={`${styles.input} ${styles.inputNumber}`}
              type="number"
              step="any"
              placeholder={field.placeholder}
              value={value != null ? String(value) : ''}
              onChange={(e) => setSpec(field.key, e.target.value)}
            />
          </div>
        );

      case 'boolean':
        return (
          <div className={`${styles.field} ${styles.checkboxField}`} key={field.key}>
            <input
              className={styles.checkbox}
              type="checkbox"
              id={`spec-${field.key}`}
              checked={!!value}
              onChange={(e) => setSpec(field.key, e.target.checked)}
            />
            <label className={styles.checkboxLabel} htmlFor={`spec-${field.key}`}>
              {field.label}
            </label>
          </div>
        );

      case 'select':
        return (
          <div className={styles.field} key={field.key}>
            <label className={styles.label}>
              {field.label}
              {field.required && <span className={styles.required}>*</span>}
            </label>
            <select
              className={styles.select}
              value={(value as string) ?? ''}
              onChange={(e) => setSpec(field.key, e.target.value)}
            >
              <option value="">Select…</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        );

      case 'multi-select':
        return (
          <div className={`${styles.field} ${styles.fieldWide}`} key={field.key}>
            <label className={styles.label}>
              {field.label}
              {field.required && <span className={styles.required}>*</span>}
            </label>
            <div className={styles.multiSelect}>
              {field.options?.map((opt) => {
                const selected = ((value as string[]) ?? []).includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`${styles.chip} ${selected ? styles.chipActive : ''}`}
                    onClick={() => toggleMultiSelect(field.key, opt)}
                  >
                    {opt.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{isEdit ? 'Edit Product' : 'Add Product'}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* ── Base info ── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Product Info</div>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Name <span className={styles.required}>*</span></label>
                <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fanatec CSL DD" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Manufacturer <span className={styles.required}>*</span></label>
                <input className={styles.input} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="e.g. Fanatec" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Category <span className={styles.required}>*</span></label>
                <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Release Year</label>
                <input className={`${styles.input} ${styles.inputNumber}`} type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="2025" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Weight <span className={styles.unit}>(kg)</span></label>
                <input className={`${styles.input} ${styles.inputNumber}`} type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label className={styles.label}>Platforms</label>
                <div className={styles.multiSelect}>
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`${styles.chip} ${platforms.includes(p) ? styles.chipActive : ''}`}
                      onClick={() => setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Dynamic specs ── */}
          {specFields.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                {CATEGORIES.find((c) => c.value === category)?.label ?? category} Specifications
              </div>
              <div className={styles.fieldGrid}>
                {specFields.map(renderSpecField)}
              </div>
            </div>
          )}

          {/* ── Affiliate links ── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Affiliate Links</div>
            {affiliateLinks.map((link, idx) => (
              <div className={styles.affiliateRow} key={idx}>
                <div className={styles.field}>
                  <label className={styles.label}>Retailer</label>
                  <input className={styles.input} value={link.retailer} onChange={(e) => updateAffiliateLink(idx, 'retailer', e.target.value)} placeholder="e.g. Amazon UK" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>URL</label>
                  <input className={styles.input} value={link.url} onChange={(e) => updateAffiliateLink(idx, 'url', e.target.value)} placeholder="https://…" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Price (£)</label>
                  <input className={`${styles.input} ${styles.inputNumber}`} type="number" step="0.01" value={link.price || ''} onChange={(e) => updateAffiliateLink(idx, 'price', parseFloat(e.target.value) || 0)} />
                </div>
                <button type="button" className={styles.removeBtn} onClick={() => removeAffiliateLink(idx)}>✕</button>
              </div>
            ))}
            <button type="button" className={styles.affiliateAddBtn} onClick={addAffiliateLink}>
              + Add retailer link
            </button>
          </div>

          {/* ── Images ── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Images</div>
            <div className={styles.field}>
              <label className={styles.label}>Image URLs (one per line)</label>
              <textarea className={styles.textarea} value={images} onChange={(e) => setImages(e.target.value)} placeholder="https://example.com/image1.webp" rows={3} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={styles.submitBtn}
            disabled={submitting || !name || !manufacturer}
            onClick={handleSubmit}
          >
            {submitting ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminProductForm;
