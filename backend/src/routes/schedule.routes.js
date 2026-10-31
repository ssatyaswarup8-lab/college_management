import { Router } from 'express';
import { z } from 'zod';
import { generate } from '../controllers/schedule.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();
const generateSchema = z.object({
  maxNodes: z.number().int().min(1).max(1_000_000).optional(),
  maxTimeMs: z.number().int().min(1000).max(120_000).optional(),
  restarts: z.number().int().min(1).max(10).optional(),
  yieldEvery: z.number().int().min(100).max(10_000).optional(),
}).strict();

router.post('/generate', authenticate, requireRoles(ROLES.ADMIN), validate(generateSchema), generate);

export default router;
