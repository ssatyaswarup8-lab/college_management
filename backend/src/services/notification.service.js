import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/apiError.js';

export async function createNotification(input) {
  if (!input.recipient) return null;
  return Notification.create(input);
}

export async function listNotifications(userId, { unreadOnly = false, limit = 50 } = {}) {
  const query = { recipient: userId, ...(unreadOnly ? { readAt: null } : {}) };
  const [notifications, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ recipient: userId, readAt: null }),
  ]);
  return { notifications, unreadCount };
}

export async function markNotificationRead(userId, notificationId) {
  if (!mongoose.isValidObjectId(notificationId)) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found.');
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { readAt: new Date() } },
    { new: true },
  ).lean();
  if (!notification) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found.');
  return notification;
}

export async function markAllNotificationsRead(userId) {
  const result = await Notification.updateMany({ recipient: userId, readAt: null }, { $set: { readAt: new Date() } });
  return { modifiedCount: result.modifiedCount };
}
