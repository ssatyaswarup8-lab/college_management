import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import * as controller from '../controllers/scenario.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { scenarioCreateSchema, scenarioIdParamsSchema, scenarioPreviewSchema, scenarioSimulationSchema } from '../validators/scenario.validator.js';

const router = Router();

router.use(authenticate, requireRoles(ROLES.ADMIN));
router.get('/', controller.list);
router.post('/preview', validate(scenarioPreviewSchema), controller.preview);
router.post('/', validate(scenarioCreateSchema), controller.create);
router.post('/:scenarioId/simulate', validate(scenarioIdParamsSchema, 'params'), validate(scenarioSimulationSchema), controller.simulate);
router.get('/:scenarioId/compare', validate(scenarioIdParamsSchema, 'params'), controller.compare);
router.post('/:scenarioId/apply', validate(scenarioIdParamsSchema, 'params'), controller.apply);

export default router;
