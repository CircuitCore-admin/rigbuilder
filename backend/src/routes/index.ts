import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import userRoutes from './user.routes';
import buildRoutes from './build.routes';
import reviewRoutes from './review.routes';
import searchRoutes from './search.routes';
import priceHistoryRoutes from './price-history.routes';
import forumRoutes from './forum.routes';
import guideRoutes from './guide.routes';
import uploadRoutes from './upload.routes';
import marketplaceRoutes from './marketplace.routes';
import notificationRoutes from './notification.routes';
import leaderboardRoutes from './leaderboard.routes';

const router = Router();

// Lightweight CSRF token endpoint — no DB query, just sets the cookie via global CSRF middleware
router.get('/csrf', (_req, res) => {
  res.json({ ok: true });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/builds', buildRoutes);
router.use('/reviews', reviewRoutes);
router.use('/search', searchRoutes);
router.use('/price-history', priceHistoryRoutes);
router.use('/forum', forumRoutes);
router.use('/guides', guideRoutes);
router.use('/uploads', uploadRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/leaderboards', leaderboardRoutes);

export default router;
