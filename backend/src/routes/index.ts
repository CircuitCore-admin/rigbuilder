import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import userRoutes from './user.routes';
import buildRoutes from './build.routes';
import reviewRoutes from './review.routes';
import upvoteRoutes from './upvote.routes';
import commentRoutes from './comment.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/builds', buildRoutes);
router.use('/reviews', reviewRoutes);
router.use('/upvotes', upvoteRoutes);
router.use('/comments', commentRoutes);
router.use('/uploads', uploadRoutes);

export default router;
