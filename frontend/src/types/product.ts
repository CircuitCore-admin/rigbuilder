// ============================================================================
// RigBuilder Frontend — Shared types (mirrors backend where needed)
// ============================================================================

export type ProductCategory =
  | 'COCKPIT' | 'WHEELBASE' | 'WHEEL_RIM' | 'PEDALS'
  | 'SHIFTER' | 'DISPLAY' | 'SEAT' | 'EXTRAS';

export type Platform = 'PC' | 'PLAYSTATION' | 'XBOX';

export interface Product {
  id: string;
  name: string;
  slug: string;
  manufacturer: string;
  category: ProductCategory;
  subcategory?: string;
  specs: Record<string, unknown>;
  releaseYear?: number;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  platforms: Platform[];
  affiliateLinks: AffiliateLink[];
  images: string[];
  avgRating?: number;
  reviewCount: number;
  buildCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateLink {
  retailer: string;
  url: string;
  price: number;
  lastChecked?: string;
}

export interface SpecFieldMeta {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multi-select';
  required: boolean;
  options?: string[];
  unit?: string;
  placeholder?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  COCKPIT: 'Cockpit / Frame',
  WHEELBASE: 'Wheelbase',
  WHEEL_RIM: 'Wheel Rim',
  PEDALS: 'Pedals',
  SHIFTER: 'Shifter',
  DISPLAY: 'Display',
  SEAT: 'Seat',
  EXTRAS: 'Extras',
};
