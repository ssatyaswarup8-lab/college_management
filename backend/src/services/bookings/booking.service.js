import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { BookingRequest } from '../../models/BookingRequest.js';
import { Course } from '../../models/Course.js';
import { Dataset } from '../../models/Dataset.js';
import { Faculty } from '../../models/Faculty.js';
import { Room } from '../../models/Room.js';
import { RoomUnavailability } from '../../models/RoomUnavailability.js';
import { ScheduledSession } from '../../models/ScheduledSession.js';
import { ScheduleVersion } from '../../models/ScheduleVersion.js';
import { Session } from '../../models/Session.js';
import { StudentGroup } from '../../models/StudentGroup.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/apiError.js';
import { preserveCurrentDecision } from './decision-history.js';
import { bookingPriority, compareBookingPriority, findHigherPriorityPendingConflicts } from './priority.js';
import { effectiveCategory, validateBooking } from './booking.validator.js';

const roleCategory = {
  ADMIN: 'institute_event',
  DEPARTMENT_COORDINATOR: 'department_event',
  FACULTY: 'guest_lecture',
  CLUB_REPRESENTATIVE: 'club_event',
};

async function activeDataset() {
  const dataset = await Dataset.findOne({ status: 'active' });
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  return dataset;
}

function requestFilter(id, datasetId) {
  const filters = [{ sourceId: id }];
  if (mongoose.isValidObjectId(id)) filters.push({ _id: id });
  return { dataset: datasetId, $or: filters };
}

async function loadRequest(id, datasetId) {
  const request = await BookingRequest.findOne(requestFilter(id, datasetId));
  if (!request) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking request was not found.');
  return request;
}

export async function createBooking({ userId, input }) {
  const [dataset, user] = await Promise.all([activeDataset(), User.findById(userId)]);
  if (!user || !user.isActive) throw new ApiError(401, 'UNAUTHORIZED', 'User account is unavailable.');
  const requestedCategory = input.requestedCategory ?? roleCategory[user.role];
  if (!requestedCategory) throw new ApiError(403, 'FORBIDDEN', 'This role cannot submit event booking requests.');
  const sourceRole = ({ ADMIN: 'admin', DEPARTMENT_COORDINATOR: 'department_coordinator', FACULTY: 'faculty', CLUB_REPRESENTATIVE: 'club' })[user.role];
  const request = await BookingRequest.create({
    dataset: dataset._id,
    sourceId: `APP-${randomUUID()}`,
    requester: user.name,
    requesterUser: user._id,
    requesterRole: sourceRole,
    department: user.department,
    requestedCategory: effectiveCategory(dataset, { requesterRole: user.role, requestedCategory }),
    title: input.title,
    attendance: input.attendance,
    durationPeriods: input.durationPeriods,
    windows: input.windows,
    roomTypes: input.roomTypes,
    needs: input.needs,
    requestedRoom: input.requestedRoom ?? null,
    mandatoryForGroups: input.mandatoryForGroups,
    rawText: input.rawText ?? '',
    status: 'pending',
  });
  return request;
}

export async function listBookings({ userId, role, department, pendingOnly = false, status }) {
  const dataset = await activeDataset();
  const query = { dataset: dataset._id };
  if (pendingOnly) query.status = 'pending';
  else if (status) query.status = status;
  if (role === 'CLUB_REPRESENTATIVE' || role === 'FACULTY') query.requesterUser = userId;
  if (role === 'DEPARTMENT_COORDINATOR') {
    const user = await User.findById(userId).select('department');
    query.department = department ?? user?.department;
  }
  const requests = await BookingRequest.find(query).sort({ submittedAt: 1 }).lean();
  if (pendingOnly) requests.sort((left, right) => compareBookingPriority(dataset, left, right));
  return requests.map((request) => ({ ...request, priority: bookingPriority(dataset, request) }));
}

export async function getBookingPriorityQueue({ userId, userRole, limit = 50 }) {
  const dataset = await activeDataset();
  const query = { dataset: dataset._id, status: 'pending' };
  if (userRole === 'DEPARTMENT_COORDINATOR') {
    const user = await User.findById(userId).select('department').lean();
    if (!user?.department) throw new ApiError(403, 'DEPARTMENT_REQUIRED', 'Coordinator account must be linked to a department.');
    query.department = user.department;
  }
  const allPending = await BookingRequest.find(query).lean();
  allPending.sort((left, right) => compareBookingPriority(dataset, left, right));
  return {
    priorityOrder: dataset.priorityOrder,
    totalPending: allPending.length,
    requests: allPending.slice(0, limit).map((request) => ({ ...request, priority: bookingPriority(dataset, request) })),
  };
}

