import * as bookingService from '../services/bookings/booking.service.js';
import { parseBookingText } from '../services/bookings/booking.parser.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createNotification } from '../services/notification.service.js';
import { logger } from '../config/logger.js';

async function notifyRequester(booking, type, title, message) {
  if (!booking.requesterUser) return;
  try {
    await createNotification({ recipient: booking.requesterUser, type, title, message, entityType: 'booking', entityId: booking.sourceId ?? String(booking._id) });
  } catch (error) {
    logger.error('Could not create booking notification.', { message: error.message, bookingId: String(booking._id) });
  }
}

export async function parse(req, res, next) {
  try {
    const draft = await parseBookingText(req.body.text);
    return sendSuccess(res, { message: 'Booking draft parsed; review and edit it before submitting', data: { draft } });
  } catch (error) { return next(error); }
}

export async function list(req, res, next) {
  try {
    const bookings = await bookingService.listBookings({ userId: req.user.userId, role: req.user.role, pendingOnly: false, status: req.query.status });
    return sendSuccess(res, { data: { bookings } });
  } catch (error) { return next(error); }
}

export async function pending(req, res, next) {
  try {
    const bookings = await bookingService.listBookings({ userId: req.user.userId, role: req.user.role, pendingOnly: true });
    return sendSuccess(res, { data: { bookings } });
  } catch (error) { return next(error); }
}

export async function priorityQueue(req, res, next) {
  try {
    const data = await bookingService.getBookingPriorityQueue({ userId: req.user.userId, userRole: req.user.role, limit: req.query.limit });
    return sendSuccess(res, { data });
  } catch (error) { return next(error); }
}

export async function create(req, res, next) {
  try {
    const booking = await bookingService.createBooking({ userId: req.user.userId, input: req.body });
    return sendSuccess(res, { status: 201, message: 'Booking request submitted', data: { booking } });
  } catch (error) { return next(error); }
}

export async function impact(req, res, next) {
  try {
    const data = await bookingService.analyzeBookingImpact({
      id: req.params.id,
      userId: req.user.userId,
      userRole: req.user.role,
      input: req.body,
    });
    return sendSuccess(res, { message: 'Booking impact analyzed; no decision was saved', data });
  } catch (error) { return next(error); }
}

export async function approve(req, res, next) {
  try {
    const booking = await bookingService.decideBooking({ id: req.params.id, userId: req.user.userId, userRole: req.user.role, action: 'approved', input: req.body });
    await notifyRequester(booking, 'booking_approved', 'Booking approved', `Your request “${booking.title}” was approved.`);
    return sendSuccess(res, { message: booking.decision?.priorityOverrideReason ? 'Booking approved with a recorded priority override' : 'Booking approved', data: { booking } });
  } catch (error) { return next(error); }
}

export async function reject(req, res, next) {
  try {
    const booking = await bookingService.decideBooking({ id: req.params.id, userId: req.user.userId, userRole: req.user.role, action: 'rejected', input: req.body });
    await notifyRequester(booking, 'booking_rejected', 'Booking declined', `Your request “${booking.title}” was declined.`);
    return sendSuccess(res, { message: 'Booking rejected', data: { booking } });
  } catch (error) { return next(error); }
}

export async function alternative(req, res, next) {
  try {
    const booking = await bookingService.decideBooking({ id: req.params.id, userId: req.user.userId, userRole: req.user.role, action: 'alternative_offered', input: req.body });
    await notifyRequester(booking, 'booking_alternative_offered', 'Alternative venue offered', `An alternative venue was offered for “${booking.title}”.`);
    return sendSuccess(res, { message: booking.decision?.priorityOverrideReason ? 'Alternative venue offered with a recorded priority override' : 'Alternative venue offered', data: { booking } });
  } catch (error) { return next(error); }
}

export async function acceptAlternative(req, res, next) {
  try {
    const booking = await bookingService.respondToAlternative({ id: req.params.id, userId: req.user.userId, userRole: req.user.role, action: 'accepted', priorityOverrideReason: req.body.priorityOverrideReason });
    await notifyRequester(booking, 'booking_alternative_accepted', 'Alternative accepted', `The alternative venue for “${booking.title}” was accepted.`);
    return sendSuccess(res, { message: 'Alternative booking accepted', data: { booking } });
  } catch (error) { return next(error); }
}

export async function declineAlternative(req, res, next) {
  try {
    const booking = await bookingService.respondToAlternative({ id: req.params.id, userId: req.user.userId, userRole: req.user.role, action: 'declined', reason: req.body.reason });
    await notifyRequester(booking, 'booking_alternative_declined', 'Alternative declined', `The alternative venue for “${booking.title}” was declined.`);
    return sendSuccess(res, { message: 'Alternative booking declined', data: { booking } });
  } catch (error) { return next(error); }
}

export async function cancel(req, res, next) {
  try {
    const booking = await bookingService.cancelBooking({ id: req.params.id, userId: req.user.userId, userRole: req.user.role });
    return sendSuccess(res, { message: 'Booking request cancelled', data: { booking } });
  } catch (error) { return next(error); }
}
