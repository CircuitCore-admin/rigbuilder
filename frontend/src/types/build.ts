import type { Product, Platform } from './product';

export type Discipline = 'FORMULA' | 'GT' | 'RALLY' | 'DRIFT' | 'OVAL' | 'TRUCK' | 'MULTI';
export type SpaceType = 'DESK' | 'DEDICATED_ROOM' | 'SHARED_ROOM' | 'COCKPIT_ONLY';
export type CategorySlot = 'COCKPIT' | 'WHEELBASE' | 'WHEEL_RIM' | 'PEDALS' | 'SHIFTER' | 'DISPLAY' | 'SEAT' | 'EXTRAS';

export interface BuildRatings {
  satisfaction?: number;
  comfort?: number;
  immersion?: number;
  difficulty?: number;
  noise?: number;
}

export interface BuildPart {
  id: string;
  productId: string;
  categorySlot: CategorySlot;
  pricePaid?: number;
  notes?: string;
  product: Product;
}

export interface BuildOwner {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface Build {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  spaceType?: SpaceType;
  disciplines: Discipline[];
  platforms: Platform[];
  totalCost: number;
  ratings?: BuildRatings;
  images: string[];
  upvoteCount: number;
  viewCount: number;
  isPublic: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  user: BuildOwner;
  parts: BuildPart[];
}

export interface BuildGalleryFilters {
  minBudget?: number;
  maxBudget?: number;
  disciplines?: Discipline[];
  platforms?: Platform[];
  search?: string;
  sortBy?: 'createdAt' | 'upvoteCount' | 'totalCost';
  sortDir?: 'asc' | 'desc';
}
