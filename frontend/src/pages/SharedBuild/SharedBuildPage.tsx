// ============================================================================
// SharedBuildPage — Loads a persisted build from a permalink (/list/:buildId)
// Fetches data from the API, populates useBuildStore, then renders the
// configurator inline so the user stays on their build-specific URL.
// ============================================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBuildStore } from '../../stores/buildStore';
import { api } from '../../utils/api';
import type { CategorySlot, SelectedPart } from '../../stores/buildStore';
import { RigBuilderPage } from '../RigBuilder/RigBuilderPage';
import { VerifiedCreatorBadge } from '../../components/VerifiedCreatorBadge/VerifiedCreatorBadge';
import styles from './SharedBuildPage.module.scss';

// ---------------------------------------------------------------------------
// Types matching the backend Build response shape
// ---------------------------------------------------------------------------

interface BuildPartResponse {
  categorySlot: CategorySlot;
  pricePaid: number | null;
  notes: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    manufacturer: string;
    images: string[];
    weight: number | null;
    avgRating: number | null;
    specs: Record<string, unknown>;
    platforms: string[];
  };
}

interface BuildResponse {
  id: string;
  userId: string;
  name: string;
  slug: string;
  totalCost: number;
  parts: BuildPartResponse[];
  user?: {
    role: string;
    username: string;
    channelUrl?: string;
  };
}

// ---------------------------------------------------------------------------
// Helper: convert API response to store-compatible SelectedPart map
// ---------------------------------------------------------------------------

function toBuildParts(parts: BuildPartResponse[]): Partial<Record<CategorySlot, SelectedPart>> {
  const result: Partial<Record<CategorySlot, SelectedPart>> = {};

  for (const bp of parts) {
    const slot = bp.categorySlot;
    const p = bp.product;

    result[slot] = {
      id: p.id,
      name: p.name,
      thumbnail: p.images?.[0],
      keySpec: summariseKeySpec(slot, p.specs),
      rating: p.avgRating ?? undefined,
      price: bp.pricePaid ?? 0,
      weight: p.weight ?? undefined,
    };
  }

  return result;
}

/** Derive a readable keySpec string from the raw product specs. */
function summariseKeySpec(slot: CategorySlot, specs: Record<string, unknown>): string {
  switch (slot) {
    case 'WHEELBASE': {
      const torque = specs.peakTorque ? `${specs.peakTorque}Nm` : '';
      const type = toTitleCase(String(specs.driveType ?? ''));
      return [torque, type].filter(Boolean).join(' ');
    }
    case 'PEDALS': {
      const brake = toTitleCase(String(specs.brakeType ?? ''));
      const force = specs.maxBrakeForce ? `${specs.maxBrakeForce}kg` : '';
      return [brake, force].filter(Boolean).join(' / ');
    }
    case 'COCKPIT':
      return toTitleCase(String(specs.material ?? ''));
    case 'WHEEL_RIM': {
      const dia = specs.diameter ? `${specs.diameter}mm` : '';
      const mat = toTitleCase(String(specs.material ?? ''));
      return [dia, mat].filter(Boolean).join(' / ');
    }
    default:
      return '';
  }
}

function toTitleCase(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SharedBuildPage() {
  const { buildId } = useParams<{ buildId: string }>();
  const navigate = useNavigate();
  const loadBuild = useBuildStore((s) => s.loadBuild);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [buildOwner, setBuildOwner] = useState<BuildResponse['user']>(undefined);

  useEffect(() => {
    if (!buildId) {
      setError('No build ID provided.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchBuild() {
      try {
        const data = await api<BuildResponse>(`/builds/${buildId}`);
        if (cancelled) return;

        const parts = toBuildParts(data.parts);
        loadBuild(parts, data.slug, data.userId);

        if (data.user) setBuildOwner(data.user);

        // Show the configurator inline — keep the user on /list/:buildId
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load build. It may have been deleted.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBuild();
    return () => { cancelled = true; };
  }, [buildId, loadBuild]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner} />
        <p className={styles.message}>Loading build…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h2 className={styles.errorTitle}>Build Not Found</h2>
        <p className={styles.message}>{error}</p>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => navigate('/build')}
        >
          Start a New Build
        </button>
      </div>
    );
  }

  if (ready) {
    return (
      <>
        {buildOwner?.role === 'CREATOR' && (
          <div className={styles.creatorBanner}>
            <VerifiedCreatorBadge role={buildOwner.role} />
            <span className={styles.creatorName}>{buildOwner.username}&#39;s Build</span>
            {buildOwner.channelUrl && (
              <a
                href={buildOwner.channelUrl}
                className={styles.creatorCta}
                target="_blank"
                rel="noopener noreferrer"
              >
                🎥 Watch the Build Video
              </a>
            )}
          </div>
        )}
        <div className={styles.buildActions}>
          <a
            href={`/compare?ids=${buildId}`}
            className={styles.compareBtn}
          >
            Compare
          </a>
        </div>
        <RigBuilderPage />
      </>
    );
  }

  return null;
}

export default SharedBuildPage;
