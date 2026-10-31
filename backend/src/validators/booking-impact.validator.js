import { z } from 'zod';

export const bookingImpactSchema = z.object({
  action: z.enum(['approve', 'alternative']),
  day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']),
  startPeriod: z.number().int().min(1).max(13),
  roomId: z.string().trim().min(1).max(100),
}).strict();
