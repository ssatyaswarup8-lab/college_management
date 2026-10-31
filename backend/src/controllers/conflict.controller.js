import * as resolutionService from '../services/conflicts/resolution.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function list(req, res, next) {
  try {
    const conflicts = await resolutionService.listConflicts({ status: req.query.status, userId: req.user.userId, userRole: req.user.role });
    return sendSuccess(res, { data: { conflicts } });
  } catch (error) { return next(error); }
}

export async function analyze(req, res, next) {
  try {
    const conflict = await resolutionService.createConflict({ userId: req.user.userId, userRole: req.user.role, input: req.body });
    return sendSuccess(res, { status: 201, message: 'Conflict recorded for resolution', data: { conflict } });
  } catch (error) { return next(error); }
}

export async function solutions(req, res, next) {
  try {
    const data = await resolutionService.findSolutions(req.params.id, req.body.maxSolutions, req.body.maxNearMisses, { userId: req.user.userId, userRole: req.user.role });
    return sendSuccess(res, { message: 'Valid solutions and explanatory near misses generated', data });
  } catch (error) { return next(error); }
}

export async function apply(req, res, next) {
  try {
    const data = await resolutionService.applySolution(req.params.id, req.body.solutionIndex, req.user.userId);
    return sendSuccess(res, { status: 201, message: 'Selected fix saved as a schedule proposal', data });
  } catch (error) { return next(error); }
}
