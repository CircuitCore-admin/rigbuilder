import { z } from 'zod';

const blogCategoryEnum = z.enum([
  'NEWS', 'PRODUCT_LAUNCH', 'FIRMWARE', 'ESPORTS', 'PLATFORM_UPDATE', 'EDITORIAL',
]);

export const createBlogSchema = z.object({
  title: z.string().min(1).max(255),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(1),
  category: blogCategoryEnum,
  coverImage: z.string().url().optional().nullable(),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
});

export const updateBlogSchema = createBlogSchema.partial();

export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
