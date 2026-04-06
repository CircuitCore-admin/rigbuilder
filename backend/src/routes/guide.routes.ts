import { Router } from 'express';
import { GuideController } from '../controllers/guide.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/require-admin';
import { searchLimiter, writeLimiter } from '../config/rate-limit';

const router = Router();

// Public reads
router.get('/', searchLimiter, GuideController.list);
router.get('/:slug', searchLimiter, GuideController.getBySlug);

// Admin writes (guides are managed content)
router.post('/', authenticate, requireAdmin, writeLimiter, GuideController.create);
router.put('/:id', authenticate, requireAdmin, writeLimiter, GuideController.update);
router.delete('/:id', authenticate, requireAdmin, writeLimiter, GuideController.delete);

export default router;
