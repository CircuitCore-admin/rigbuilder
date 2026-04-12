import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { sanitize } from '../middleware/sanitize';

const router = Router();

router.get('/id/:id', UserController.getById);
router.get('/:username', UserController.getByUsername);
router.put('/profile', authenticate, sanitize, UserController.updateProfile);

export default router;
