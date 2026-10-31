import * as examService from '../services/exams/exam.service.js';
import { getCurrentUser } from '../services/auth.service.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function generate(req, res, next) {
  try {
    const data = await examService.generateExams({ requestedBy: req.user.userId, options: req.body });
    return sendSuccess(res, { message: 'Exams scheduled successfully', data });
  } catch (error) { return next(error); }
}

export async function list(req, res, next) {
  try {
    const groupId = req.params.groupId ?? req.query.groupId;
    const currentUser = req.user.role === ROLES.STUDENT ? await getCurrentUser(req.user.userId) : null;
    if (currentUser && groupId && !currentUser.studentGroupIds.includes(groupId)) {
      throw new ApiError(403, 'FORBIDDEN', 'Students can only view exams for their own group.');
    }
    const exams = await examService.listExams({ groupId: currentUser && groupId ? groupId : undefined });
    const visible = currentUser
      ? exams.filter((exam) => exam.groups.some((groupIdValue) => currentUser.studentGroupIds.includes(groupIdValue)))
      : exams;
    return sendSuccess(res, { data: { exams: visible } });
  } catch (error) { return next(error); }
}

export async function getOne(req, res, next) {
  try {
    const exam = await examService.getExam(req.params.examId);
    const currentUser = req.user.role === ROLES.STUDENT ? await getCurrentUser(req.user.userId) : null;
    if (currentUser && !exam.groups.some((groupId) => currentUser.studentGroupIds.includes(groupId))) {
      throw new ApiError(403, 'FORBIDDEN', 'Students can only view exams for their own group.');
    }
    return sendSuccess(res, { data: { exam } });
  } catch (error) { return next(error); }
}