async function assertCanDecide(userId, userRole, request, targetRoom) {
  if (!['ADMIN', 'DEPARTMENT_COORDINATOR'].includes(userRole)) throw new ApiError(403, 'FORBIDDEN', 'Only Admins or authorized department coordinators can decide bookings.');
  if (String(request.requesterUser) === String(userId)) throw new ApiError(403, 'SELF_APPROVAL_FORBIDDEN', 'You cannot approve or reject your own booking request.');
  if (userRole === 'DEPARTMENT_COORDINATOR') {
    const user = await User.findById(userId).select('department');
    const labRequest = targetRoom?.type === 'lab' || (request.roomTypes ?? []).includes('lab');
    if (!user || request.department !== user.department || !labRequest) {
      throw new ApiError(403, 'FORBIDDEN', 'Coordinators may decide bookings only for their department labs.');
    }
  }
}

async function priorityOverrideFor({ dataset, request, placement, userRole, reason }) {
  const pendingRequests = await BookingRequest.find({ dataset: dataset._id, status: 'pending' }).lean();
  const higherPriorityRequests = findHigherPriorityPendingConflicts(dataset, request.toObject?.() ?? request, placement, pendingRequests);
  const overrideReason = reason?.trim() ?? '';
  if (higherPriorityRequests.length && !overrideReason) {
    throw new ApiError(409, 'PRIORITY_REVIEW_REQUIRED', 'This proposal overlaps a higher-priority pending request. Review it or provide an Admin priority override reason.', { higherPriorityRequests });
  }
  if (higherPriorityRequests.length && userRole !== 'ADMIN') {
    throw new ApiError(403, 'PRIORITY_OVERRIDE_ADMIN_ONLY', 'Only an Admin can override a higher-priority pending booking request.', { higherPriorityRequests });
  }
  if (overrideReason && userRole !== 'ADMIN') throw new ApiError(403, 'PRIORITY_OVERRIDE_ADMIN_ONLY', 'Only an Admin can record a priority override.');
  if (overrideReason && !higherPriorityRequests.length) throw new ApiError(422, 'PRIORITY_OVERRIDE_NOT_NEEDED', 'No higher-priority pending request conflicts with this proposal.');
  return { overrideReason, overriddenRequestIds: higherPriorityRequests.map((item) => item.requestId) };
}

async function evaluate(request, dataset, placement, allowOutsideWindow) {
  const room = await Room.findOne({ dataset: dataset._id, sourceId: placement.roomId }).lean();
  const [roomUnavailability, activeVersion] = await Promise.all([
    RoomUnavailability.find({ dataset: dataset._id }).lean(),
    ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' }).select('_id'),
  ]);
  if (!activeVersion) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'Generate an active timetable before deciding venue bookings.');
  const [scheduledSessions, sessions, existingBookings] = await Promise.all([
    ScheduledSession.find({ scheduleVersion: activeVersion._id }).lean(),
    Session.find({ dataset: dataset._id }).lean(),
    BookingRequest.find({ dataset: dataset._id, status: 'approved' }).lean(),
  ]);
  const violations = validateBooking({
    request,
    placement,
    room,
    dataset,
    roomUnavailability,
    scheduledSessions,
    sessions,
    existingBookings,
    allowOutsideWindow,
  });
  return { violations, room, scheduleVersionId: activeVersion._id };
}

