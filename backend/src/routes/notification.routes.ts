import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/authenticate';
import { searchLimiter, writeLimiter } from '../config/rate-limit';

const router = Router();

router.get('/', authenticate, searchLimiter, NotificationController.getNotifications);
router.get('/unread-count', authenticate, searchLimiter, NotificationController.getUnreadCount);
router.put('/read', authenticate, writeLimiter, NotificationController.markRead);

export default router;
