import { BookingRequest } from '../models/BookingRequest.js';
import { Course } from '../models/Course.js';
import { Dataset } from '../models/Dataset.js';
import { Exam } from '../models/Exam.js';
import { Faculty } from '../models/Faculty.js';
import { Room } from '../models/Room.js';
import { ScheduledSession } from '../models/ScheduledSession.js';
import { ScheduleVersion } from '../models/ScheduleVersion.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';

async function loadViewContext(userId) {
  const [user, dataset] = await Promise.all([
    User.findById(userId).lean(),
    Dataset.findOne({ status: 'active' }).lean(),
  ]);
  if (!user || !user.isActive) throw new ApiError(401, 'UNAUTHORIZED', 'User account is unavailable.');
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const version = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' }).lean();
  if (!version) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'No active timetable exists.');

  const [assignments, sessions, courses, rooms, faculty] = await Promise.all([
    ScheduledSession.find({ scheduleVersion: version._id }).lean(),
    Session.find({ dataset: dataset._id }).lean(),
    Course.find({ dataset: dataset._id }).lean(),
    Room.find({ dataset: dataset._id }).lean(),
    Faculty.find({ dataset: dataset._id }).lean(),
  ]);
  return {
    user,
    dataset,
    assignments,
    sessions: new Map(sessions.map((row) => [row.sourceId, row])),
    courses: new Map(courses.map((row) => [row.sourceId, row])),
    rooms: new Map(rooms.map((row) => [row.sourceId, row])),
    faculty: new Map(faculty.map((row) => [row.sourceId, row])),
  };
}

function formatAssignment(assignment, context) {
  const session = context.sessions.get(assignment.sessionId);
  if (!session) return null;
  const course = context.courses.get(session.courseId);
  const room = context.rooms.get(assignment.roomId);
  const effectiveFacultyId = assignment.facultyOverrideId ?? session.facultyId;
  const instructor = context.faculty.get(effectiveFacultyId);
  const endPeriod = assignment.startPeriod + session.duration - 1;
  const periods = new Map(context.dataset.calendar.periods.map((period) => [period.id, period]));
  return {
    sessionId: session.sourceId,
    courseId: session.courseId,
    courseTitle: course?.title ?? session.courseId,
    kind: session.kind,
    day: assignment.day,
    startPeriod: assignment.startPeriod,
    endPeriod,
    startTime: periods.get(assignment.startPeriod)?.start ?? null,
    endTime: periods.get(endPeriod)?.end ?? null,
    roomId: assignment.roomId,
    roomName: room?.name ?? assignment.roomId,
    building: room?.building ?? null,
    facultyId: effectiveFacultyId,
    facultyName: instructor?.name ?? effectiveFacultyId,
    groups: session.groups,
  };
}

