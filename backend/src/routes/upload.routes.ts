import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/authenticate';
import { writeLimiter } from '../config/rate-limit';

const router = Router();

router.post('/signed-url', authenticate, writeLimiter, UploadController.getSignedUrl);

export default router;