export async function analyzeBookingImpact({ id, userId, userRole, input }) {
  const dataset = await activeDataset();
  const request = await loadRequest(id, dataset._id);
  if (request.status !== 'pending') throw new ApiError(409, 'BOOKING_NOT_PENDING', 'Only pending booking requests can be analyzed for approval impact.');
  const placement = { day: input.day, startPeriod: input.startPeriod, roomId: input.roomId };
  const room = await Room.findOne({ dataset: dataset._id, sourceId: placement.roomId }).lean();
  await assertCanDecide(userId, userRole, request, room);

  const { violations, room: validatedRoom, scheduleVersionId } = await evaluate(request, dataset, placement, input.action === 'alternative');
  const affectedSessionIds = [...new Set(violations.flatMap((violation) => violation.details?.sessionId ? [violation.details.sessionId] : []))];
  const affectedBookingIds = [...new Set(violations.flatMap((violation) => violation.details?.requestId ? [violation.details.requestId] : []))];
  const [sessions, assignments, courses, groups, faculty, bookings, pendingRequests] = await Promise.all([
    Session.find({ dataset: dataset._id, sourceId: { $in: affectedSessionIds } }).lean(),
    ScheduledSession.find({ scheduleVersion: scheduleVersionId, sessionId: { $in: affectedSessionIds } }).lean(),
    Course.find({ dataset: dataset._id }).lean(),
    StudentGroup.find({ dataset: dataset._id }).lean(),
    Faculty.find({ dataset: dataset._id }).lean(),
    BookingRequest.find({ dataset: dataset._id, _id: { $in: affectedBookingIds } }).select('_id sourceId title requester decision').lean(),
    BookingRequest.find({ dataset: dataset._id, status: 'pending' }).lean(),
  ]);
  const courseMap = new Map(courses.map((row) => [row.sourceId, row]));
  const groupMap = new Map(groups.map((row) => [row.sourceId, row]));
  const facultyMap = new Map(faculty.map((row) => [row.sourceId, row]));
  const assignmentMap = new Map(assignments.map((row) => [row.sessionId, row]));
  const sessionMap = new Map(sessions.map((row) => [row.sourceId, row]));
  const existingBookingMap = new Map(bookings.map((row) => [String(row._id), row]));
  const impactedSessions = affectedSessionIds.map((sessionId) => {
    const session = sessionMap.get(sessionId);
    if (!session) return null;
    const effectiveFacultyId = assignmentMap.get(sessionId)?.facultyOverrideId ?? session.facultyId;
    return {
      sessionId,
      courseId: session.courseId,
      courseTitle: courseMap.get(session.courseId)?.title ?? session.courseId,
      facultyId: effectiveFacultyId,
      facultyName: facultyMap.get(effectiveFacultyId)?.name ?? effectiveFacultyId,
      groups: session.groups.map((groupId) => ({ id: groupId, name: groupMap.get(groupId)?.name ?? groupId })),
    };
  }).filter(Boolean);
  const impactedBookings = affectedBookingIds.map((bookingId) => {
    const booking = existingBookingMap.get(bookingId);
    return booking ? { id: booking.sourceId ?? bookingId, title: booking.title, requester: booking.requester } : { id: bookingId };
  });
  const higherPriorityRequests = findHigherPriorityPendingConflicts(dataset, request.toObject(), placement, pendingRequests);
  const priorityOverrideAllowed = userRole === 'ADMIN';
  const affectedGroupIds = [...new Set([
    ...violations.flatMap((violation) => violation.details?.groups ?? []),
    ...impactedSessions.flatMap((session) => session.groups.map((group) => group.id)),
  ])];
  const affectedFaculty = [...new Map(impactedSessions.map((session) => [session.facultyId, { id: session.facultyId, name: session.facultyName }])).values()];
  const violationCodes = [...new Set(violations.map((violation) => violation.code))];
  return {
    requestId: request.sourceId ?? String(request._id),
    action: input.action,
    proposedPlacement: { ...placement, endPeriod: placement.startPeriod + request.durationPeriods - 1 },
    room: validatedRoom ? { id: validatedRoom.sourceId, name: validatedRoom.name, building: validatedRoom.building, capacity: validatedRoom.capacity, type: validatedRoom.type } : null,
    available: violations.length === 0 && higherPriorityRequests.length === 0,
    decisionBlockers: violations,
    impact: {
      conflictCount: violations.length,
      conflictCodes: violationCodes,
      affectedSessions: impactedSessions,
      affectedBookings: impactedBookings,
      affectedFaculty,
      affectedGroups: affectedGroupIds.map((groupId) => ({ id: groupId, name: groupMap.get(groupId)?.name ?? groupId })),
      higherPriorityRequests,
      priorityOverrideAllowed,
      requiresAdminPriorityOverride: higherPriorityRequests.length > 0,
    },
  };
}

