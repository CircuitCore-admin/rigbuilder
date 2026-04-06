import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import userRoutes from './user.routes';
import buildRoutes from './build.routes';
import reviewRoutes from './review.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/builds', buildRoutes);
router.use('/reviews', reviewRoutes);

export default router;
