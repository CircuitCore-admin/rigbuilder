import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import type {
  MarketplaceListingType,
  ItemCondition,
  Currency,
  ShippingOption,
  ListingStatus,
  OfferStatus,
  ReportStatus,
  MarketplaceNotificationType,
} from '@prisma/client';

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export interface ListingListParams {
  page: number;
  limit: number;
  type?: MarketplaceListingType;
  category?: string;
  condition?: ItemCondition;
  priceMin?: number;
  priceMax?: number;
  currency?: Currency;
  country?: string;
  shippingOptions?: ShippingOption[];
  status?: ListingStatus;
  includeSold?: boolean;
  search?: string;
  sortBy?: 'createdAt' | 'price' | 'viewCount';
  sortDir?: 'asc' | 'desc';
}

const userSelect = {
  id: true,
  username: true,
  avatarUrl: true,
  sellerRating: true,
  sellerReviewCount: true,
} as const;

/** Window in ms for detecting recently-expired items (to avoid re-notification). */
const RECENT_EXPIRY_WINDOW_MS = 60_000;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class MarketplaceRepository {
  // -------------------------------------------------------------------------
  // Listings
  // -------------------------------------------------------------------------

  static async findListings(params: ListingListParams) {
    const {
      page,
      limit,
      type,
      category,
      condition,
      priceMin,
      priceMax,
      currency,
      country,
      shippingOptions,
      status,
      includeSold,
      search,
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = params;

    const excludedStatuses: ListingStatus[] = includeSold
      ? ['EXPIRED', 'REMOVED_BY_MOD']
      : ['SOLD', 'FOUND', 'EXPIRED', 'REMOVED_BY_MOD'];

    const where: Prisma.MarketplaceListingWhereInput = {
      ...(status ? { status } : { status: { notIn: excludedStatuses } }),
      ...(type && { type }),
      ...(category && { category }),
      ...(condition && { condition }),
      ...(currency && { currency }),
      ...(country && { country }),
      ...(priceMin != null && { price: { gte: new Prisma.Decimal(priceMin) } }),
      ...(priceMax != null && {
        price: {
          ...(priceMin != null ? { gte: new Prisma.Decimal(priceMin) } : {}),
          lte: new Prisma.Decimal(priceMax),
        },
      }),
      ...(shippingOptions?.length && { shippingOptions: { hasSome: shippingOptions } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const orderBy: Prisma.MarketplaceListingOrderByWithRelationInput[] = [
      { isPremium: 'desc' },
      { [sortBy]: sortDir },
    ];

    const [items, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: userSelect } },
      }),
      prisma.marketplaceListing.count({ where }),
    ]);

    return { items, total };
  }

  static async findListingById(id: string) {
    return prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        user: { select: userSelect },
        product: { select: { id: true, name: true, slug: true, category: true } },
      },
    });
  }

  static async createListing(data: Prisma.MarketplaceListingCreateInput) {
    return prisma.marketplaceListing.create({
      data,
      include: { user: { select: userSelect } },
    });
  }

  static async updateListing(id: string, data: Prisma.MarketplaceListingUpdateInput) {
    return prisma.marketplaceListing.update({
      where: { id },
      data,
      include: { user: { select: userSelect } },
    });
  }

  static async deleteListing(id: string) {
    return prisma.marketplaceListing.delete({ where: { id } });
  }

  static async incrementViewCount(id: string) {
    return prisma.marketplaceListing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  static async extendListing(id: string) {
    return prisma.marketplaceListing.update({
      where: { id },
      data: {
        expiresAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
      include: { user: { select: userSelect } },
    });
  }

  static async updateListingStatus(id: string, status: ListingStatus) {
    return prisma.marketplaceListing.update({
      where: { id },
      data: { status },
    });
  }

  static async findUserListings(userId: string) {
    return prisma.marketplaceListing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: userSelect } },
    });
  }

  /** Get other active listings by the same seller, excluding the current listing */
  static async findSellerOtherListings(sellerId: string, excludeListingId: string, limit = 6) {
    return prisma.marketplaceListing.findMany({
      where: {
        userId: sellerId,
        id: { not: excludeListingId },
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: userSelect },
      },
    });
  }

  /** Get similar active listings in the same category, excluding the current listing and same seller */
  static async findSimilarListings(category: string, excludeListingId: string, excludeSellerId: string, limit = 6) {
    return prisma.marketplaceListing.findMany({
      where: {
        category,
        id: { not: excludeListingId },
        userId: { not: excludeSellerId },
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: userSelect },
      },
    });
  }

  // -------------------------------------------------------------------------
  // Offers
  // -------------------------------------------------------------------------

  static async findOffers(listingId: string, userId?: string, isListingSeller = false) {
    const where: Prisma.MarketplaceOfferWhereInput = {
      listingId,
      ...(!isListingSeller && { status: 'PENDING' as OfferStatus }),
    };

    return prisma.marketplaceOffer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: userSelect },
      },
    });
  }

  static async findOfferById(offerId: string) {
    return prisma.marketplaceOffer.findUnique({
      where: { id: offerId },
      include: {
        listing: { include: { user: { select: userSelect } } },
        user: { select: userSelect },
      },
    });
  }

  static async createOffer(data: Prisma.MarketplaceOfferCreateInput) {
    return prisma.marketplaceOffer.create({
      data,
      include: { user: { select: userSelect } },
    });
  }

  static async updateOffer(offerId: string, data: Prisma.MarketplaceOfferUpdateInput) {
    return prisma.marketplaceOffer.update({
      where: { id: offerId },
      data,
      include: { user: { select: userSelect } },
    });
  }

  static async deleteOffer(offerId: string) {
    return prisma.marketplaceOffer.delete({ where: { id: offerId } });
  }

  static async acceptOffer(offerId: string) {
    const offer = await prisma.marketplaceOffer.findUnique({ where: { id: offerId } });
    if (!offer) return null;

    return prisma.$transaction([
      prisma.marketplaceOffer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED' },
      }),
      prisma.marketplaceListing.update({
        where: { id: offer.listingId },
        data: { status: 'RESERVED' },
      }),
      prisma.marketplaceOffer.updateMany({
        where: {
          listingId: offer.listingId,
          id: { not: offerId },
          status: 'PENDING',
        },
        data: { status: 'REJECTED' },
      }),
    ]);
  }

  // -------------------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------------------

  static async findConversations(userId: string) {
    // Find all distinct conversations the user is part of
    const messages = await prisma.marketplaceMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: userSelect },
        recipient: { select: userSelect },
        listing: { select: { id: true, title: true, status: true, imageUrls: true } },
      },
    });

    // Group by conversationId, keep the latest message per conversation
    const conversationMap = new Map<string, {
      conversationId: string;
      lastMessage: typeof messages[0];
      unreadCount: number;
    }>();

    for (const msg of messages) {
      if (!conversationMap.has(msg.conversationId)) {
        conversationMap.set(msg.conversationId, {
          conversationId: msg.conversationId,
          lastMessage: msg,
          unreadCount: 0,
        });
      }
      if (msg.recipientId === userId && !msg.readAt) {
        const conv = conversationMap.get(msg.conversationId)!;
        conv.unreadCount += 1;
      }
    }

    return Array.from(conversationMap.values());
  }

  static async findMessages(conversationId: string) {
    return prisma.marketplaceMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: userSelect },
        recipient: { select: userSelect },
      },
    });
  }

  static async createMessage(data: Prisma.MarketplaceMessageCreateInput) {
    return prisma.marketplaceMessage.create({
      data,
      include: {
        sender: { select: userSelect },
        recipient: { select: userSelect },
      },
    });
  }

  static async markMessagesRead(conversationId: string, userId: string) {
    return prisma.marketplaceMessage.updateMany({
      where: {
        conversationId,
        recipientId: userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  // -------------------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------------------

  static async createReport(data: Prisma.MarketplaceReportCreateInput) {
    return prisma.marketplaceReport.create({ data });
  }

  static async findReports(params: { page: number; limit: number; status?: ReportStatus }) {
    const where: Prisma.MarketplaceReportWhereInput = {
      ...(params.status && { status: params.status }),
    };

    const [items, total] = await Promise.all([
      prisma.marketplaceReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          listing: {
            include: { user: { select: userSelect } },
          },
          reporter: { select: userSelect },
        },
      }),
      prisma.marketplaceReport.count({ where }),
    ]);

    return { items, total };
  }

  static async findReportById(reportId: string) {
    return prisma.marketplaceReport.findUnique({
      where: { id: reportId },
      include: {
        listing: true,
        reporter: { select: userSelect },
      },
    });
  }

  static async updateReport(reportId: string, data: Prisma.MarketplaceReportUpdateInput) {
    return prisma.marketplaceReport.update({
      where: { id: reportId },
      data,
    });
  }

  // -------------------------------------------------------------------------
  // Reviews
  // -------------------------------------------------------------------------

  static async createReview(data: Prisma.MarketplaceReviewCreateInput) {
    const review = await prisma.marketplaceReview.create({ data });

    // Update the seller's average rating
    const sellerId = (data.seller as any).connect.id;
    const agg = await prisma.marketplaceReview.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.user.update({
      where: { id: sellerId },
      data: {
        sellerRating: agg._avg.rating,
        sellerReviewCount: agg._count.rating,
      },
    });

    return review;
  }

  static async findReviewsBySeller(sellerId: string) {
    return prisma.marketplaceReview.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: userSelect },
        listing: { select: { id: true, title: true } },
      },
    });
  }

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------

  static async findNotifications(userId: string, params: { page: number; limit: number; unreadOnly?: boolean }) {
    const where: Prisma.MarketplaceNotificationWhereInput = {
      userId,
      ...(params.unreadOnly && { read: false }),
    };

    const [items, total] = await Promise.all([
      prisma.marketplaceNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          listing: { select: { id: true, title: true } },
        },
      }),
      prisma.marketplaceNotification.count({ where }),
    ]);

    return { items, total };
  }

  static async markNotificationsRead(userId: string, ids?: string[]) {
    const where: Prisma.MarketplaceNotificationWhereInput = {
      userId,
      ...(ids?.length && { id: { in: ids } }),
    };
    await prisma.marketplaceNotification.updateMany({ where, data: { read: true } });
  }

  static async createNotification(data: {
    userId: string;
    type: MarketplaceNotificationType;
    listingId?: string;
    referenceId?: string;
    message: string;
  }) {
    return prisma.marketplaceNotification.create({ data });
  }

  static async createNotifications(data: Array<{
    userId: string;
    type: MarketplaceNotificationType;
    listingId?: string;
    referenceId?: string;
    message: string;
  }>) {
    if (data.length === 0) return;
    await prisma.marketplaceNotification.createMany({ data });
  }

  // -------------------------------------------------------------------------
  // Matching
  // -------------------------------------------------------------------------

  static async findMatchingListings(type: MarketplaceListingType, category: string, productId?: string | null) {
    // SELLING matches with LOOKING_FOR and vice versa
    const oppositeType: MarketplaceListingType = type === 'SELLING' ? 'LOOKING_FOR' : 'SELLING';

    return prisma.marketplaceListing.findMany({
      where: {
        type: oppositeType,
        category,
        status: 'ACTIVE',
        ...(productId && { productId }),
      },
      include: { user: { select: { id: true, username: true } } },
      take: 10,
    });
  }

  // -------------------------------------------------------------------------
  // Expiry
  // -------------------------------------------------------------------------

  static async expireListings() {
    const now = new Date();
    const result = await prisma.marketplaceListing.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });
    return result.count;
  }

  static async findExpiredListingUserIds() {
    const now = new Date();
    const listings = await prisma.marketplaceListing.findMany({
      where: {
        status: 'EXPIRED',
        expiresAt: {
          lt: now,
          gte: new Date(now.getTime() - RECENT_EXPIRY_WINDOW_MS),
        },
      },
      select: { id: true, userId: true, title: true },
    });
    return listings;
  }

  static async findExpiringListings(daysUntilExpiry: number) {
    const now = new Date();
    const threshold = new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);

    return prisma.marketplaceListing.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: threshold, gt: now },
      },
      select: { id: true, userId: true, title: true },
    });
  }

  static async expireOffers() {
    const now = new Date();
    const result = await prisma.marketplaceOffer.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });
    return result.count;
  }

  static async findExpiredOffers() {
    const now = new Date();
    return prisma.marketplaceOffer.findMany({
      where: {
        status: 'EXPIRED',
        expiresAt: {
          lt: now,
          gte: new Date(now.getTime() - RECENT_EXPIRY_WINDOW_MS),
        },
      },
      select: { id: true, userId: true, listingId: true },
    });
  }
}
