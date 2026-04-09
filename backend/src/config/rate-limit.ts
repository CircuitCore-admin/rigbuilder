import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/** Auth routes: 10 req/min, delay after 5. */
export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Try again later.' },
});

export const authSlowDown = slowDown({
  windowMs: 60_000,
  delayAfter: 5,
  delayMs: (hits) => (hits - 5) * 500,
});

/** Read routes (search, thread list, thread detail): 300 req/min per IP. */
export const searchLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

/** Write routes (posts, votes, replies): 60 req/min per user. */
export const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).session?.userId ?? req.ip ?? 'anon',
  message: { error: 'Too many write requests. Please slow down.' },
});

/** Global fallback: 600 req/min per IP. */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please try again shortly.' },
});
