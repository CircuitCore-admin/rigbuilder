import { prisma } from '../prisma';

interface SubRatings {
  buildQuality?: number;
  performance?: number;
  value?: number;
  noise?: number;
  reliability?: number;
}

interface AggregatedScore {
  rigBuilderScore: number;
  breakdown: {
    buildQuality: number | null;
    performance: number | null;
    value: number | null;
    noise: number | null;
    reliability: number | null;
  };
  totalReviews: number;
  reliabilityEligibleCount: number;
}

/**
 * Calculates the composite "RigBuilder Score" (1–10) for a product.
 *
 * Weights:
 *  - Build Quality: 25%
 *  - Performance: 30%
 *  - Value: 25%
 *  - Noise: 10%
 *  - Reliability: 10% (only from reviews with ≥6 months ownership)
 *
 * If no reliability-eligible reviews exist, redistributes that weight
 * proportionally among the other sub-ratings.
 */
export class ReviewScoreService {
  static async getAggregatedScore(productId: string): Promise<AggregatedScore> {
    const reviews = await prisma.review.findMany({
      where: { productId },
      select: { subRatings: true, ownershipDuration: true, ratingOverall: true },
    });

    if (reviews.length === 0) {
      return {
        rigBuilderScore: 0,
        breakdown: {
          buildQuality: null,
          performance: null,
          value: null,
          noise: null,
          reliability: null,
        },
        totalReviews: 0,
        reliabilityEligibleCount: 0,
      };
    }

    const sums = { buildQuality: 0, performance: 0, value: 0, noise: 0, reliability: 0 };
    const counts = { buildQuality: 0, performance: 0, value: 0, noise: 0, reliability: 0 };
    let reliabilityEligibleCount = 0;

    for (const review of reviews) {
      const sub = review.subRatings as SubRatings | null;
      if (!sub) continue;

      if (sub.buildQuality != null) { sums.buildQuality += sub.buildQuality; counts.buildQuality++; }
      if (sub.performance != null) { sums.performance += sub.performance; counts.performance++; }
      if (sub.value != null) { sums.value += sub.value; counts.value++; }
      if (sub.noise != null) { sums.noise += sub.noise; counts.noise++; }

      // Reliability only counts if ownership ≥ 6 months
      if (sub.reliability != null && ReviewScoreService.isReliabilityEligible(review.ownershipDuration)) {
        sums.reliability += sub.reliability;
        counts.reliability++;
        reliabilityEligibleCount++;
      }
    }

    const avg = (key: keyof typeof sums) =>
      counts[key] > 0 ? sums[key] / counts[key] : null;

    const breakdown = {
      buildQuality: avg('buildQuality'),
      performance: avg('performance'),
      value: avg('value'),
      noise: avg('noise'),
      reliability: avg('reliability'),
    };

    // Calculate weighted score
    const hasReliability = breakdown.reliability !== null;
    const weights = hasReliability
      ? { buildQuality: 0.25, performance: 0.30, value: 0.25, noise: 0.10, reliability: 0.10 }
      : { buildQuality: 0.278, performance: 0.333, value: 0.278, noise: 0.111, reliability: 0 };

    let weighted = 0;
    let totalWeight = 0;

    for (const key of ['buildQuality', 'performance', 'value', 'noise', 'reliability'] as const) {
      const val = breakdown[key];
      if (val !== null && weights[key] > 0) {
        weighted += val * weights[key];
        totalWeight += weights[key];
      }
    }

    const rigBuilderScore = totalWeight > 0
      ? Math.round((weighted / totalWeight) * 10) / 10
      : Math.round((reviews.reduce((s, r) => s + r.ratingOverall, 0) / reviews.length) * 10) / 10;

    return {
      rigBuilderScore: Math.min(10, Math.max(1, rigBuilderScore)),
      breakdown,
      totalReviews: reviews.length,
      reliabilityEligibleCount,
    };
  }

  /** Parse ownership duration string and check if ≥ 6 months */
  private static isReliabilityEligible(duration: string | null | undefined): boolean {
    if (!duration) return false;
    const lower = duration.toLowerCase().trim();

    // Match patterns like "6 months", "1 year", "12 months", "2 years"
    const monthMatch = lower.match(/(\d+)\s*month/);
    const yearMatch = lower.match(/(\d+)\s*year/);

    let totalMonths = 0;
    if (yearMatch) totalMonths += parseInt(yearMatch[1], 10) * 12;
    if (monthMatch) totalMonths += parseInt(monthMatch[1], 10);

    // If no pattern matched, check for keywords
    if (totalMonths === 0) {
      if (lower.includes('6+') || lower.includes('6-12') || lower.includes('1-2') || lower.includes('2+')) {
        return true;
      }
      return false;
    }

    return totalMonths >= 6;
  }
}
