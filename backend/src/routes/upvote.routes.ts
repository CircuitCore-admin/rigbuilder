import { Router } from 'express';
import { UpvoteController } from '../controllers/upvote.controller';
import { authenticate, optionalAuth } from '../middleware/authenticate';
import { writeLimiter } from '../config/rate-limit';

const router = Router();

router.post('/:type/:id', authenticate, writeLimiter, UpvoteController.toggle);
router.get('/:type/:id', optionalAuth, UpvoteController.status);

export default router;
