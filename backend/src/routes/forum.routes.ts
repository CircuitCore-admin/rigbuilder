import { Router } from 'express';
import { ForumController } from '../controllers/forum.controller';
import { authenticate } from '../middleware/authenticate';
import { searchLimiter, writeLimiter } from '../config/rate-limit';

const router = Router();

// Public reads
router.get('/', searchLimiter, ForumController.listThreads);
router.get('/related/:productId', searchLimiter, ForumController.relatedDiscussions);
router.get('/:slug', searchLimiter, ForumController.getThread);
router.get('/:slug/replies', searchLimiter, ForumController.getReplies);

// Authenticated writes
router.post('/', authenticate, writeLimiter, ForumController.createThread);
router.put('/:id', authenticate, writeLimiter, ForumController.updateThread);
router.delete('/:id', authenticate, writeLimiter, ForumController.deleteThread);
router.post('/:slug/replies', authenticate, writeLimiter, ForumController.createReply);
router.post('/replies/:id/upvote', authenticate, writeLimiter, ForumController.upvoteReply);

// Thread following
router.post('/threads/:id/follow', authenticate, writeLimiter, ForumController.toggleFollow);
router.get('/threads/:id/following', authenticate, searchLimiter, ForumController.isFollowing);

// Notifications
router.get('/notifications', authenticate, searchLimiter, ForumController.getNotifications);
router.put('/notifications/read', authenticate, writeLimiter, ForumController.markNotificationsRead);

export default router;
