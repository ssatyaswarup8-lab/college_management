import { Router } from 'express';
import * as controller from '../controllers/room.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { ROLES } from '../constants/roles.js';
import { validate } from '../middleware/validation.middleware.js';
import { findRoomsSchema, listRoomsQuerySchema, roomAvailabilityQuerySchema, roomIdParamsSchema, utilizationDashboardQuerySchema } from '../validators/room.validator.js';

const router = Router();
router.use(authenticate);
router.get('/available', validate(roomAvailabilityQuerySchema, 'query'), controller.available);
router.post('/find', validate(findRoomsSchema), controller.find);
router.get('/utilization', requireRoles(ROLES.ADMIN), validate(utilizationDashboardQuerySchema, 'query'), controller.utilizationDashboard);
router.get('/:roomId/utilization', validate(roomIdParamsSchema, 'params'), controller.utilization);
router.get('/:roomId', validate(roomIdParamsSchema, 'params'), controller.getOne);
router.get('/', validate(listRoomsQuerySchema, 'query'), controller.list);

export default router;
