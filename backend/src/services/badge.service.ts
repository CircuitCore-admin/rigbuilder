import { prisma } from '../prisma';
import type { BadgeType } from '@prisma/client';

export class BadgeService {
  /** Award a badge to a user (idempotent — won't duplicate) */
  static async award(userId: string, badge: BadgeType): Promise<boolean> {
    try {
      await prisma.userBadge.create({ data: { userId, badge } });
      return true;
    } catch {
      return false; // Already has badge (unique constraint)
    }
  }

  /** Check and award all applicable badges for a user */
  static async checkAndAward(userId: string): Promise<BadgeType[]> {
    const awarded: BadgeType[] = [];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pitCred: true,
        emailVerified: true,
        bio: true,
        avatarUrl: true,
        location: true,
        completedSales: true,
        sellerRating: true,
        createdAt: true,
        _count: {
          select: {
            forumThreads: true,
            forumReplies: true,
            followers: true,
          },
        },
      },
    });
    if (!user) return awarded;

    // Community badges
    if (user._count.forumThreads >= 1 && await this.award(userId, 'FIRST_POST')) awarded.push('FIRST_POST');
    if (user._count.forumThreads >= 10 && await this.award(userId, 'TEN_POSTS')) awarded.push('TEN_POSTS');
    if (user._count.forumThreads >= 50 && await this.award(userId, 'FIFTY_POSTS')) awarded.push('FIFTY_POSTS');
    if (user._count.forumReplies >= 1 && await this.award(userId, 'FIRST_REPLY')) awarded.push('FIRST_REPLY');
    if (user.pitCred >= 100 && await this.award(userId, 'TOP_CONTRIBUTOR')) awarded.push('TOP_CONTRIBUTOR');
    if (user.pitCred >= 500 && await this.award(userId, 'EXPERT')) awarded.push('EXPERT');

    // Check upvote-based badges
    const totalUpvotes = await prisma.forumVote.count({ where: { reply: { userId }, value: 1 } });
    if (totalUpvotes >= 10 && await this.award(userId, 'HELPFUL')) awarded.push('HELPFUL');
    if (totalUpvotes >= 50 && await this.award(userId, 'SUPER_HELPFUL')) awarded.push('SUPER_HELPFUL');

    // Marketplace badges
    if ((user.completedSales ?? 0) >= 1 && await this.award(userId, 'FIRST_SALE')) awarded.push('FIRST_SALE');
    if ((user.completedSales ?? 0) >= 5 && await this.award(userId, 'FIVE_SALES')) awarded.push('FIVE_SALES');
    if ((user.completedSales ?? 0) >= 10 && (user.sellerRating ?? 0) >= 4.5 && await this.award(userId, 'TRUSTED_SELLER')) awarded.push('TRUSTED_SELLER');

    // Check purchase badges
    const acceptedOffers = await prisma.marketplaceOffer.count({ where: { userId, status: 'ACCEPTED' } });
    if (acceptedOffers >= 1 && await this.award(userId, 'FIRST_PURCHASE')) awarded.push('FIRST_PURCHASE');
    if (acceptedOffers >= 5 && await this.award(userId, 'BIG_SPENDER')) awarded.push('BIG_SPENDER');

    // Social badges
    if (user._count.followers >= 10 && await this.award(userId, 'POPULAR')) awarded.push('POPULAR');
    if (user._count.followers >= 50 && await this.award(userId, 'INFLUENCER')) awarded.push('INFLUENCER');

    // Account badges
    if (user.emailVerified && await this.award(userId, 'VERIFIED_EMAIL')) awarded.push('VERIFIED_EMAIL');
    if (user.bio && user.avatarUrl && user.location && await this.award(userId, 'PROFILE_COMPLETE')) awarded.push('PROFILE_COMPLETE');

    return awarded;
  }
}
