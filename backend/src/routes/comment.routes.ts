import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { authenticate } from '../middleware/authenticate';
import { sanitize } from '../middleware/sanitize';
import { writeLimiter, searchLimiter } from '../config/rate-limit';

const router = Router();

router.get('/:type/:id', searchLimiter, CommentController.list);
router.post('/:type/:id', authenticate, writeLimiter, sanitize, CommentController.create);
router.delete('/:commentId', authenticate, CommentController.delete);

export default router;
