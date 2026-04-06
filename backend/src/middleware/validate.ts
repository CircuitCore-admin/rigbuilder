import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Express middleware factory that validates req.body, req.query,
 * or req.params against a Zod schema.
 *
 * Usage:
 * ```ts
 * router.post('/builds', validate(createBuildSchema, 'body'), controller.create);
 * ```
 */
export function validate(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body',
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.flatten().fieldErrors,
      });
    }
    // Replace raw data with parsed/coerced values
    (req as any)[source] = result.data;
    next();
  };
}
