import type { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

/** Ensure the upload directory exists on startup. */
async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}
ensureDir();

export class UploadController {
  /** POST /api/v1/uploads — accepts multipart `image` field, returns { url }. */
  static async uploadImage(req: Request, res: Response) {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    try {
      // Generate unique filename
      const id = crypto.randomBytes(12).toString('hex');
      const filename = `${id}.webp`;

      // Resize (max 1200px wide) and convert to WebP at 80% quality
      await sharp(file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(UPLOAD_DIR, filename));

      // Return URL — served as /uploads/<filename> by express.static
      const url = `/uploads/${filename}`;
      res.json({ url });
    } catch (err) {
      console.error('Image upload failed:', err);
      res.status(500).json({ error: 'Image processing failed' });
    }
  }
}
