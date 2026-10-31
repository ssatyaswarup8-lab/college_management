import { getCurrentSchedule } from '../services/schedule-query.service.js';
import { exportSchedule, getExportPreview } from '../services/schedule-export.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function current(req, res, next) {
  try {
    const data = await getCurrentSchedule(req.query, { userId: req.user.userId, role: req.user.role });
    return sendSuccess(res, { data });
  } catch (error) { return next(error); }
}

export async function previewExport(_req, res, next) {
  try {
    const data = await getExportPreview();
    return sendSuccess(res, { data });
  } catch (error) { return next(error); }
}

export async function exportToFiles(_req, res, next) {
  try {
    const data = await exportSchedule();
    return sendSuccess(res, { message: 'Schedule export written', data });
  } catch (error) { return next(error); }
}
