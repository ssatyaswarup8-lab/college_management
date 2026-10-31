import { analyzeManualChange, applyManualVersion, proposeManualChange } from '../services/scheduler/manual.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function impact(req, res, next) {
  try {
    const data = await analyzeManualChange(req.body, { userId: req.user.userId, role: req.user.role });
    return sendSuccess(res, { message: data.valid ? 'Change impact analyzed' : 'Change would introduce conflicts', data });
  } catch (error) { return next(error); }
}

export async function propose(req, res, next) {
  try {
    const data = await proposeManualChange(req.body, req.user.userId);
    return sendSuccess(res, { status: 201, message: 'Schedule change saved as a proposal', data });
  } catch (error) { return next(error); }
}

export async function apply(req, res, next) {
  try {
    const version = await applyManualVersion(req.params.versionId, req.user.userId);
    return sendSuccess(res, { message: 'Schedule proposal applied', data: { scheduleVersion: version } });
  } catch (error) { return next(error); }
}
