import * as views from '../services/schedule-views.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function schedule(req, res, next) {
  try {
    const data = await views.getFacultySchedule(req.user.userId);
    return sendSuccess(res, { message: 'Faculty timetable loaded', data });
  } catch (error) { return next(error); }
}

export async function classes(req, res, next) {
  try {
    const data = await views.getFacultySchedule(req.user.userId);
    return sendSuccess(res, { data: { classes: data.classes } });
  } catch (error) { return next(error); }
}
