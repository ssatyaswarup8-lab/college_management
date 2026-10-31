import { z } from 'zod';

const day = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI']);
const periods = z.array(z.number().int().min(1).max(13)).min(1).max(13);

const roomChangeSchema = z.object({
  type: z.literal('room_unavailable'),
  roomId: z.string().trim().min(1).max(100),
  days: z.array(day).min(1),
  periods,
  reason: z.string().max(500).optional(),
}).strict();

const facultyChangeSchema = z.object({
  type: z.literal('faculty_unavailable'),
  facultyId: z.string().trim().min(1).max(100),
  days: z.array(day).min(1),
  periods,
  reason: z.string().max(500).optional(),
}).strict();

export const scenarioChangesSchema = z.array(
  z.discriminatedUnion('type', [roomChangeSchema, facultyChangeSchema]),
).min(1).max(20);

export const scenarioCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  changes: scenarioChangesSchema,
}).strict();

export const scenarioPreviewSchema = z.object({
  changes: scenarioChangesSchema,
}).strict();

export const scenarioIdParamsSchema = z.object({
  scenarioId: z.string().regex(/^[a-f\d]{24}$/i),
}).strict();

export const scenarioSimulationSchema = z.object({
  maxNodes: z.number().int().min(1).max(1_000_000).optional(),
  maxTimeMs: z.number().int().min(1000).max(120_000).optional(),
  restarts: z.number().int().min(1).max(10).optional(),
}).strict();
