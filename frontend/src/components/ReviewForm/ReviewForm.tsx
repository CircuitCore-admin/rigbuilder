import { useState, useCallback } from 'react';
import styles from './ReviewForm.module.scss';
import { api } from '../../utils/api';
import type { SubRatings } from '../../types/review';

interface ReviewFormProps {
  productId: string;
  productName: string;
  onSubmitted?: () => void;
}

const OWNERSHIP_OPTIONS = [
  'Less than 1 month',
  '1-3 months',
  '3-6 months',
  '6-12 months',
  '1-2 years',
  '2+ years',
];

const SUB_RATING_META = [
  { key: 'buildQuality', label: 'Build Quality', description: 'Materials, fit & finish' },
  { key: 'performance', label: 'Performance', description: 'Force, accuracy, responsiveness' },
  { key: 'value', label: 'Value for Money', description: 'Price vs what you get' },
  { key: 'noise', label: 'Noise Level', description: 'Low noise = higher score' },
] as const;

export function ReviewForm({ productId, productName, onSubmitted }: ReviewFormProps) {
  const [ratingOverall, setRatingOverall] = useState(7);
  const [subRatings, setSubRatings] = useState<SubRatings>({});
  const [ownershipDuration, setOwnershipDuration] = useState('');
  const [upgradedFromId, setUpgradedFromId] = useState('');
  const [upgradedFromSearch, setUpgradedFromSearch] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [wouldBuyAgain, setWouldBuyAgain] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reliability is only unlockable after 6 months ownership
  const reliabilityEligible = ['6-12 months', '1-2 years', '2+ years'].includes(ownershipDuration);
  const [reliabilityRating, setReliabilityRating] = useState<number | undefined>(undefined);

  const handleSubRating = (key: string, value: number) => {
    setSubRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSubmitting(true);

    try {
      const body = {
        productId,
        ratingOverall,
        subRatings: {
          ...subRatings,
          ...(reliabilityEligible && reliabilityRating ? { reliability: reliabilityRating } : {}),
        },
        ownershipDuration: ownershipDuration || undefined,
        upgradedFromProductId: upgradedFromId || undefined,
        pros,
        cons,
        wouldBuyAgain,
        images: [],
      };

      await api('/reviews', { method: 'POST', body });
      setSuccess(true);
      onSubmitted?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit review';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [productId, ratingOverall, subRatings, ownershipDuration, upgradedFromId, pros, cons, wouldBuyAgain, reliabilityEligible, reliabilityRating, onSubmitted]);

  if (success) {
    return (
      <div className={styles.successState}>
        <span className={styles.successIcon}>✓</span>
        <h3>Review Submitted!</h3>
        <p>Thank you for reviewing {productName}.</p>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <h3 className={styles.formTitle}>Review {productName}</h3>

      {error && <div className={styles.error}>{error}</div>}

      {/* Overall Rating */}
      <div className={styles.field}>
        <label className={styles.label}>
          Overall Rating
          <span className={styles.ratingDisplay}>{ratingOverall}/10</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={ratingOverall}
          onChange={(e) => setRatingOverall(Number(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sliderLabels}>
          <span>1</span><span>5</span><span>10</span>
        </div>
      </div>

      {/* Sub-ratings */}
      <div className={styles.subRatings}>
        <span className={styles.sectionLabel}>Detailed Ratings</span>
        {SUB_RATING_META.map(({ key, label, description }) => (
          <div key={key} className={styles.subRatingRow}>
            <div className={styles.subRatingInfo}>
              <span className={styles.subRatingLabel}>{label}</span>
              <span className={styles.subRatingDesc}>{description}</span>
            </div>
            <div className={styles.starRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`${styles.starBtn} ${
                    (subRatings[key as keyof SubRatings] ?? 0) >= val ? styles.starActive : ''
                  }`}
                  onClick={() => handleSubRating(key, val)}
                  title={`${val}/10`}
                >
                  <span className={styles.starDot} />
                </button>
              ))}
              <span className={styles.starValue}>
                {subRatings[key as keyof SubRatings] ?? '—'}
              </span>
            </div>
          </div>
        ))}

        {/* Reliability - gated */}
        <div className={`${styles.subRatingRow} ${!reliabilityEligible ? styles.locked : ''}`}>
          <div className={styles.subRatingInfo}>
            <span className={styles.subRatingLabel}>
              Reliability
              {!reliabilityEligible && <span className={styles.lockBadge}>🔒 6+ months</span>}
            </span>
            <span className={styles.subRatingDesc}>Long-term durability & consistency</span>
          </div>
          {reliabilityEligible ? (
            <div className={styles.starRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`${styles.starBtn} ${
                    (reliabilityRating ?? 0) >= val ? styles.starActive : ''
                  }`}
                  onClick={() => setReliabilityRating(val)}
                  title={`${val}/10`}
                >
                  <span className={styles.starDot} />
                </button>
              ))}
              <span className={styles.starValue}>{reliabilityRating ?? '—'}</span>
            </div>
          ) : (
            <span className={styles.lockedMsg}>Select 6+ months ownership to unlock</span>
          )}
        </div>
      </div>

      {/* Ownership duration */}
      <div className={styles.field}>
        <label className={styles.label}>How long have you owned this?</label>
        <div className={styles.chipGroup}>
          {OWNERSHIP_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`${styles.chip} ${ownershipDuration === opt ? styles.chipActive : ''}`}
              onClick={() => setOwnershipDuration(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Upgraded from */}
      <div className={styles.field}>
        <label className={styles.label}>Upgraded From (optional)</label>
        <input
          type="text"
          className={styles.textInput}
          placeholder="Search for the product you upgraded from..."
          value={upgradedFromSearch}
          onChange={(e) => setUpgradedFromSearch(e.target.value)}
        />
        <span className={styles.hint}>This helps other users understand upgrade paths.</span>
      </div>

      {/* Pros & Cons */}
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>
            <span className={styles.prosIcon}>+</span> Pros
          </label>
          <textarea
            className={styles.textarea}
            placeholder="What do you love about it?"
            value={pros}
            onChange={(e) => setPros(e.target.value)}
            rows={4}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>
            <span className={styles.consIcon}>−</span> Cons
          </label>
          <textarea
            className={styles.textarea}
            placeholder="What could be improved?"
            value={cons}
            onChange={(e) => setCons(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      {/* Would buy again */}
      <div className={styles.field}>
        <label className={styles.label}>Would you buy this again?</label>
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${wouldBuyAgain ? styles.toggleActive : ''}`}
            onClick={() => setWouldBuyAgain(true)}
          >
            👍 Yes
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${!wouldBuyAgain ? styles.toggleActiveNo : ''}`}
            onClick={() => setWouldBuyAgain(false)}
          >
            👎 No
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        className={styles.submitBtn}
        disabled={submitting || !pros.trim() || !cons.trim()}
        onClick={handleSubmit}
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
}
