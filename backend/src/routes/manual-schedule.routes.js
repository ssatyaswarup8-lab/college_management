import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import * as controller from '../controllers/manual-schedule.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { manualScheduleChangeSchema, scheduleVersionParamsSchema } from '../validators/manual-schedule.validator.js';

const router = Router();
router.post('/session/impact', authenticate, requireRoles(ROLES.ADMIN, ROLES.DEPARTMENT_COORDINATOR), validate(manualScheduleChangeSchema), controller.impact);
router.post('/session', authenticate, requireRoles(ROLES.ADMIN), validate(manualScheduleChangeSchema), controller.propose);
router.post('/versions/:versionId/apply', authenticate, requireRoles(ROLES.ADMIN), validate(scheduleVersionParamsSchema, 'params'), controller.apply);

export default router;
