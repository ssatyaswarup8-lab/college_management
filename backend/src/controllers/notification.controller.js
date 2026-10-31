import * as service from '../services/notification.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function list(req, res, next) {
  try { return sendSuccess(res, { data: await service.listNotifications(req.user.userId, req.query) }); }
  catch (error) { return next(error); }
}

export async function markRead(req, res, next) {
  try { return sendSuccess(res, { message: 'Notification marked as read', data: { notification: await service.markNotificationRead(req.user.userId, req.params.notificationId) } }); }
  catch (error) { return next(error); }
}

export async function markAllRead(req, res, next) {
  try { return sendSuccess(res, { message: 'Notifications marked as read', data: await service.markAllNotificationsRead(req.user.userId) }); }
  catch (error) { return next(error); }
}
