import { z } from 'zod';

export const manualScheduleChangeSchema = z.object({
  sessionId: z.string().trim().min(1).max(100),
  day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI']),
  startPeriod: z.number().int().min(1).max(9),
  roomId: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(1000).optional(),
}).strict();

export const scheduleVersionParamsSchema = z.object({
  versionId: z.string().regex(/^[a-f\d]{24}$/i, 'Schedule version id must be a MongoDB ObjectId.'),
}).strict();
