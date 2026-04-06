import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ---------------------------------------------------------------------------
// Middleware: soft-delete guard (prevents hard deletes on user content)
// ---------------------------------------------------------------------------
// NOTE: Uncomment and adapt once a `deletedAt` column is added to models.
// prisma.$use(async (params, next) => {
//   if (params.action === 'delete' && ['Build', 'Review', 'Comment'].includes(params.model ?? '')) {
//     params.action = 'update';
//     params.args.data = { deletedAt: new Date() };
//   }
//   return next(params);
// });
