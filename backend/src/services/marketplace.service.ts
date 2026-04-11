import { MarketplaceRepository } from '../repositories/marketplace.repository';
import type { ListingListParams } from '../repositories/marketplace.repository';
import type { ListingStatus, MarketplaceListingType } from '@prisma/client';
import { prisma } from '../prisma';
import { encryptMessage, decryptMessage, generateConversationId } from '../utils/marketplace-encryption';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LISTING_EXPIRY_DAYS = 31;
const LISTING_EXPIRY_MS = LISTING_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
const OFFER_EXPIRY_DAYS = 7;
const OFFER_EXPIRY_MS = OFFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
const MIN_ACCOUNT_AGE_MS = 5 * 60 * 1000; // 5 minutes
const MESSAGE_PREVIEW_MAX_LENGTH = 100;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class MarketplaceService {
  // -------------------------------------------------------------------------
  // Listings
  // -------------------------------------------------------------------------

  static async listListings(params: ListingListParams) {
    return MarketplaceRepository.findListings(params);
  }

  static async getListingById(id: string) {
    const listing = await MarketplaceRepository.findListingById(id);
    if (!listing) throw new NotFoundError('Listing not found');
    return listing;
  }

  static async createListing(
    data: {
      type: MarketplaceListingType;
      title: string;
      description: string;
      category: string;
      condition?: string | null;
      price?: number | null;
      minimumOffer?: number | null;
      currency?: string;
      pricingType: string;
      country: string;
      region?: string | null;
      shippingOptions: string[];
      discordUsername?: string | null;
      productId?: string | null;
      imageUrls?: string[];
    },
    userId: string,
  ) {
    // Check account age (at least 5 minutes old)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (!user) throw new NotFoundError('User not found');
    const accountAgeMs = Date.now() - user.createdAt.getTime();
    if (accountAgeMs < MIN_ACCOUNT_AGE_MS) {
      throw new BadRequestError('Your account must be at least 5 minutes old to create a listing');
    }

    const expiresAt = new Date(Date.now() + LISTING_EXPIRY_MS);

    const listing = await MarketplaceRepository.createListing({
      type: data.type as any,
      title: data.title,
      description: data.description,
      category: data.category,
      ...(data.condition && { condition: data.condition as any }),
      ...(data.price != null && { price: data.price }),
      ...(data.minimumOffer != null && { minimumOffer: data.minimumOffer }),
      currency: (data.currency as any) || 'GBP',
      pricingType: data.pricingType as any,
      country: data.country,
      ...(data.region && { region: data.region }),
      shippingOptions: data.shippingOptions as any,
      ...(data.discordUsername && { discordUsername: data.discordUsername }),
      ...(data.productId && { product: { connect: { id: data.productId } } }),
      imageUrls: data.imageUrls || [],
      expiresAt,
      user: { connect: { id: userId } },
    });

    // Fire-and-forget matching
    this.runMatching(listing).catch(() => {});

    return listing;
  }

  static async updateListing(
    id: string,
    data: Record<string, unknown>,
    userId: string,
    role: string,
  ) {
    const listing = await MarketplaceRepository.findListingById(id);
    if (!listing) throw new NotFoundError('Listing not found');

    const isStaff = role === 'ADMIN' || role === 'MODERATOR';
    if (listing.userId !== userId && !isStaff) {
      throw new ForbiddenError('You do not have permission to edit this listing');
    }

    // Build update payload — strip out fields that shouldn't go directly to Prisma
    const { productId, buildPermalink, ...updateData } = data as any;
    const prismaData: Record<string, unknown> = { ...updateData };

    if (productId !== undefined) {
      prismaData.product = productId ? { connect: { id: productId } } : { disconnect: true };
    }

    return MarketplaceRepository.updateListing(id, prismaData);
  }

  static async deleteListing(id: string, userId: string, role: string) {
    const listing = await MarketplaceRepository.findListingById(id);
    if (!listing) throw new NotFoundError('Listing not found');

    const isStaff = role === 'ADMIN' || role === 'MODERATOR';
    if (listing.userId !== userId && !isStaff) {
      throw new ForbiddenError('You do not have permission to delete this listing');
    }

    await MarketplaceRepository.deleteListing(id);
  }

  static async incrementViewCount(id: string) {
    await MarketplaceRepository.incrementViewCount(id);
  }

  static async extendListing(id: string, userId: string) {
    const listing = await MarketplaceRepository.findListingById(id);
    if (!listing) throw new NotFoundError('Listing not found');
    if (listing.userId !== userId) {
      throw new ForbiddenError('You can only extend your own listings');
    }
    if (listing.status !== 'ACTIVE' && listing.status !== 'EXPIRED') {
      throw new BadRequestError('Only active or expired listings can be extended');
    }

    return MarketplaceRepository.extendListing(id);
  }

  static async updateListingStatus(id: string, status: ListingStatus, userId: string, role: string) {
    const listing = await MarketplaceRepository.findListingById(id);
    if (!listing) throw new NotFoundError('Listing not found');

    const isStaff = role === 'ADMIN' || role === 'MODERATOR';

    // Only staff can set REMOVED_BY_MOD
    if (status === 'REMOVED_BY_MOD' && !isStaff) {
      throw new ForbiddenError('Only staff can remove listings');
    }

    // Owner or staff can change status
    if (listing.userId !== userId && !isStaff) {
      throw new ForbiddenError('You do not have permission to change this listing status');
    }

    // Validate allowed transitions
    const allowed: Record<string, ListingStatus[]> = {
      ACTIVE: ['RESERVED', 'SOLD', 'FOUND', 'REMOVED_BY_MOD'],
      RESERVED: ['ACTIVE', 'SOLD', 'FOUND', 'REMOVED_BY_MOD'],
      EXPIRED: ['ACTIVE', 'REMOVED_BY_MOD'],
    };

    const currentAllowed = allowed[listing.status] || [];
    if (!isStaff && !currentAllowed.includes(status)) {
      throw new BadRequestError(`Cannot transition from ${listing.status} to ${status}`);
    }

    return MarketplaceRepository.updateListingStatus(id, status);
  }

  static async getMyListings(userId: string) {
    return MarketplaceRepository.findUserListings(userId);
  }

  static async getSellerOtherListings(sellerId: string, excludeListingId: string) {
    return MarketplaceRepository.findSellerOtherListings(sellerId, excludeListingId);
  }

  static async getSimilarListings(category: string, excludeListingId: string, excludeSellerId: string) {
    return MarketplaceRepository.findSimilarListings(category, excludeListingId, excludeSellerId);
  }

  // -------------------------------------------------------------------------
  // Offers
  // -------------------------------------------------------------------------

  static async getOffers(listingId: string, userId?: string) {
    const listing = await MarketplaceRepository.findListingById(listingId);
    if (!listing) throw new NotFoundError('Listing not found');

    const isListingSeller = listing.userId === userId;
    return MarketplaceRepository.findOffers(listingId, userId, isListingSeller);
  }

  static async createOffer(
    listingId: string,
    userId: string,
    data: { amount: number; currency?: string; message?: string | null },
  ) {
    const listing = await MarketplaceRepository.findListingById(listingId);
    if (!listing) throw new NotFoundError('Listing not found');

    if (listing.userId === userId) {
      throw new BadRequestError('You cannot make an offer on your own listing');
    }

    if (listing.status !== 'ACTIVE') {
      throw new BadRequestError('This listing is not accepting offers');
    }

    // Validate minimum offer
    if (listing.minimumOffer != null && data.amount < Number(listing.minimumOffer)) {
      throw new BadRequestError(`Offer must be at least ${listing.minimumOffer}`);
    }

    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_MS);

    const offer = await MarketplaceRepository.createOffer({
      amount: data.amount,
      currency: (data.currency as any) || 'GBP',
      ...(data.message && { message: data.message }),
      expiresAt,
      listing: { connect: { id: listingId } },
      user: { connect: { id: userId } },
    });

    // Notify seller (fire-and-forget)
    MarketplaceRepository.createNotification({
      userId: listing.userId,
      type: 'NEW_OFFER',
      listingId,
      referenceId: offer.id,
      message: `New offer of ${data.amount} on "${listing.title}"`,
    }).catch(() => {});

    return offer;
  }

  static async updateOffer(offerId: string, userId: string, role: string, status: 'ACCEPTED' | 'REJECTED') {
    const offer = await MarketplaceRepository.findOfferById(offerId);
    if (!offer) throw new NotFoundError('Offer not found');

    const isStaff = role === 'ADMIN' || role === 'MODERATOR';

    // Only the listing seller (or staff) can accept/reject
    if (offer.listing.userId !== userId && !isStaff) {
      throw new ForbiddenError('Only the listing seller can accept or reject offers');
    }

    if (offer.status !== 'PENDING') {
      throw new BadRequestError('This offer is no longer pending');
    }

    if (status === 'ACCEPTED') {
      await MarketplaceRepository.acceptOffer(offerId);

      // Notify offer maker
      MarketplaceRepository.createNotification({
        userId: offer.userId,
        type: 'OFFER_ACCEPTED',
        listingId: offer.listingId,
        referenceId: offerId,
        message: `Your offer on "${offer.listing.title}" was accepted!`,
      }).catch(() => {});

      return MarketplaceRepository.findOfferById(offerId);
    }

    const updated = await MarketplaceRepository.updateOffer(offerId, { status: 'REJECTED' });

    // Notify offer maker
    MarketplaceRepository.createNotification({
      userId: offer.userId,
      type: 'OFFER_REJECTED',
      listingId: offer.listingId,
      referenceId: offerId,
      message: `Your offer on "${offer.listing.title}" was rejected`,
    }).catch(() => {});

    return updated;
  }

  static async withdrawOffer(offerId: string, userId: string) {
    const offer = await MarketplaceRepository.findOfferById(offerId);
    if (!offer) throw new NotFoundError('Offer not found');

    if (offer.userId !== userId) {
      throw new ForbiddenError('You can only withdraw your own offers');
    }

    if (offer.status !== 'PENDING') {
      throw new BadRequestError('This offer is no longer pending');
    }

    await MarketplaceRepository.updateOffer(offerId, { status: 'WITHDRAWN' });
  }

  // -------------------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------------------

  static async getConversations(userId: string) {
    const conversations = await MarketplaceRepository.findConversations(userId);

    // Decrypt last message preview
    return conversations.map((conv) => {
      let lastMessagePreview = '';
      try {
        lastMessagePreview = decryptMessage(conv.conversationId, conv.lastMessage.body);
        if (lastMessagePreview.length > MESSAGE_PREVIEW_MAX_LENGTH) {
          lastMessagePreview = lastMessagePreview.substring(0, MESSAGE_PREVIEW_MAX_LENGTH) + '...';
        }
      } catch {
        lastMessagePreview = '[Encrypted message]';
      }

      return {
        conversationId: conv.conversationId,
        lastMessage: {
          id: conv.lastMessage.id,
          senderId: conv.lastMessage.senderId,
          sender: conv.lastMessage.sender,
          recipient: conv.lastMessage.recipient,
          listing: conv.lastMessage.listing,
          preview: lastMessagePreview,
          createdAt: conv.lastMessage.createdAt,
          readAt: conv.lastMessage.readAt,
        },
        unreadCount: conv.unreadCount,
      };
    });
  }

  static async getMessages(conversationId: string, userId: string) {
    const messages = await MarketplaceRepository.findMessages(conversationId);

    // Verify user is a participant
    if (messages.length > 0) {
      const first = messages[0];
      if (first.senderId !== userId && first.recipientId !== userId) {
        throw new ForbiddenError('You are not a participant in this conversation');
      }
    }

    // Mark messages as read (fire-and-forget)
    MarketplaceRepository.markMessagesRead(conversationId, userId).catch(() => {});

    // Decrypt all messages
    return messages.map((msg) => {
      let decryptedBody = '';
      try {
        decryptedBody = decryptMessage(conversationId, msg.body);
      } catch {
        decryptedBody = '[Unable to decrypt message]';
      }

      return {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        recipientId: msg.recipientId,
        sender: msg.sender,
        recipient: msg.recipient,
        listing: msg.listing,
        body: decryptedBody,
        readAt: msg.readAt,
        createdAt: msg.createdAt,
      };
    });
  }

  static async sendMessage(
    userId: string,
    data: { listingId: string; recipientId: string; body: string },
  ) {
    if (userId === data.recipientId) {
      throw new BadRequestError('You cannot send a message to yourself');
    }

    // Verify listing exists
    const listing = await MarketplaceRepository.findListingById(data.listingId);
    if (!listing) throw new NotFoundError('Listing not found');

    const conversationId = generateConversationId(userId, data.recipientId, data.listingId);
    const encryptedBody = encryptMessage(conversationId, data.body);

    const message = await MarketplaceRepository.createMessage({
      conversationId,
      body: encryptedBody,
      listing: { connect: { id: data.listingId } },
      sender: { connect: { id: userId } },
      recipient: { connect: { id: data.recipientId } },
    });

    // Notify recipient (fire-and-forget)
    MarketplaceRepository.createNotification({
      userId: data.recipientId,
      type: 'NEW_MESSAGE',
      listingId: data.listingId,
      referenceId: message.id,
      message: `New message about "${listing.title}"`,
    }).catch(() => {});

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      recipientId: message.recipientId,
      sender: message.sender,
      recipient: message.recipient,
      listing: message.listing,
      body: data.body, // Return the plain text body
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }

  // -------------------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------------------

  static async reportListing(
    listingId: string,
    userId: string,
    data: { reason: string; details?: string | null },
  ) {
    const listing = await MarketplaceRepository.findListingById(listingId);
    if (!listing) throw new NotFoundError('Listing not found');

    if (listing.userId === userId) {
      throw new BadRequestError('You cannot report your own listing');
    }

    const report = await MarketplaceRepository.createReport({
      reason: data.reason as any,
      ...(data.details && { details: data.details }),
      listing: { connect: { id: listingId } },
      reporter: { connect: { id: userId } },
    });

    // Notify listing owner (fire-and-forget)
    MarketplaceRepository.createNotification({
      userId: listing.userId,
      type: 'LISTING_REPORTED',
      listingId,
      message: `Your listing "${listing.title}" has been reported`,
    }).catch(() => {});

    return report;
  }

  static async getReports(params: { page: number; limit: number; status?: string }) {
    return MarketplaceRepository.findReports({
      page: params.page,
      limit: params.limit,
      ...(params.status && { status: params.status as any }),
    });
  }

  static async reviewReport(
    reportId: string,
    userId: string,
    data: { status: 'REVIEWED_APPROVED' | 'REVIEWED_REMOVED' },
  ) {
    const report = await MarketplaceRepository.findReportById(reportId);
    if (!report) throw new NotFoundError('Report not found');

    const updated = await MarketplaceRepository.updateReport(reportId, {
      status: data.status,
      reviewedBy: userId,
      reviewedAt: new Date(),
    });

    // If removed, update listing status and notify owner
    if (data.status === 'REVIEWED_REMOVED' && report.listing) {
      await MarketplaceRepository.updateListingStatus(report.listingId, 'REMOVED_BY_MOD');

      MarketplaceRepository.createNotification({
        userId: report.listing.userId,
        type: 'LISTING_REMOVED',
        listingId: report.listingId,
        message: `Your listing "${report.listing.title}" has been removed by a moderator`,
      }).catch(() => {});
    }

    return updated;
  }

  // -------------------------------------------------------------------------
  // Reviews
  // -------------------------------------------------------------------------

  static async createReview(
    listingId: string,
    userId: string,
    data: { rating: number; body?: string | null },
  ) {
    const listing = await MarketplaceRepository.findListingById(listingId);
    if (!listing) throw new NotFoundError('Listing not found');

    if (listing.userId === userId) {
      throw new BadRequestError('You cannot review your own listing');
    }

    // Verify the reviewer had an accepted offer on this listing
    const offers = await prisma.marketplaceOffer.findMany({
      where: {
        listingId,
        userId,
        status: 'ACCEPTED',
      },
    });

    if (offers.length === 0) {
      throw new BadRequestError('You can only review listings where your offer was accepted');
    }

    const review = await MarketplaceRepository.createReview({
      rating: data.rating,
      ...(data.body && { body: data.body }),
      listing: { connect: { id: listingId } },
      reviewer: { connect: { id: userId } },
      seller: { connect: { id: listing.userId } },
    });

    // Notify seller (fire-and-forget)
    MarketplaceRepository.createNotification({
      userId: listing.userId,
      type: 'REVIEW_RECEIVED',
      listingId,
      referenceId: review.id,
      message: `You received a ${data.rating}-star review on "${listing.title}"`,
    }).catch(() => {});

    return review;
  }

  static async getSellerReviews(sellerId: string) {
    return MarketplaceRepository.findReviewsBySeller(sellerId);
  }

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------

  static async getNotifications(userId: string, params: { page: number; limit: number; unreadOnly?: boolean }) {
    return MarketplaceRepository.findNotifications(userId, params);
  }

  static async markNotificationsRead(userId: string, ids?: string[]) {
    return MarketplaceRepository.markNotificationsRead(userId, ids);
  }

  // -------------------------------------------------------------------------
  // Matching (fire-and-forget)
  // -------------------------------------------------------------------------

  static async runMatching(listing: { id: string; type: any; category: string; title: string; productId?: string | null; userId: string }) {
    if (listing.type === 'TRADING') return;

    const matches = await MarketplaceRepository.findMatchingListings(
      listing.type,
      listing.category,
      listing.productId,
    );

    const notifications = matches
      .filter((m) => m.userId !== listing.userId)
      .map((match) => ({
        userId: match.userId,
        type: 'LISTING_MATCH' as const,
        listingId: listing.id,
        referenceId: match.id,
        message: `A new listing "${listing.title}" matches your listing!`,
      }));

    if (notifications.length > 0) {
      await MarketplaceRepository.createNotifications(notifications);
    }
  }

  // -------------------------------------------------------------------------
  // Expiry
  // -------------------------------------------------------------------------

  static async expireListingsAndOffers() {
    const [expiredListingCount, expiredOfferCount] = await Promise.all([
      MarketplaceRepository.expireListings(),
      MarketplaceRepository.expireOffers(),
    ]);

    // Create notifications for expired listings
    const expiredListings = await MarketplaceRepository.findExpiredListingUserIds();
    if (expiredListings.length > 0) {
      await MarketplaceRepository.createNotifications(
        expiredListings.map((l) => ({
          userId: l.userId,
          type: 'LISTING_EXPIRED' as const,
          listingId: l.id,
          message: `Your listing "${l.title}" has expired`,
        })),
      );
    }

    // Create notifications for expiring-soon listings
    const expiringListings = await MarketplaceRepository.findExpiringListings(3);
    if (expiringListings.length > 0) {
      await MarketplaceRepository.createNotifications(
        expiringListings.map((l) => ({
          userId: l.userId,
          type: 'LISTING_EXPIRING_SOON' as const,
          listingId: l.id,
          message: `Your listing "${l.title}" is expiring soon`,
        })),
      );
    }

    // Create notifications for expired offers
    const expiredOffers = await MarketplaceRepository.findExpiredOffers();
    if (expiredOffers.length > 0) {
      await MarketplaceRepository.createNotifications(
        expiredOffers.map((o) => ({
          userId: o.userId,
          type: 'OFFER_EXPIRED' as const,
          listingId: o.listingId,
          message: 'Your offer has expired',
        })),
      );
    }

    return { expiredListingCount, expiredOfferCount };
  }
}
