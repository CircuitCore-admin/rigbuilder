import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/authenticate';
import { sanitize } from '../middleware/sanitize';
import { writeLimiter, searchLimiter } from '../config/rate-limit';

const router = Router();

router.get('/', searchLimiter, ReviewController.list);
router.get('/:id', ReviewController.getById);
router.post('/', authenticate, writeLimiter, sanitize, ReviewController.create);
router.put('/:id', authenticate, writeLimiter, sanitize, ReviewController.update);
router.delete('/:id', authenticate, ReviewController.delete);

export default router;
