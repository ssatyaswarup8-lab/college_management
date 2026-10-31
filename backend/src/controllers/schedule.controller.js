import { generateSchedule } from '../services/scheduler/scheduler.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function generate(req, res, next) {
  try {
    const result = await generateSchedule({ requestedBy: req.user.userId, options: req.body });
    return sendSuccess(res, {
      message: result.scheduleStatus === 'active' ? 'Timetable generated and activated' : 'Timetable generated as a proposal for approval',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
