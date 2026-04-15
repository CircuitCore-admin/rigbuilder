import type { Request, Response } from 'express';
import { MarketplaceService, NotFoundError, ForbiddenError, BadRequestError } from '../services/marketplace.service';
import { MarketplaceRepository } from '../repositories/marketplace.repository';
import type { MarketplaceListingType, ItemCondition, Currency, ShippingOption, ListingStatus, ReportStatus } from '@prisma/client';

export class MarketplaceController {
  private static readonly VIEW_DEDUP_WINDOW_MS = 5 * 60 * 1000;

  // -------------------------------------------------------------------------
  // View counter dedup
  // -------------------------------------------------------------------------

  private static shouldIncrementView(req: Request, listingId: string): boolean {
    const viewKey = `mkt:${listingId}:${req.ip}`;
    if (!req.app.locals.recentViews) {
      req.app.locals.recentViews = new Set<string>();
    }
    const recentViews = req.app.locals.recentViews as Set<string>;

    if (!recentViews.has(viewKey)) {
      recentViews.add(viewKey);
      setTimeout(() => { recentViews.delete(viewKey); }, MarketplaceController.VIEW_DEDUP_WINDOW_MS);
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Listings
  // -------------------------------------------------------------------------

  /** GET /api/v1/marketplace */
  static async listListings(req: Request, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const shippingRaw = req.query.shippingOptions as string | undefined;
    const shippingOptions = shippingRaw ? shippingRaw.split(',') as ShippingOption[] : undefined;

    const { items, total } = await MarketplaceService.listListings({
      page,
      limit,
      type: req.query.type as MarketplaceListingType | undefined,
      category: req.query.category as string | undefined,
      condition: req.query.condition as ItemCondition | undefined,
      priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
      priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
      currency: req.query.currency as Currency | undefined,
      country: req.query.country as string | undefined,
      shippingOptions,
      status: req.query.status as ListingStatus | undefined,
      includeSold: req.query.includeSold === 'true',
      search: req.query.search as string | undefined,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortDir: (req.query.sortDir as any) || 'desc',
    });

    res.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /** GET /api/v1/marketplace/:id */
  static async getListingById(req: Request, res: Response) {
    try {
      const listing = await MarketplaceService.getListingById(req.params.id);

      if (MarketplaceController.shouldIncrementView(req, listing.id)) {
        await MarketplaceRepository.incrementViewCount(listing.id);
        listing.viewCount += 1;
      }

      res.json(listing);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  /** POST /api/v1/marketplace */
  static async createListing(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const listing = await MarketplaceService.createListing(req.body, session.userId);
      res.status(201).json(listing);
    } catch (err) {
      if (err instanceof BadRequestError) return res.status(400).json({ error: err.message });
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  /** PUT /api/v1/marketplace/:id */
  static async updateListing(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const listing = await MarketplaceService.updateListing(
        req.params.id,
        req.body,
        session.userId,
        session.role,
      );
      res.json(listing);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof ForbiddenError) return res.status(403).json({ error: err.message });
      throw err;
    }
  }

  /** DELETE /api/v1/marketplace/:id */
  static async deleteListing(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      await MarketplaceService.deleteListing(req.params.id, session.userId, session.role);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof ForbiddenError) return res.status(403).json({ error: err.message });
      throw err;
    }
  }

  /** POST /api/v1/marketplace/:id/extend */
  static async extendListing(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const listing = await MarketplaceService.extendListing(req.params.id, session.userId);
      res.json(listing);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof ForbiddenError) return res.status(403).json({ error: err.message });
      if (err instanceof BadRequestError) return res.status(400).json({ error: err.message });
      throw err;
    }
  }

