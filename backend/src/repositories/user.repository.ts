import { prisma } from '../prisma';

const PUBLIC_SELECT = {
  id: true,
  username: true,
  avatarUrl: true,
  bio: true,
  location: true,
  role: true,
  isPro: true,
  reputation: true,
  createdAt: true,
} as const;

const FULL_PROFILE_SELECT = {
  ...PUBLIC_SELECT,
  bannerUrl: true,
  bannerColor: true,
  pitCred: true,
  sellerRating: true,
  sellerReviewCount: true,
  completedSales: true,
  avgResponseMinutes: true,
  discordUsername: true,
  profileVisibility: true,
  onboardingCompleted: true,
  interests: true,
  digestFrequency: true,
  _count: { select: { forumThreads: true, marketplaceListings: true } },
} as const;

export class UserRepository {
  static async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username }, select: FULL_PROFILE_SELECT });
  }

  static async findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: PUBLIC_SELECT });
  }

  static async updateProfile(id: string, data: Record<string, unknown>) {
    return prisma.user.update({ where: { id }, data, select: FULL_PROFILE_SELECT });
  }
}
