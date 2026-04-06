import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/** Auth routes: 5 req/min, delay after 3. */
export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Try again later.' },
});

export const authSlowDown = slowDown({
  windowMs: 60_000,
  delayAfter: 3,
  delayMs: (hits) => (hits - 3) * 500,
});

/** Search routes: 30 req/min. */
export const searchLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Write routes (reviews, builds): 10 req/min per user. */
export const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).session?.userId ?? req.ip ?? 'anon',
});

/** Global fallback: 100 req/min. */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
