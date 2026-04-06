import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/require-admin';
import { searchLimiter, writeLimiter } from '../config/rate-limit';

const router = Router();

// ── Public reads ──────────────────────────────────────────────────────────
router.get('/', searchLimiter, ProductController.list);
router.get('/manufacturers', ProductController.getManufacturers);
router.get('/spec-fields/:category', ProductController.getSpecFields);
router.get('/slug/:slug', ProductController.getBySlug);
router.get('/:id', ProductController.getById);

// ── Admin writes (auth + RBAC) ───────────────────────────────────────────
router.post('/', authenticate, requireAdmin, writeLimiter, ProductController.create);
router.put('/:id', authenticate, requireAdmin, writeLimiter, ProductController.update);
router.delete('/:id', authenticate, requireAdmin, writeLimiter, ProductController.delete);

export default router;
