import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, optionalAuth } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/require-admin';
import { searchLimiter, writeLimiter } from '../config/rate-limit';

const router = Router();

// ── Public reads ──────────────────────────────────────────────────────────
router.get('/', searchLimiter, ProductController.list);
router.get('/compare', searchLimiter, ProductController.compare);
router.get('/manufacturers', ProductController.getManufacturers);
router.get('/spec-fields/:category', ProductController.getSpecFields);
router.get('/slug/:slug', ProductController.getBySlug);

// ── Price alerts ──────────────────────────────────────────────────────────
router.post('/:slug/price-alert', authenticate, writeLimiter, ProductController.setPriceAlert);
router.delete('/:slug/price-alert', authenticate, ProductController.removePriceAlert);
router.get('/:slug/price-alert', optionalAuth, ProductController.getPriceAlert);

router.get('/:id', ProductController.getById);

// ── Admin writes (auth + RBAC) ───────────────────────────────────────────
router.post('/', authenticate, requireAdmin, writeLimiter, ProductController.create);
router.put('/:id', authenticate, requireAdmin, writeLimiter, ProductController.update);
router.delete('/:id', authenticate, requireAdmin, writeLimiter, ProductController.delete);

export default router;