const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const sortClasses = (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || a.startPeriod - b.startPeriod;

export async function getStudentSchedule(userId) {
  const context = await loadViewContext(userId);
  const groupIds = context.user.studentGroupIds ?? [];
  const classes = context.assignments
    .map((assignment) => formatAssignment(assignment, context))
    .filter((item) => item && item.groups.some((groupId) => groupIds.includes(groupId)))
    .sort(sortClasses);
  return { studentGroupIds: groupIds, scheduleVersionId: String(context.assignments[0]?.scheduleVersion ?? ''), classes };
}

export async function getFacultySchedule(userId) {
  const context = await loadViewContext(userId);
  if (!context.user.facultyId) throw new ApiError(409, 'FACULTY_PROFILE_MISSING', 'This account is not linked to a faculty record.');
  const classes = context.assignments
    .map((assignment) => formatAssignment(assignment, context))
    .filter((item) => item?.facultyId === context.user.facultyId)
    .sort(sortClasses);
  return { facultyId: context.user.facultyId, scheduleVersionId: String(context.assignments[0]?.scheduleVersion ?? ''), classes };
}

export async function getStudentExams(userId) {
  const context = await loadViewContext(userId);
  const groupIds = context.user.studentGroupIds ?? [];
  const exams = await Exam.find({ dataset: context.dataset._id, groups: { $in: groupIds } }).sort({ scheduledDay: 1, examSession: 1 }).lean();
  return { exams };
}

export async function getStudentEvents(userId) {
  const context = await loadViewContext(userId);
  const groupIds = context.user.studentGroupIds ?? [];
  const bookings = await BookingRequest.find({ dataset: context.dataset._id, status: 'approved' }).lean();
  const events = bookings.filter((booking) => {
    const mandatoryGroups = booking.mandatoryForGroups ?? [];
    return !mandatoryGroups.length || mandatoryGroups.some((groupId) => groupIds.includes(groupId));
  })
    .map((booking) => ({
      id: booking.sourceId ?? String(booking._id),
      title: booking.title,
      day: booking.decision?.day,
      startPeriod: booking.decision?.startPeriod,
      endPeriod: booking.decision?.endPeriod,
      roomId: booking.decision?.roomId,
      reason: booking.decision?.reason,
    }));
  return { events };
}

function instituteToday(timeZone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const read = (type) => parts.find((part) => part.type === type)?.value;
  const days = { Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN' };
  return { day: days[read('weekday')], date: `${read('year')}-${read('month')}-${read('day')}`, timeZone };
}

export async function getStudentTodayAgenda(userId, requestedDate) {
  const context = await loadViewContext(userId);
  let localToday;
  try {
    localToday = instituteToday(context.dataset.calendar.timezone ?? 'Asia/Kolkata');
  } catch {
    localToday = instituteToday('Asia/Kolkata');
  }
  const day = requestedDate
    ? new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${requestedDate}T12:00:00Z`))
    : localToday.day;
  const dayCode = requestedDate
    ? ({ Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN' })[day]
    : localToday.day;
  const date = requestedDate ?? localToday.date;
  const groupIds = context.user.studentGroupIds ?? [];
  const classes = context.assignments
    .map((assignment) => formatAssignment(assignment, context))
    .filter((item) => item && item.day === dayCode && item.groups.some((groupId) => groupIds.includes(groupId)))
    .map((item) => ({ ...item, itemType: 'class' }));
  const bookings = await BookingRequest.find({ dataset: context.dataset._id, status: 'approved' }).lean();
  const events = bookings
    .filter((booking) => {
      const mandatoryGroups = booking.mandatoryForGroups ?? [];
      return booking.decision?.day === dayCode && (!mandatoryGroups.length || mandatoryGroups.some((id) => groupIds.includes(id)));
    })
    .map((booking) => {
      const decision = booking.decision;
      const room = context.rooms.get(decision.roomId);
      return {
        itemType: 'event',
        id: booking.sourceId ?? String(booking._id),
        title: booking.title,
        day: decision.day,
        startPeriod: decision.startPeriod,
        endPeriod: decision.endPeriod,
        startTime: context.dataset.calendar.periods.find((period) => period.id === decision.startPeriod)?.start ?? null,
        endTime: context.dataset.calendar.periods.find((period) => period.id === decision.endPeriod)?.end ?? null,
        roomId: decision.roomId,
        roomName: room?.name ?? decision.roomId,
      };
    });
  const agenda = [...classes, ...events].sort((left, right) => left.startPeriod - right.startPeriod || left.itemType.localeCompare(right.itemType));
  return {
    date,
    day: dayCode,
    timeZone: localToday.timeZone,
    teachingDay: (context.dataset.calendar.days ?? []).includes(dayCode),
    studentGroupIds: groupIds,
    scheduleVersionId: String(context.assignments[0]?.scheduleVersion ?? ''),
    agenda,
  };
}

function localDayAndTime(timeZone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const read = (type) => parts.find((part) => part.type === type)?.value;
  const dayMap = { Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN' };
  return { day: dayMap[read('weekday')], minutes: Number(read('hour')) * 60 + Number(read('minute')) };
}

export async function getStudentNextClass(userId) {
  const context = await loadViewContext(userId);
  const groupIds = context.user.studentGroupIds ?? [];
  const classes = context.assignments
    .map((assignment) => formatAssignment(assignment, context))
    .filter((item) => item && item.groups.some((groupId) => groupIds.includes(groupId)))
    .sort(sortClasses);
  const timedClasses = classes.filter((item) => item.startTime && item.endTime);
  if (!timedClasses.length) return { nextClass: null };

  let now;
  try {
    now = localDayAndTime(context.dataset.calendar.timezone ?? 'Asia/Kolkata');
  } catch {
    now = localDayAndTime('Asia/Kolkata');
  }
  const dayPosition = dayOrder.indexOf(now.day);
  const nowMinutes = now.minutes;
  const candidates = timedClasses.map((item) => {
    const position = dayOrder.indexOf(item.day);
    const start = Number(item.startTime.slice(0, 2)) * 60 + Number(item.startTime.slice(3, 5));
    const end = Number(item.endTime.slice(0, 2)) * 60 + Number(item.endTime.slice(3, 5));
    let daysAhead = (position - dayPosition + 7) % 7;
    let minutesUntil = daysAhead * 1440 + start - nowMinutes;
    if (daysAhead === 0 && start <= nowMinutes && nowMinutes < end) minutesUntil = 0;
    else if (minutesUntil < 0) minutesUntil += 7 * 1440;
    return { ...item, minutesUntil, status: minutesUntil === 0 ? 'in_progress' : 'upcoming' };
  }).sort((a, b) => a.minutesUntil - b.minutesUntil);
  return { nextClass: candidates[0] };
}
