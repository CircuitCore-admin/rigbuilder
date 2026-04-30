import { z } from 'zod';

const safeImageUrl = z.string()
  .refine(
    (val) =>
      val.startsWith('/uploads/') ||
      val.startsWith('https://cdn.rigbuilder.com/') ||
      val.startsWith('https://res.cloudinary.com/'),
    { message: 'Image URL must be from a trusted source (upload or CDN)' }
  )
  .optional()
  .nullable();

export const updateProfileSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  bio: z.string().max(2000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  avatarUrl: safeImageUrl,
  bannerUrl: safeImageUrl,
  bannerColor: z.string().length(7).regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  discordUsername: z.string().max(50).optional().nullable(),
  profileVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  onboardingCompleted: z.boolean().optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  digestFrequency: z.enum(['WEEKLY', 'DAILY', 'NEVER']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
