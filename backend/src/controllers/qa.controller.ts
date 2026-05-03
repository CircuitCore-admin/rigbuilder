import type { Request, Response } from 'express';
import { prisma } from '../prisma';

export class QAController {
  /** GET /api/v1/qa/products/:productId/questions */
  static async listQuestions(req: Request, res: Response) {
    const questions = await prisma.productQuestion.findMany({
      where: { productId: req.params.productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        answers: {
          orderBy: [{ isAccepted: 'desc' }, { upvotes: 'desc' }, { createdAt: 'asc' }],
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
          },
        },
        _count: { select: { answers: true } },
      },
    });
    res.json(questions);
  }

  /** POST /api/v1/qa/products/:productId/questions */
  static async askQuestion(req: Request, res: Response) {
    const session = (req as any).session;
    const { question } = req.body;
    if (!question?.trim() || question.length > 500) {
      return res.status(400).json({ error: 'Question is required (max 500 chars)' });
    }

    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const q = await prisma.productQuestion.create({
      data: { productId: req.params.productId, userId: session.userId, question: question.trim() },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        answers: true,
        _count: { select: { answers: true } },
      },
    });
    res.status(201).json(q);
  }

  /** POST /api/v1/qa/questions/:questionId/answers */
  static async postAnswer(req: Request, res: Response) {
    const session = (req as any).session;
    const { body } = req.body;
    if (!body?.trim() || body.length > 2000) {
      return res.status(400).json({ error: 'Answer is required (max 2000 chars)' });
    }

    const question = await prisma.productQuestion.findUnique({ where: { id: req.params.questionId } });
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const answer = await prisma.productAnswer.create({
      data: { questionId: req.params.questionId, userId: session.userId, body: body.trim() },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    // Notify question author
    if (question.userId !== session.userId) {
      await prisma.notification.create({
        data: {
          userId: question.userId,
          type: 'QUESTION_ANSWERED',
          message: `${session.username} answered your question about a product`,
        },
      }).catch(() => {});
    }

    res.status(201).json(answer);
  }

  /** PUT /api/v1/qa/answers/:answerId/accept */
  static async acceptAnswer(req: Request, res: Response) {
    const session = (req as any).session;
    const answer = await prisma.productAnswer.findUnique({
      where: { id: req.params.answerId },
      include: { question: true },
    });
    if (!answer) return res.status(404).json({ error: 'Answer not found' });
    if (answer.question.userId !== session.userId) {
      return res.status(403).json({ error: 'Only the question author can accept an answer' });
    }

    // Unaccept all others, accept this one
    await prisma.$transaction([
      prisma.productAnswer.updateMany({
        where: { questionId: answer.questionId, isAccepted: true },
        data: { isAccepted: false },
      }),
      prisma.productAnswer.update({
        where: { id: req.params.answerId },
        data: { isAccepted: true },
      }),
    ]);

    res.json({ ok: true });
  }
}
