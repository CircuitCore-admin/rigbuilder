import { Router } from 'express';
import { ForumController } from '../controllers/forum.controller';
import { authenticate, optionalAuth } from '../middleware/authenticate';
import { searchLimiter, writeLimiter } from '../config/rate-limit';

const router = Router();

// Public reads
router.get('/', searchLimiter, ForumController.listThreads);
router.get('/related/:productId', searchLimiter, ForumController.relatedDiscussions);

// Combined thread + replies endpoint (must be before /:slug catch-all)
router.get('/:slug/full', optionalAuth, searchLimiter, ForumController.getThreadFull);

router.get('/:slug', searchLimiter, ForumController.getThread);
router.get('/:slug/replies', searchLimiter, ForumController.getReplies);

// Authenticated writes
router.post('/', authenticate, writeLimiter, ForumController.createThread);
router.put('/:id', authenticate, writeLimiter, ForumController.updateThread);
router.delete('/:id', authenticate, writeLimiter, ForumController.deleteThread);
router.post('/:slug/replies', authenticate, writeLimiter, ForumController.createReply);
router.put('/:slug/pin', authenticate, writeLimiter, ForumController.togglePin);
router.put('/:slug/lock', authenticate, writeLimiter, ForumController.toggleLock);
router.post('/replies/:id/upvote', authenticate, writeLimiter, ForumController.upvoteReply);
router.post('/replies/:id/vote', authenticate, writeLimiter, ForumController.voteReply);

// Thread following & voting
router.post('/threads/:id/follow', authenticate, writeLimiter, ForumController.toggleFollow);
router.get('/threads/:id/following', authenticate, searchLimiter, ForumController.isFollowing);
router.post('/threads/:id/vote', authenticate, writeLimiter, ForumController.voteThread);
router.get('/threads/:id/vote', searchLimiter, ForumController.getThreadVote);

// Notifications
router.get('/notifications', authenticate, searchLimiter, ForumController.getNotifications);
router.put('/notifications/read', authenticate, writeLimiter, ForumController.markNotificationsRead);

export default router;
