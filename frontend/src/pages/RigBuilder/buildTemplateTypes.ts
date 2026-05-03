export interface BuildTemplate {
  id: string;
  name: string;
  description: string;
  tier: 'budget' | 'midrange' | 'highend' | 'pro';
  discipline: string;
  estimatedCost: { min: number; max: number; currency: string };
  parts: {
    categorySlot: string;
    productSlug?: string;
    suggestion: string;
  }[];
}
