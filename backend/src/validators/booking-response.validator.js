import { z } from 'zod';

export const declineAlternativeSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
}).strict();
