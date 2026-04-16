import { Router } from 'express';
import { GuideController } from '../controllers/guide.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/require-admin';
import { searchLimiter, writeLimiter } from '../config/rate-limit';

const router = Router();

// Workflow routes (BEFORE /:slug)
router.get('/pending', authenticate, searchLimiter, GuideController.pendingReview);
router.get('/mine', authenticate, searchLimiter, GuideController.myGuides);
router.post('/:id/submit', authenticate, writeLimiter, GuideController.submitForReview);
router.put('/:id/publish', authenticate, writeLimiter, GuideController.publish);
router.put('/:id/reject', authenticate, writeLimiter, GuideController.reject);

// Public reads
router.get('/', searchLimiter, GuideController.list);
router.get('/:slug', searchLimiter, GuideController.getBySlug);

// Any authenticated user can create; admin can update/delete any
router.post('/', authenticate, writeLimiter, GuideController.create);
router.put('/:id', authenticate, requireAdmin, writeLimiter, GuideController.update);
router.delete('/:id', authenticate, requireAdmin, writeLimiter, GuideController.delete);

export default router;
