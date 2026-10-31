import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();
const listQuerySchema = z.object({ unreadOnly: z.coerce.boolean().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict();
const idSchema = z.object({ notificationId: z.string().regex(/^[a-f\d]{24}$/i) }).strict();

router.use(authenticate);
router.get('/', validate(listQuerySchema, 'query'), controller.list);
router.patch('/read-all', controller.markAllRead);
router.patch('/:notificationId/read', validate(idSchema, 'params'), controller.markRead);

export default router;
