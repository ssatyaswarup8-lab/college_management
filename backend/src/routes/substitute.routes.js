import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../constants/roles.js';
import * as controller from '../controllers/substitute.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();
const qualificationSchema = z.object({
  facultyId: z.string().trim().min(1).max(100),
  courseId: z.string().trim().min(1).max(100),
  qualificationNote: z.string().trim().max(500).optional(),
}).strict();
const qualificationQuerySchema = z.object({ courseId: z.string().trim().min(1).optional(), facultyId: z.string().trim().min(1).optional() }).strict();
const findSchema = z.object({ sessionId: z.string().trim().min(1).max(100) }).strict();
const applySchema = z.object({
  sessionId: z.string().trim().min(1).max(100),
  facultyId: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(500).optional(),
}).strict();
const restoreSchema = z.object({
  sessionId: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(500).optional(),
}).strict();
const qualificationIdSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }).strict();
const findRoles = [ROLES.ADMIN, ROLES.DEPARTMENT_COORDINATOR, ROLES.FACULTY];

router.use(authenticate);
router.get('/faculty/directory', requireRoles(ROLES.ADMIN, ROLES.DEPARTMENT_COORDINATOR), controller.listFacultyDirectory);
router.post('/admin/faculty/qualifications', requireRoles(ROLES.ADMIN), validate(qualificationSchema), controller.addQualification);
router.get('/admin/faculty/qualifications', requireRoles(ROLES.ADMIN), validate(qualificationQuerySchema, 'query'), controller.listQualifications);
router.delete('/admin/faculty/qualifications/:id', requireRoles(ROLES.ADMIN), validate(qualificationIdSchema, 'params'), controller.revokeQualification);
router.post('/faculty/substitutes/find', requireRoles(...findRoles), validate(findSchema), controller.find);
router.post('/admin/faculty/substitutes/apply', requireRoles(ROLES.ADMIN), validate(applySchema), controller.apply);
router.post('/admin/faculty/substitutes/restore', requireRoles(ROLES.ADMIN), validate(restoreSchema), controller.restore);

export default router;
