import { Router } from 'express';
import { LandingController } from '../controllers/landing.controller';
import { searchLimiter } from '../config/rate-limit';

const router = Router();

router.get('/homepage', searchLimiter, LandingController.getHomepageData);
router.get('/:category', searchLimiter, LandingController.getCategoryData);

export default router;
