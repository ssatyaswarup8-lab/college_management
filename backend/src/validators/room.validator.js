import { z } from 'zod';

const day = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
const roomQuerySchema = z.object({
  minCapacity: z.coerce.number().int().positive().optional(),
  type: z.string().trim().min(1).optional(),
  accessible: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  features: z.string().optional(),
  originRoomId: z.string().trim().min(1).max(100).optional(),
  originBuilding: z.string().trim().min(1).max(120).optional(),
}).strict();

export const listRoomsQuerySchema = roomQuerySchema;
export const roomIdParamsSchema = z.object({ roomId: z.string().trim().min(1).max(100) }).strict();
export const roomAvailabilityQuerySchema = z.object({
  day,
  startPeriod: z.coerce.number().int().min(1).max(13),
  duration: z.coerce.number().int().positive().max(13),
  attendance: z.coerce.number().int().positive().optional(),
  type: z.string().trim().min(1).optional(),
  needs: z.string().optional(),
  accessible: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  use: z.enum(['lecture', 'tutorial', 'exam', 'event']).default('event'),
  availableOnly: z.enum(['true', 'false']).transform((value) => value === 'true').default('true'),
  originRoomId: z.string().trim().min(1).max(100).optional(),
  originBuilding: z.string().trim().min(1).max(120).optional(),
}).strict().superRefine((query, context) => {
  if (query.originRoomId && query.originBuilding) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['originBuilding'], message: 'Provide originRoomId or originBuilding, not both.' });
  }
});

export const findRoomsSchema = z.object({
  day,
  startPeriod: z.number().int().min(1).max(13),
  duration: z.number().int().positive().max(13),
  attendance: z.number().int().positive().optional(),
  roomTypes: z.array(z.string().trim().min(1)).optional(),
  needs: z.array(z.string().trim().min(1)).default([]),
  needsAccessible: z.boolean().default(false),
  use: z.enum(['lecture', 'tutorial', 'exam', 'event']).default('event'),
  availableOnly: z.boolean().default(true),
  originRoomId: z.string().trim().min(1).max(100).optional(),
  originBuilding: z.string().trim().min(1).max(120).optional(),
}).strict().superRefine((criteria, context) => {
  if (criteria.originRoomId && criteria.originBuilding) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['originBuilding'], message: 'Provide originRoomId or originBuilding, not both.' });
  }
});

export const utilizationQuerySchema = z.object({}).strict();
export const utilizationDashboardQuerySchema = z.object({
  thresholdPercent: z.coerce.number().min(0).max(100).default(30),
}).strict();
