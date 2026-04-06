import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/require-admin';
import { searchLimiter } from '../config/rate-limit';

const router = Router();

// Public instant search (rate-limited)
router.get('/', searchLimiter, SearchController.instantSearch);

// Admin: force full re-sync of all indexes
router.post('/sync', authenticate, requireAdmin, SearchController.syncAll);

export default router;
