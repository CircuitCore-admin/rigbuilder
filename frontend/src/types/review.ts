export interface SubRatings {
  buildQuality?: number;
  performance?: number;
  value?: number;
  noise?: number;
  reliability?: number;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  ratingOverall: number;
  subRatings?: SubRatings;
  ownershipDuration?: string;
  upgradedFromProductId?: string;
  pros: string;
  cons: string;
  wouldBuyAgain: boolean;
  images: string[];
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; avatarUrl?: string };
  product: { id: string; name: string; slug: string; category: string };
  upgradedFrom?: { id: string; name: string; slug: string };
}

export interface AggregatedScore {
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
