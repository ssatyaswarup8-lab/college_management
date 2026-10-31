import * as substituteService from '../services/faculty/substitute.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function listFacultyDirectory(req, res, next) {
  try {
    const faculty = await substituteService.listFacultyDirectory({ userId: req.user.userId, userRole: req.user.role });
    return sendSuccess(res, { data: { faculty } });
  } catch (error) { return next(error); }
}

export async function addQualification(req, res, next) {
  try {
    const qualification = await substituteService.addQualification({ input: req.body, verifiedBy: req.user.userId });
    return sendSuccess(res, { status: 201, message: 'Faculty qualification recorded', data: { qualification } });
  } catch (error) { return next(error); }
}

export async function listQualifications(req, res, next) {
  try {
    const qualifications = await substituteService.listQualifications(req.query);
    return sendSuccess(res, { data: { qualifications } });
  } catch (error) { return next(error); }
}

export async function revokeQualification(req, res, next) {
  try {
    const qualification = await substituteService.revokeQualification({ qualificationId: req.params.id, revokedBy: req.user.userId });
    return sendSuccess(res, { message: 'Faculty qualification revoked', data: { qualification } });
  } catch (error) { return next(error); }
}

export async function find(req, res, next) {
  try {
    const data = await substituteService.findSubstitutes({ userId: req.user.userId, userRole: req.user.role, sessionId: req.body.sessionId });
    return sendSuccess(res, { message: 'Substitute candidates evaluated', data });
  } catch (error) { return next(error); }
}

export async function apply(req, res, next) {
  try {
    const data = await substituteService.applySubstitute({ ...req.body, approvedBy: req.user.userId });
    return sendSuccess(res, { message: 'Substitute approved and applied to the active timetable', data });
  } catch (error) { return next(error); }
}

export async function restore(req, res, next) {
  try {
    const data = await substituteService.restoreOriginalFaculty({ ...req.body, approvedBy: req.user.userId });
    return sendSuccess(res, { message: 'Original faculty restored in a new active timetable version', data });
  } catch (error) { return next(error); }
}
