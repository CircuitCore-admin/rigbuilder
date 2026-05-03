import { Router } from 'express';
import { MarketplaceController } from '../controllers/marketplace.controller';
import { authenticate, optionalAuth } from '../middleware/authenticate';
import { searchLimiter, writeLimiter } from '../config/rate-limit';
import { validate } from '../middleware/validate';
import { sanitize } from '../middleware/sanitize';
import {
  createListingSchema,
  updateListingSchema,
  updateListingStatusSchema,
  createOfferSchema,
  updateOfferSchema,
  counterOfferSchema,
  sendMessageSchema,
  createReportSchema,
  reviewReportSchema,
  createReviewSchema,
  markNotificationsReadSchema,
} from '../validators/marketplace.schema';

const router = Router();

// Public reads
router.get('/', optionalAuth, searchLimiter, MarketplaceController.listListings);
router.get('/my-listings', authenticate, searchLimiter, MarketplaceController.getMyListings);

// Notifications (before :id catch-all)
router.get('/notifications', authenticate, searchLimiter, MarketplaceController.getNotifications);
router.put('/notifications/read', authenticate, writeLimiter, validate(markNotificationsReadSchema), MarketplaceController.markNotificationsRead);

// Conversations (before :id catch-all)
router.get('/conversations', authenticate, searchLimiter, MarketplaceController.getConversations);
router.get('/conversations/:conversationId', authenticate, searchLimiter, MarketplaceController.getConversationMessages);

// Messages
router.post('/messages', authenticate, writeLimiter, validate(sendMessageSchema), sanitize, MarketplaceController.sendMessage);

// Offers management
router.put('/offers/:offerId', authenticate, writeLimiter, validate(updateOfferSchema), MarketplaceController.updateOffer);
router.post('/offers/:offerId/counter', authenticate, writeLimiter, validate(counterOfferSchema), MarketplaceController.counterOffer);
router.delete('/offers/:offerId', authenticate, writeLimiter, MarketplaceController.withdrawOffer);

// Reports (admin)
router.get('/reports', authenticate, searchLimiter, MarketplaceController.getReports);
router.put('/reports/:reportId', authenticate, writeLimiter, validate(reviewReportSchema), MarketplaceController.reviewReport);

// Seller reviews
router.get('/users/:userId/reviews', searchLimiter, MarketplaceController.getSellerReviews);

// Wishlisted listings (before :id catch-all)
router.get('/wishlisted', authenticate, searchLimiter, MarketplaceController.getWishlistedListings);

// Single listing routes
router.get('/:id/related', searchLimiter, MarketplaceController.getRelatedListings);
router.get('/:id/wishlist', optionalAuth, searchLimiter, MarketplaceController.isWishlisted);
router.post('/:id/wishlist', authenticate, writeLimiter, MarketplaceController.toggleWishlist);
router.get('/:id', optionalAuth, searchLimiter, MarketplaceController.getListingById);
router.post('/', authenticate, writeLimiter, validate(createListingSchema), sanitize, MarketplaceController.createListing);
router.put('/:id', authenticate, writeLimiter, validate(updateListingSchema), sanitize, MarketplaceController.updateListing);
router.delete('/:id', authenticate, writeLimiter, MarketplaceController.deleteListing);
router.post('/:id/extend', authenticate, writeLimiter, MarketplaceController.extendListing);
router.post('/:id/status', authenticate, writeLimiter, validate(updateListingStatusSchema), MarketplaceController.updateListingStatus);

// Listing offers
router.get('/:id/offers', optionalAuth, searchLimiter, MarketplaceController.getOffers);
router.post('/:id/offers', authenticate, writeLimiter, validate(createOfferSchema), MarketplaceController.createOffer);

// Listing report
router.post('/:id/report', authenticate, writeLimiter, validate(createReportSchema), MarketplaceController.reportListing);

// Listing review
router.post('/:id/review', authenticate, writeLimiter, validate(createReviewSchema), MarketplaceController.createReview);

export default router;
