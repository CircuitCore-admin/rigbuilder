import { Router } from 'express';
import { QAController } from '../controllers/qa.controller';
import { authenticate } from '../middleware/authenticate';
import { sanitize } from '../middleware/sanitize';
import { searchLimiter, writeLimiter } from '../config/rate-limit';

const router = Router();

router.get('/products/:productId/questions', searchLimiter, QAController.listQuestions);
router.post('/products/:productId/questions', authenticate, writeLimiter, sanitize, QAController.askQuestion);
router.post('/questions/:questionId/answers', authenticate, writeLimiter, sanitize, QAController.postAnswer);
router.put('/answers/:answerId/accept', authenticate, QAController.acceptAnswer);

export default router;
