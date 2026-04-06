import { Router } from 'express';
import authRoutes from './auth.routes';
// import userRoutes from './user.routes';
// import productRoutes from './product.routes';
// import buildRoutes from './build.routes';
// import reviewRoutes from './review.routes';
// import compatibilityRoutes from './compatibility.routes';

const router = Router();

router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/products', productRoutes);
// router.use('/builds', buildRoutes);
// router.use('/reviews', reviewRoutes);
// router.use('/compatibility', compatibilityRoutes);

export default router;
