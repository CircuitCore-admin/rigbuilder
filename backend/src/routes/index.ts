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

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/builds', buildRoutes);
router.use('/reviews', reviewRoutes);
router.use('/search', searchRoutes);
router.use('/price-history', priceHistoryRoutes);
router.use('/forum', forumRoutes);
router.use('/guides', guideRoutes);

export default router;
