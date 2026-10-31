import { getScheduleAnalytics } from '../services/scheduler/analytics.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function current(req, res, next) {
  try {
    const data = await getScheduleAnalytics();
    return sendSuccess(res, { data });
  } catch (error) { return next(error); }
}
