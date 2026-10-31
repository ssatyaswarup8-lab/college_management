import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../constants/roles.js';
import * as controller from '../controllers/schedule-data.controller.js';
import * as analyticsController from '../controllers/schedule-analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();
const querySchema = z.object({
  groupId: z.string().trim().min(1).optional(),
  facultyId: z.string().trim().min(1).optional(),
  roomId: z.string().trim().min(1).optional(),
  day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI']).optional(),
}).strict();
router.use(authenticate, requireRoles(ROLES.ADMIN, ROLES.DEPARTMENT_COORDINATOR));
router.get('/current', validate(querySchema, 'query'), controller.current);
router.get('/analytics', requireRoles(ROLES.ADMIN), analyticsController.current);
router.get('/export/preview', requireRoles(ROLES.ADMIN), controller.previewExport);
router.post('/export', requireRoles(ROLES.ADMIN), controller.exportToFiles);

export default router;
