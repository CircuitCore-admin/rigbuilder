import { Router } from 'express';
import { BlogController } from '../controllers/blog.controller';
import { authenticate, optionalAuth } from '../middleware/authenticate';
import { searchLimiter, writeLimiter } from '../config/rate-limit';

const router = Router();

router.get('/', searchLimiter, BlogController.list);
router.get('/:slug', optionalAuth, searchLimiter, BlogController.getBySlug);
router.post('/', authenticate, writeLimiter, BlogController.create);
router.put('/:id', authenticate, writeLimiter, BlogController.update);
router.delete('/:id', authenticate, BlogController.delete);

export default router;
