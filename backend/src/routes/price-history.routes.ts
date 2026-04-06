import { Router } from 'express';
import { PriceHistoryController } from '../controllers/price-history.controller';
import { searchLimiter } from '../config/rate-limit';

const router = Router();

router.get('/:productId', searchLimiter, PriceHistoryController.getHistory);
router.get('/:productId/latest', searchLimiter, PriceHistoryController.getLatest);

export default router;
