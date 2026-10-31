import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../constants/roles.js';
import * as controller from '../controllers/conflict.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();
const id = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }).strict();
const analyzeSchema = z.object({
  sessionId: z.string().trim().min(1).max(100),
  proposedPlacement: z.object({ day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI']), startPeriod: z.number().int().min(1).max(9), roomId: z.string().trim().min(1) }).strict().optional(),
}).strict();
const solutionsSchema = z.object({
  maxSolutions: z.number().int().min(1).max(10).default(5),
  maxNearMisses: z.number().int().min(0).max(10).default(3),
}).strict();
const applySchema = z.object({ solutionIndex: z.number().int().min(0).max(9) }).strict();
const listQuery = z.object({ status: z.enum(['open', 'analyzed', 'solutions_ready', 'proposal_created', 'resolved']).optional() }).strict();
const viewRoles = [ROLES.ADMIN, ROLES.DEPARTMENT_COORDINATOR];

router.use(authenticate);
router.get('/', requireRoles(...viewRoles), validate(listQuery, 'query'), controller.list);
router.post('/analyze', requireRoles(...viewRoles), validate(analyzeSchema), controller.analyze);
router.post('/:id/solutions', requireRoles(...viewRoles), validate(id, 'params'), validate(solutionsSchema), controller.solutions);
router.post('/:id/apply', requireRoles(ROLES.ADMIN), validate(id, 'params'), validate(applySchema), controller.apply);

export default router;
