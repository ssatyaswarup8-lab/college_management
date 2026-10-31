import * as disruptionService from '../services/disruptions/disruption.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function analyze(req, res, next) {
  try {
    const disruption = await disruptionService.analyzeDisruption({ userId: req.user.userId, input: req.body });
    return sendSuccess(res, { status: 201, message: 'Disruption analyzed', data: { disruption } });
  } catch (error) { return next(error); }
}

export async function repair(req, res, next) {
  try {
    const data = await disruptionService.repairDisruption(req.body.disruptionId, req.body);
    return sendSuccess(res, { message: 'Repair proposal created; active timetable is unchanged', data });
  } catch (error) { return next(error); }
}

export async function getOne(req, res, next) {
  try {
    const disruption = await disruptionService.getDisruption(req.params.disruptionId);
    return sendSuccess(res, { data: { disruption } });
  } catch (error) { return next(error); }
}

export async function apply(req, res, next) {
  try {
    const disruption = await disruptionService.applyDisruption(req.params.disruptionId, req.user.userId);
    return sendSuccess(res, { message: 'Disruption repair applied', data: { disruption } });
  } catch (error) { return next(error); }
}
