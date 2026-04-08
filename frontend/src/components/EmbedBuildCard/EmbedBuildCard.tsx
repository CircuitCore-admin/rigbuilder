import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import styles from './EmbedBuildCard.module.scss';

interface BuildPart {
  id: string;
  slotLabel: string;
  quantity: number;
  product: {
    name: string;
    brand: string;
    category: string;
    imageUrl: string | null;
    msrp: number | null;
  };
}

interface Build {
  id: string;
  slug: string;
  name: string;
  parts: BuildPart[];
}

interface EmbedBuildCardProps {
  permalink: string;
}

export function EmbedBuildCard({ permalink }: EmbedBuildCardProps) {
  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract ID from /list/{id} permalink
    const match = permalink.match(/^\/list\/(.+)$/);
    if (!match) {
      setError('Invalid build permalink');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    api<Build>(`/builds/${match[1]}`)
      .then((data) => setBuild(data))
      .catch(() => setError('Failed to load build'))
      .finally(() => setLoading(false));
  }, [permalink]);

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>Loading build…</div>
      </div>
    );
  }

  if (error || !build) {
    return (
      <div className={styles.card}>
        <div className={styles.error}>{error ?? 'Build not found'}</div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>🖥️</span>
        <span className={styles.buildName}>{build.name}</span>
      </div>
      <div className={styles.partsList}>
        {build.parts.map((part) => (
          <div key={part.id} className={styles.partRow}>
            <span className={styles.slotLabel}>{part.slotLabel}</span>
            <span className={styles.partName}>
              {part.product.brand} {part.product.name}
              {part.quantity > 1 && <span className={styles.qty}> ×{part.quantity}</span>}
            </span>
            {part.product.msrp != null && (
              <span className={styles.price}>${part.product.msrp.toFixed(2)}</span>
            )}
          </div>
        ))}
      </div>
      <a href={permalink} className={styles.viewLink}>View full build →</a>
    </div>
  );
}
