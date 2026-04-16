import { Router } from 'express';
import { BuildController } from '../controllers/build.controller';
import { authenticate, optionalAuth } from '../middleware/authenticate';
import { sanitize } from '../middleware/sanitize';
import { writeLimiter, searchLimiter } from '../config/rate-limit';

const router = Router();

router.get('/compare', searchLimiter, BuildController.compare);
router.get('/templates', searchLimiter, BuildController.getTemplates);
router.get('/', searchLimiter, BuildController.list);
router.get('/:id', BuildController.getById);
router.post('/', authenticate, writeLimiter, sanitize, BuildController.create);
router.put('/:id', authenticate, writeLimiter, sanitize, BuildController.update);
router.delete('/:id', authenticate, BuildController.delete);

export default router;
