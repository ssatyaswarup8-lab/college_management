import { Router } from 'express';
import * as datasetController from '../controllers/dataset.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { uploadCsvFiles, uploadJsonFile } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { ROLES } from '../constants/roles.js';
import { datasetVersionParamsSchema } from '../validators/dataset-request.validator.js';

const router = Router();
router.use(authenticate, requireRoles(ROLES.ADMIN));

router.get('/', datasetController.listDatasets);
router.post('/preview', uploadJsonFile, datasetController.previewJson);
router.post('/import', uploadJsonFile, datasetController.importJson);
router.post('/csv/preview', uploadCsvFiles, datasetController.previewCsv);
router.post('/csv/import', uploadCsvFiles, datasetController.importCsv);
router.get('/:datasetVersionId/activation-impact', validate(datasetVersionParamsSchema, 'params'), datasetController.activationImpact);
router.post('/:datasetVersionId/activate', validate(datasetVersionParamsSchema, 'params'), datasetController.activate);

export default router;
