import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/authenticate';
import { writeLimiter } from '../config/rate-limit';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  },
});

const router = Router();

// Upload single image — returns { url } pointing to the optimized WebP file
router.post(
  '/',
  authenticate,
  writeLimiter,
  upload.single('image'),
  UploadController.uploadImage,
);

export default router;
