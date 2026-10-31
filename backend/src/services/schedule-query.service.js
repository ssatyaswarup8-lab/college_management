import { Course } from '../models/Course.js';
import { Dataset } from '../models/Dataset.js';
import { Faculty } from '../models/Faculty.js';
import { Room } from '../models/Room.js';
import { ScheduledSession } from '../models/ScheduledSession.js';
import { ScheduleVersion } from '../models/ScheduleVersion.js';
import { Session } from '../models/Session.js';
import { StudentGroup } from '../models/StudentGroup.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';

export async function getCurrentSchedule(filters = {}, requester = {}) {
  const dataset = await Dataset.findOne({ status: 'active' }).lean();
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const version = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' }).lean();
  if (!version) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'No active timetable exists.');
  const [assignments, sessions, courses, rooms, faculty, groups, user] = await Promise.all([
    ScheduledSession.find({ scheduleVersion: version._id }).lean(),
    Session.find({ dataset: dataset._id }).lean(), Course.find({ dataset: dataset._id }).lean(),
    Room.find({ dataset: dataset._id }).lean(), Faculty.find({ dataset: dataset._id }).lean(),
    StudentGroup.find({ dataset: dataset._id }).lean(),
    User.findById(requester.userId).select('role department').lean(),
  ]);
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'User account is unavailable.');
  if (user.role === 'DEPARTMENT_COORDINATOR' && !user.department) throw new ApiError(403, 'DEPARTMENT_REQUIRED', 'Coordinator account must be linked to a department.');
  const sessionMap = new Map(sessions.map((item) => [item.sourceId, item]));
  const courseMap = new Map(courses.map((item) => [item.sourceId, item]));
  const roomMap = new Map(rooms.map((item) => [item.sourceId, item]));
  const facultyMap = new Map(faculty.map((item) => [item.sourceId, item]));
  const groupMap = new Map(groups.map((item) => [item.sourceId, item]));
  const periods = new Map(dataset.calendar.periods.map((item) => [item.id, item]));

  let rows = assignments.map((assignment) => {
    const session = sessionMap.get(assignment.sessionId);
    if (!session) return null;
    const course = courseMap.get(session.courseId);
    const room = roomMap.get(assignment.roomId);
    const effectiveFacultyId = assignment.facultyOverrideId ?? session.facultyId;
    const instructor = facultyMap.get(effectiveFacultyId);
    const endPeriod = assignment.startPeriod + session.duration - 1;
    return {
      sessionId: session.sourceId,
      courseId: session.courseId,
      courseTitle: course?.title ?? session.courseId,
      department: course?.department ?? null,
      kind: session.kind,
      groups: session.groups.map((groupId) => ({ id: groupId, name: groupMap.get(groupId)?.name ?? groupId })),
      faculty: { id: effectiveFacultyId, name: instructor?.name ?? effectiveFacultyId, ...(assignment.facultyOverrideId ? { isSubstitute: true, originalFacultyId: session.facultyId } : {}) },
      day: assignment.day,
      startPeriod: assignment.startPeriod,
      endPeriod,
      startTime: periods.get(assignment.startPeriod)?.start ?? null,
      endTime: periods.get(endPeriod)?.end ?? null,
      room: { id: assignment.roomId, name: room?.name ?? assignment.roomId, building: room?.building ?? null, capacity: room?.capacity ?? null },
    };
  }).filter(Boolean);
  if (user.role === 'DEPARTMENT_COORDINATOR') rows = rows.filter((row) => row.department === user.department);
  if (filters.groupId) rows = rows.filter((row) => row.groups.some((group) => group.id === filters.groupId));
  if (filters.facultyId) rows = rows.filter((row) => row.faculty.id === filters.facultyId);
  if (filters.roomId) rows = rows.filter((row) => row.room.id === filters.roomId);
  if (filters.day) rows = rows.filter((row) => row.day === filters.day);
  rows.sort((a, b) => ['MON', 'TUE', 'WED', 'THU', 'FRI'].indexOf(a.day) - ['MON', 'TUE', 'WED', 'THU', 'FRI'].indexOf(b.day) || a.startPeriod - b.startPeriod);
  return { datasetId: dataset.datasetId, scheduleVersion: { id: String(version._id), versionNumber: version.versionNumber, status: version.status }, sessions: rows };
}
