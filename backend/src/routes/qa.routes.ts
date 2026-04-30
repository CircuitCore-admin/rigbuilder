import { Router } from 'express';
import { QAController } from '../controllers/qa.controller';
import { authenticate } from '../middleware/authenticate';
import { sanitize } from '../middleware/sanitize';
import { validate } from '../middleware/validate';
import { searchLimiter, writeLimiter } from '../config/rate-limit';
import { askQuestionSchema, postAnswerSchema } from '../validators/qa.schema';

const router = Router();

router.get('/products/:productId/questions', searchLimiter, QAController.listQuestions);
router.post('/products/:productId/questions', authenticate, writeLimiter, sanitize, validate(askQuestionSchema), QAController.askQuestion);
router.post('/questions/:questionId/answers', authenticate, writeLimiter, sanitize, validate(postAnswerSchema), QAController.postAnswer);
router.put('/answers/:answerId/accept', authenticate, QAController.acceptAnswer);

export default router;
