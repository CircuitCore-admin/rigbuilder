import { z } from 'zod';

const createListingBaseSchema = z.object({
  type: z.enum(['SELLING', 'LOOKING_FOR', 'TRADING']),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(10000),
  category: z.string().min(1),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'FOR_PARTS']).nullable().optional(),
  price: z.number().min(0).nullable().optional(),
  minimumOffer: z.number().min(0).nullable().optional(),
  currency: z.enum(['GBP', 'EUR', 'USD']).default('GBP'),
  pricingType: z.enum(['FIXED', 'NEGOTIABLE', 'OPEN_TO_OFFERS', 'AUCTION']),
  country: z.string().min(1),
  region: z.string().nullable().optional(),
  shippingOptions: z.array(z.enum(['LOCAL_PICKUP', 'NATIONAL_SHIPPING', 'INTERNATIONAL_SHIPPING'])).min(1),
  discordUsername: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  imageUrls: z.array(z.string()).max(10).default([]),
  buildPermalink: z.string().nullable().optional(),
});

export const createListingSchema = createListingBaseSchema.refine(data => {
  if (data.minimumOffer != null && data.price != null && data.minimumOffer > data.price) {
    return false;
  }
  return true;
}, { message: 'Minimum offer must be less than or equal to price', path: ['minimumOffer'] });

export const updateListingSchema = createListingBaseSchema.partial();

export const updateListingStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'RESERVED', 'SOLD', 'FOUND', 'EXPIRED', 'REMOVED_BY_MOD']),
});

export const createOfferSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['GBP', 'EUR', 'USD']).default('GBP'),
  message: z.string().max(1000).nullable().optional(),
});

export const updateOfferSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});

export const sendMessageSchema = z.object({
  listingId: z.string().min(1),
  recipientId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

export const createReportSchema = z.object({
  reason: z.enum(['SCAM_FRAUDULENT', 'PROHIBITED_ITEM', 'MISLEADING_DESCRIPTION', 'DUPLICATE_LISTING', 'OFFENSIVE_CONTENT']),
  details: z.string().max(1000).nullable().optional(),
});

export const reviewReportSchema = z.object({
  status: z.enum(['REVIEWED_APPROVED', 'REVIEWED_REMOVED']),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).nullable().optional(),
});

export const counterOfferSchema = z.object({
  amount: z.number().positive(),
  message: z.string().max(1000).nullable().optional(),
});

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});
