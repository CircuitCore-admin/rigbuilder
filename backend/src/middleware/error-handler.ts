import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

const isProd = process.env.NODE_ENV === 'production';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // AppError — intentional operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // ZodError — validation failures forwarded via next(err)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: err.flatten().fieldErrors,
    });
  }

  // Prisma unique-constraint violation (P2002)
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }

  // CORS rejection
  if (typeof err?.message === 'string' && err.message.includes('CORS')) {
    return res.status(403).json({ error: err.message });
  }

  console.error('[ErrorHandler]', err?.message, err?.stack);

  res.status(500).json({
    error: isProd ? 'Internal server error' : (err?.message ?? 'Unknown error'),
  });
}
