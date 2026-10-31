import { z } from 'zod';

const day = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);

export const bookingDecisionSchema = z.object({
  day: day.optional(),
  startPeriod: z.number().int().min(1).max(13).optional(),
  roomId: z.string().trim().min(1).max(100).optional(),
  reason: z.string().trim().max(1000).optional(),
  priorityOverrideReason: z.string().trim().max(500).optional(),
}).strict();

export const alternativeAcceptSchema = z.object({
  priorityOverrideReason: z.string().trim().max(500).optional(),
}).strict();