  /** POST /api/v1/marketplace/:id/status */
  static async updateListingStatus(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const result = await MarketplaceService.updateListingStatus(
        req.params.id,
        req.body.status,
        session.userId,
        session.role,
      );
      res.json(result);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof ForbiddenError) return res.status(403).json({ error: err.message });
      if (err instanceof BadRequestError) return res.status(400).json({ error: err.message });
      throw err;
    }
  }

  /** GET /api/v1/marketplace/my-listings */
  static async getMyListings(req: Request, res: Response) {
    const session = (req as any).session;
    const listings = await MarketplaceService.getMyListings(session.userId);
    res.json(listings);
  }

  // -------------------------------------------------------------------------
  // Offers
  // -------------------------------------------------------------------------

  /** GET /api/v1/marketplace/:id/offers */
  static async getOffers(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const offers = await MarketplaceService.getOffers(req.params.id, session?.userId);
      res.json(offers);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  /** POST /api/v1/marketplace/:id/offers */
  static async createOffer(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const offer = await MarketplaceService.createOffer(req.params.id, session.userId, req.body);
      res.status(201).json(offer);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof BadRequestError) return res.status(400).json({ error: err.message });
      throw err;
    }
  }

  /** PUT /api/v1/marketplace/offers/:offerId */
  static async updateOffer(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const offer = await MarketplaceService.updateOffer(
        req.params.offerId,
        session.userId,
        session.role,
        req.body.status,
      );
      res.json(offer);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof ForbiddenError) return res.status(403).json({ error: err.message });
      if (err instanceof BadRequestError) return res.status(400).json({ error: err.message });
      throw err;
    }
  }

  /** DELETE /api/v1/marketplace/offers/:offerId */
  static async withdrawOffer(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      await MarketplaceService.withdrawOffer(req.params.offerId, session.userId);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof ForbiddenError) return res.status(403).json({ error: err.message });
      if (err instanceof BadRequestError) return res.status(400).json({ error: err.message });
      throw err;
    }
  }

  /** POST /api/v1/marketplace/offers/:offerId/counter */
  static async counterOffer(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const { amount, message } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount required' });
      const result = await MarketplaceService.counterOffer(req.params.offerId, session.userId, session.role, amount, message);
      res.json(result);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof ForbiddenError) return res.status(403).json({ error: err.message });
      if (err instanceof BadRequestError) return res.status(400).json({ error: err.message });
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------------------

  /** GET /api/v1/marketplace/conversations */
  static async getConversations(req: Request, res: Response) {
    const session = (req as any).session;
    const conversations = await MarketplaceService.getConversations(session.userId);
    res.json(conversations);
  }

  /** GET /api/v1/marketplace/conversations/:conversationId */
  static async getConversationMessages(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const messages = await MarketplaceService.getMessages(req.params.conversationId, session.userId);
      res.json(messages);
    } catch (err) {
      if (err instanceof ForbiddenError) return res.status(403).json({ error: err.message });
      throw err;
    }
  }

  /** POST /api/v1/marketplace/messages */
  static async sendMessage(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const message = await MarketplaceService.sendMessage(session.userId, req.body);
      res.status(201).json(message);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof BadRequestError) return res.status(400).json({ error: err.message });
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------------------

  /** POST /api/v1/marketplace/:id/report */
  static async reportListing(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const report = await MarketplaceService.reportListing(req.params.id, session.userId, req.body);
      res.status(201).json(report);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof BadRequestError) return res.status(400).json({ error: err.message });
      throw err;
    }
  }

  /** GET /api/v1/marketplace/reports */
  static async getReports(req: Request, res: Response) {
    const session = (req as any).session;
    const isStaff = session.role === 'ADMIN' || session.role === 'MODERATOR';
    if (!isStaff) {
      return res.status(403).json({ error: 'Staff access required' });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const { items, total } = await MarketplaceService.getReports({
      page,
      limit,
      status: req.query.status as string | undefined,
    });

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /** PUT /api/v1/marketplace/reports/:reportId */
  static async reviewReport(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const isStaff = session.role === 'ADMIN' || session.role === 'MODERATOR';
      if (!isStaff) {
        return res.status(403).json({ error: 'Staff access required' });
      }

      const report = await MarketplaceService.reviewReport(
        req.params.reportId,
        session.userId,
        req.body,
      );
      res.json(report);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Reviews
  // -------------------------------------------------------------------------

  /** POST /api/v1/marketplace/:id/review */
  static async createReview(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const review = await MarketplaceService.createReview(req.params.id, session.userId, req.body);
      res.status(201).json(review);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof BadRequestError) return res.status(400).json({ error: err.message });
      throw err;
    }
  }

  /** GET /api/v1/marketplace/users/:userId/reviews */
  static async getSellerReviews(req: Request, res: Response) {
    const reviews = await MarketplaceService.getSellerReviews(req.params.userId);
    res.json(reviews);
  }

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------

  /** GET /api/v1/marketplace/notifications */
  static async getNotifications(req: Request, res: Response) {
    const session = (req as any).session;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const unreadOnly = req.query.unread === 'true';

    const { items, total } = await MarketplaceService.getNotifications(session.userId, { page, limit, unreadOnly });
    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /** PUT /api/v1/marketplace/notifications/read */
  static async markNotificationsRead(req: Request, res: Response) {
    const session = (req as any).session;

    if (req.body.all) {
      await MarketplaceService.markNotificationsRead(session.userId);
    } else if (req.body.ids?.length) {
      await MarketplaceService.markNotificationsRead(session.userId, req.body.ids);
    }

    res.json({ success: true });
  }

  /** GET /api/v1/marketplace/:id/related */
  static async getRelatedListings(req: Request, res: Response) {
    try {
      const listing = await MarketplaceService.getListingById(req.params.id);
      if (!listing) return res.status(404).json({ error: 'Listing not found' });

      const [sellerListings, similarListings] = await Promise.all([
        MarketplaceService.getSellerOtherListings(listing.userId, listing.id),
        MarketplaceService.getSimilarListings(listing.category, listing.id, listing.userId),
      ]);

      res.json({ sellerListings, similarListings });
    } catch {
      res.status(500).json({ error: 'Failed to fetch related listings' });
    }
  }
}
