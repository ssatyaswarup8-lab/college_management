import * as views from '../services/schedule-views.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

const respond = (load, message) => async (req, res, next) => {
  try {
    const data = await load(req.user.userId);
    return sendSuccess(res, { message, data });
  } catch (error) { return next(error); }
};

export const schedule = respond(views.getStudentSchedule, 'Student timetable loaded');
export const exams = respond(views.getStudentExams, 'Student exams loaded');
export const events = respond(views.getStudentEvents, 'Student events loaded');
export const nextClass = respond(views.getStudentNextClass, 'Next class loaded');
export async function todayAgenda(req, res, next) {
  try {
    const data = await views.getStudentTodayAgenda(req.user.userId, req.query.date);
    return sendSuccess(res, { message: 'Student agenda loaded', data });
  } catch (error) { return next(error); }
}
