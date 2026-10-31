import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../constants/roles.js';
import * as controller from '../controllers/schedule-version.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();
const idSchema = z.object({ versionId: z.string().regex(/^[a-f\d]{24}$/i) }).strict();
const querySchema = z.object({
  status: z.enum(['proposed', 'active', 'superseded', 'rejected']).optional(),
  kind: z.enum(['generation', 'manual_edit', 'disruption_repair', 'scenario', 'substitute_change', 'substitute_reversion']).optional(),
}).strict();
const rejectSchema = z.object({ reason: z.string().trim().min(1).max(500) }).strict();

router.use(authenticate, requireRoles(ROLES.ADMIN));
router.get('/versions', validate(querySchema, 'query'), controller.list);
router.get('/versions/:versionId', validate(idSchema, 'params'), controller.getOne);
router.post('/versions/:versionId/approve', validate(idSchema, 'params'), controller.approve);
router.post('/versions/:versionId/reject', validate(idSchema, 'params'), validate(rejectSchema), controller.reject);

export default router;
