import * as scheduleVersionService from '../services/scheduler/schedule-version.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function list(req, res, next) {
  try {
    const versions = await scheduleVersionService.listScheduleVersions(req.query);
    return sendSuccess(res, { data: { versions } });
  } catch (error) { return next(error); }
}

export async function getOne(req, res, next) {
  try {
    const data = await scheduleVersionService.getScheduleVersion(req.params.versionId);
    return sendSuccess(res, { data });
  } catch (error) { return next(error); }
}

export async function approve(req, res, next) {
  try {
    const version = await scheduleVersionService.approveGeneratedVersion(req.params.versionId, req.user.userId);
    return sendSuccess(res, { message: 'Generated timetable proposal approved and activated', data: { scheduleVersion: version } });
  } catch (error) { return next(error); }
}

export async function reject(req, res, next) {
  try {
    const version = await scheduleVersionService.rejectGeneratedVersion(req.params.versionId, req.user.userId, req.body.reason);
    return sendSuccess(res, { message: 'Generated timetable proposal rejected', data: { scheduleVersion: version } });
  } catch (error) { return next(error); }
}
