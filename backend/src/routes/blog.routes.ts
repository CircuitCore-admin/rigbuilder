import { Router } from 'express';
import { BlogController } from '../controllers/blog.controller';
import { authenticate, optionalAuth } from '../middleware/authenticate';
import { sanitize } from '../middleware/sanitize';
import { validate } from '../middleware/validate';
import { searchLimiter, writeLimiter } from '../config/rate-limit';
import { createBlogSchema, updateBlogSchema } from '../validators/blog.schema';

const router = Router();

router.get('/', searchLimiter, BlogController.list);
router.get('/:slug', optionalAuth, searchLimiter, BlogController.getBySlug);
router.post('/', authenticate, writeLimiter, sanitize, validate(createBlogSchema), BlogController.create);
router.put('/:id', authenticate, writeLimiter, sanitize, validate(updateBlogSchema), BlogController.update);
router.delete('/:id', authenticate, BlogController.delete);

export default router;
