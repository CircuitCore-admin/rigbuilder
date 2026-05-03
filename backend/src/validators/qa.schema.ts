import { z } from 'zod';

export const askQuestionSchema = z.object({
  question: z.string().min(1).max(500),
});

export const postAnswerSchema = z.object({
  body: z.string().min(1).max(2000),
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;
export type PostAnswerInput = z.infer<typeof postAnswerSchema>;
