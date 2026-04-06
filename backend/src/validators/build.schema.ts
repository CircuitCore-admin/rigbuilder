import { z } from 'zod';

const disciplineEnum = z.enum(['FORMULA', 'GT', 'RALLY', 'DRIFT', 'OVAL', 'TRUCK', 'MULTI']);
const spaceTypeEnum = z.enum(['DESK', 'DEDICATED_ROOM', 'SHARED_ROOM', 'COCKPIT_ONLY']);
const platformEnum = z.enum(['PC', 'PLAYSTATION', 'XBOX']);
const categorySlotEnum = z.enum([
  'COCKPIT', 'WHEELBASE', 'WHEEL_RIM', 'PEDALS',
  'SHIFTER', 'DISPLAY', 'SEAT', 'EXTRAS',
]);

const buildRatingsSchema = z.object({
  satisfaction: z.number().min(1).max(10),
  comfort: z.number().min(1).max(5),
  immersion: z.number().min(1).max(5),
  difficulty: z.number().min(1).max(5),
  noise: z.number().min(1).max(5),
}).partial();

const buildPartSchema = z.object({
  productId: z.string().min(1),
  categorySlot: categorySlotEnum,
  pricePaid: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

export const createBuildSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(10000).optional(),
  spaceType: spaceTypeEnum.optional(),
  disciplines: z.array(disciplineEnum).default([]),
  platforms: z.array(platformEnum).default([]),
  ratings: buildRatingsSchema.optional(),
  images: z.array(z.string().url()).max(20).default([]),
  isPublic: z.boolean().default(true),
  parts: z.array(buildPartSchema).min(1, 'A build must have at least one part'),
});

export const updateBuildSchema = createBuildSchema.partial();

export type CreateBuildInput = z.infer<typeof createBuildSchema>;
export type UpdateBuildInput = z.infer<typeof updateBuildSchema>;
