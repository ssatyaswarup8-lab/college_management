import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../constants/roles.js';
import * as controller from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();
router.use(authenticate, requireRoles(ROLES.ADMIN));
router.get('/', validate(z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }).strict(), 'query'), controller.list);
router.get('/:auditId', validate(z.object({ auditId: z.string().regex(/^[a-f\d]{24}$/i) }).strict(), 'params'), controller.getOne);
export default router;
