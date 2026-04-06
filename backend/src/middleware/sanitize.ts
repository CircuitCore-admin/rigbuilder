import type { Request, Response, NextFunction } from 'express';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

/** Fields that contain user-generated rich text. */
const UGC_FIELDS = ['description', 'pros', 'cons', 'body', 'bio'];

/**
 * Strips dangerous HTML/JS from known UGC fields in req.body.
 * Run AFTER Zod validation so types are already coerced.
 */
export function sanitize(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    for (const field of UGC_FIELDS) {
      if (typeof req.body[field] === 'string') {
        req.body[field] = DOMPurify.sanitize(req.body[field], {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
          ALLOWED_ATTR: ['href', 'target', 'rel'],
        });
      }
    }
  }
  next();
}
