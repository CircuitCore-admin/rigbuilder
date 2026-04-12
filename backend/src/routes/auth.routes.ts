import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authLimiter, authSlowDown } from '../config/rate-limit';
import { registerSchema, loginSchema } from '../validators/auth.schema';

const router = Router();

router.post('/register', authLimiter, authSlowDown, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, authSlowDown, validate(loginSchema), AuthController.login);
router.post('/logout', authenticate, AuthController.logout);
router.post('/change-password', authenticate, AuthController.changePassword);
router.get('/me', authenticate, AuthController.me);

export default router;
