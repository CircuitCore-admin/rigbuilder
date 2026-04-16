import { Router } from 'express';
import { LeaderboardController } from '../controllers/leaderboard.controller';
import { searchLimiter } from '../config/rate-limit';

const router = Router();

router.get('/contributors', searchLimiter, LeaderboardController.topContributors);
router.get('/sellers', searchLimiter, LeaderboardController.topSellers);
router.get('/helpers', searchLimiter, LeaderboardController.topHelpers);

export default router;
