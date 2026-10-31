import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../constants/roles.js';
import * as examController from '../controllers/exam.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();
const generateSchema = z.object({
  maxNodes: z.number().int().min(1).max(1_000_000).optional(),
  maxTimeMs: z.number().int().min(1000).max(120_000).optional(),
}).strict();
const groupQuerySchema = z.object({ groupId: z.string().trim().min(1).max(100).optional() }).strict();
const examParamsSchema = z.object({ examId: z.string().trim().min(1).max(100) }).strict();
const groupParamsSchema = z.object({ groupId: z.string().trim().min(1).max(100) }).strict();

router.post('/admin/exams/generate', authenticate, requireRoles(ROLES.ADMIN), validate(generateSchema), examController.generate);
router.get('/exams', authenticate, validate(groupQuerySchema, 'query'), examController.list);
router.get('/exams/student/:groupId', authenticate, validate(groupParamsSchema, 'params'), examController.list);
router.get('/exams/:examId', authenticate, validate(examParamsSchema, 'params'), examController.getOne);

export default router;