export async function decideBooking({ id, userId, userRole, action, input = {} }) {
  const dataset = await activeDataset();
  const request = await loadRequest(id, dataset._id);
  if (request.status !== 'pending') throw new ApiError(409, 'BOOKING_NOT_PENDING', 'Only pending booking requests can be decided.');
  const placement = {
    day: input.day ?? request.windows[0]?.day,
    startPeriod: input.startPeriod ?? request.windows[0]?.fromPeriod,
    roomId: input.roomId ?? request.requestedRoom,
  };
  const room = placement.roomId ? await Room.findOne({ dataset: dataset._id, sourceId: placement.roomId }).lean() : null;
  await assertCanDecide(userId, userRole, request, room);

  if (action === 'rejected') {
    if (!input.reason?.trim()) throw new ApiError(422, 'VALIDATION_ERROR', 'A reason is required when rejecting a booking.');
    request.status = 'rejected';
    const priority = bookingPriority(dataset, request);
    request.decision = { status: 'rejected', reason: input.reason.trim(), decidedBy: userId, decidedAt: new Date(), priorityCategory: priority.category, priorityRank: priority.rank };
    await request.save();
    return request;
  }

  if (!placement.day || !Number.isInteger(placement.startPeriod) || !placement.roomId) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'A day, start period, and room are required for approval or an alternative.');
  }
  const allowOutsideWindow = action === 'alternative_offered';
  const { violations } = await evaluate(request, dataset, placement, allowOutsideWindow);
  if (violations.length) throw new ApiError(409, 'BOOKING_CONFLICT', 'Booking proposal failed deterministic validation.', { violations });
  if (allowOutsideWindow && !input.reason?.trim()) throw new ApiError(422, 'VALIDATION_ERROR', 'A reason is required when offering an alternative.');

  const priorityOverride = await priorityOverrideFor({ dataset, request, placement, userRole, reason: input.priorityOverrideReason });

  request.status = action;
  const priority = bookingPriority(dataset, request);
  request.decision = {
    status: action,
    day: placement.day,
    startPeriod: placement.startPeriod,
    endPeriod: placement.startPeriod + request.durationPeriods - 1,
    roomId: placement.roomId,
    reason: input.reason?.trim() ?? 'Approved after room and schedule validation.',
    decidedBy: userId,
    decidedAt: new Date(),
    priorityCategory: priority.category,
    priorityRank: priority.rank,
    priorityOverrideReason: priorityOverride.overrideReason,
    priorityOverrideRequestIds: priorityOverride.overriddenRequestIds,
  };
  await request.save();
  return request;
}

export async function respondToAlternative({ id, userId, userRole, action, reason = '', priorityOverrideReason = '' }) {
  const dataset = await activeDataset();
  const request = await loadRequest(id, dataset._id);
  if (request.status !== 'alternative_offered' || !request.decision) {
    throw new ApiError(409, 'ALTERNATIVE_NOT_PENDING', 'This booking has no alternative awaiting a requester response.');
  }
  if (userRole !== 'ADMIN' && String(request.requesterUser) !== String(userId)) {
    throw new ApiError(403, 'FORBIDDEN', 'Only the requester or an Admin can respond to this alternative.');
  }

  if (action === 'accepted') {
    const placement = { day: request.decision.day, startPeriod: request.decision.startPeriod, roomId: request.decision.roomId };
    const { violations } = await evaluate(request, dataset, placement, true);
    if (violations.length) throw new ApiError(409, 'ALTERNATIVE_NO_LONGER_VALID', 'The offered alternative is no longer available.', { violations });
    const priorityOverride = await priorityOverrideFor({ dataset, request, placement, userRole, reason: priorityOverrideReason });
    preserveCurrentDecision(request);
    request.status = 'approved';
    request.decision = {
      ...request.decision.toObject(), status: 'approved', decidedBy: userId, decidedAt: new Date(),
      ...(priorityOverride.overrideReason ? {
        priorityOverrideReason: priorityOverride.overrideReason,
        priorityOverrideRequestIds: priorityOverride.overriddenRequestIds,
      } : {}),
    };
  } else {
    if (!reason.trim()) throw new ApiError(422, 'VALIDATION_ERROR', 'A reason is required when declining an alternative.');
    preserveCurrentDecision(request);
    request.status = 'rejected';
    request.decision = { status: 'rejected', reason: reason.trim(), decidedBy: userId, decidedAt: new Date() };
  }
  await request.save();
  return request;
}

export async function cancelBooking({ id, userId, userRole }) {
  const dataset = await activeDataset();
  const request = await loadRequest(id, dataset._id);
  if (!['pending', 'alternative_offered'].includes(request.status)) throw new ApiError(409, 'BOOKING_NOT_CANCELLABLE', 'Only pending requests or offered alternatives can be cancelled.');
  if (userRole !== 'ADMIN' && String(request.requesterUser) !== String(userId)) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only cancel your own booking request.');
  }
  preserveCurrentDecision(request);
  request.status = 'cancelled';
  request.decision = null;
  await request.save();
  return request;
}
