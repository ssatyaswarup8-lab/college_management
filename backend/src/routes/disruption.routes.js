import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../constants/roles.js';
import * as controller from '../controllers/disruption.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();
const day = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
const periods = z.array(z.number().int().min(1).max(13)).min(1).max(13);
const facultyChange = z.object({ type: z.literal('faculty_unavailable'), faculty_id: z.string().trim().min(1), days: z.array(day).min(1), periods, reason: z.string().max(500).optional() }).strict();
const roomChange = z.object({ type: z.literal('room_unavailable'), room_id: z.string().trim().min(1), days: z.array(day).min(1), periods, reason: z.string().max(500).optional() }).strict();
const addSessionChange = z.object({
  type: z.literal('add_session'),
  session: z.object({
    id: z.string().trim().min(1), course_id: z.string().trim().min(1), kind: z.enum(['lecture', 'tutorial', 'lab']),
    groups: z.array(z.string().trim().min(1)).min(1), faculty_id: z.string().trim().min(1),
    size: z.number().int().positive(), duration: z.number().int().positive().max(9),
    room_types: z.array(z.string().trim().min(1)).min(1), needs_accessible: z.boolean().optional(),
    basket_slot: z.string().nullable().optional(), fixed_slot: z.object({ day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI']), start_period: z.number().int().min(1).max(9) }).nullable().optional(),
  }).strict().superRefine((session, context) => {
    if (session.kind === 'lab' && session.duration !== 3) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['duration'], message: 'A lab session must be three periods long.' });
    }
  }),
}).strict();
const analyzeSchema = z.object({
  title: z.string().trim().min(1).max(160), description: z.string().trim().max(1000).optional(),
  changes: z.array(z.discriminatedUnion('type', [facultyChange, roomChange, addSessionChange])).min(1).max(20),
}).strict();
const idSchema = z.object({ disruptionId: z.string().regex(/^[a-f\d]{24}$/i) }).strict();
const repairSchema = z.object({
  disruptionId: z.string().regex(/^[a-f\d]{24}$/i),
  maxNodes: z.number().int().min(1).max(1_000_000).optional(),
  maxTimeMs: z.number().int().min(1000).max(120_000).optional(),
  restarts: z.number().int().min(1).max(10).optional(),
}).strict();

router.use(authenticate, requireRoles(ROLES.ADMIN));
router.post('/analyze', validate(analyzeSchema), controller.analyze);
router.post('/repair', validate(repairSchema), controller.repair);
router.get('/:disruptionId', validate(idSchema, 'params'), controller.getOne);
router.post('/:disruptionId/apply', validate(idSchema, 'params'), controller.apply);

export default router;
