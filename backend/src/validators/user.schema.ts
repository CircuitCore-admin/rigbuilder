import { z } from 'zod';

export const updateProfileSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  bio: z.string().max(2000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  bannerColor: z.string().max(7).regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  discordUsername: z.string().max(50).optional().nullable(),
  profileVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
