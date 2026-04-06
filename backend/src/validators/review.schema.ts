import { z } from 'zod';

const subRatingsSchema = z.object({
  buildQuality: z.number().min(1).max(10).optional(),
  performance: z.number().min(1).max(10).optional(),
  value: z.number().min(1).max(10).optional(),
  noise: z.number().min(1).max(10).optional(),
  reliability: z.number().min(1).max(10).optional(),
});

export const createReviewSchema = z.object({
  productId: z.string().min(1),
  ratingOverall: z.number().min(1).max(10),
  subRatings: subRatingsSchema.optional(),
  ownershipDuration: z.string().max(50).optional(),
  upgradedFromProductId: z.string().optional(),
  pros: z.string().min(1).max(2000),
  cons: z.string().min(1).max(2000),
  wouldBuyAgain: z.boolean(),
  images: z.array(z.string().url()).max(10).default([]),
});

export const updateReviewSchema = createReviewSchema.omit({ productId: true }).partial();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
