import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BookingRequest } from '../models/BookingRequest.js';
import { Dataset } from '../models/Dataset.js';
import { Exam } from '../models/Exam.js';
import { Faculty } from '../models/Faculty.js';
import { Room } from '../models/Room.js';
import { RoomUnavailability } from '../models/RoomUnavailability.js';
import { ScheduledSession } from '../models/ScheduledSession.js';
import { ScheduleVersion } from '../models/ScheduleVersion.js';
import { Session } from '../models/Session.js';
import { StudentGroup } from '../models/StudentGroup.js';
import { ApiError } from '../utils/apiError.js';
import { validateExamSchedule } from './exams/exam.scheduler.js';
import { validateSchedule } from './scheduler/schedule.validator.js';
import { env } from '../config/env.js';

async function createExportObject() {
  const dataset = await Dataset.findOne({ status: 'active' });
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const version = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' });
  if (!version) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'No active timetable exists.');
  const [rooms, faculty, groups, sessions, closures, assignments, exams, bookings] = await Promise.all([
    Room.find({ dataset: dataset._id }).lean(), Faculty.find({ dataset: dataset._id }).lean(),
    StudentGroup.find({ dataset: dataset._id }).lean(), Session.find({ dataset: dataset._id }).lean(),
    RoomUnavailability.find({ dataset: dataset._id }).lean(), ScheduledSession.find({ scheduleVersion: version._id }).lean(),
    Exam.find({ dataset: dataset._id }).lean(), BookingRequest.find({ dataset: dataset._id, sourceId: { $ne: null, $not: /^APP-/ } }).sort({ submittedAt: 1 }).lean(),
  ]);

  const substitutedSessions = assignments.filter((assignment) => assignment.facultyOverrideId).map((assignment) => assignment.sessionId);
  if (substitutedSessions.length) {
    throw new ApiError(409, 'EXPORT_SUBSTITUTIONS_UNSUPPORTED', 'The official timetable export format cannot represent substitute faculty assignments.', { sessionIds: substitutedSessions });
  }

  const scheduleValidation = validateSchedule({ dataset, rooms, faculty, studentGroups: groups, sessions, roomUnavailability: closures, assignments });
  if (!scheduleValidation.valid) throw new ApiError(409, 'SCHEDULE_VALIDATION_FAILED', 'Active schedule failed validation and cannot be exported.', { violations: scheduleValidation.hardViolations });
  const missingExams = exams.filter((exam) => !exam.scheduledDay || !exam.examSession || !exam.rooms?.length).map((exam) => exam.sourceId);
  const examAssignments = exams.filter((exam) => exam.scheduledDay && exam.examSession).map((exam) => ({ examId: exam.sourceId, day: exam.scheduledDay, session: exam.examSession, rooms: exam.rooms }));
  const examValidation = validateExamSchedule({ exams, rooms, calendar: dataset.calendar, roomUnavailability: closures, assignments: examAssignments });
  const unresolvedBookings = bookings.filter((booking) => !['approved', 'rejected', 'cancelled'].includes(booking.status)).map((booking) => booking.sourceId);
  const pendingBookings = bookings.filter((booking) => ['pending', 'alternative_offered'].includes(booking.status)).map((booking) => booking.sourceId);
  if (missingExams.length || !examValidation.valid || pendingBookings.length) {
    throw new ApiError(409, 'EXPORT_INCOMPLETE', 'Complete exam scheduling and dataset booking decisions before exporting.', {
      missingExams,
      invalidExamSchedule: examValidation.violations,
      pendingBookings,
      unresolvedBookings,
    });
  }

  const decisions = bookings.map((booking) => {
    const decision = booking.decision ?? {};
    const status = booking.status === 'cancelled' ? 'rejected' : booking.status;
    return {
      request_id: booking.sourceId,
      status,
      ...(decision.day ? { day: decision.day } : {}),
      ...(decision.startPeriod ? { start_period: decision.startPeriod } : {}),
      ...(decision.endPeriod ? { end_period: decision.endPeriod } : {}),
      ...(decision.roomId ? { room_id: decision.roomId } : {}),
      reason: decision.reason || (booking.status === 'cancelled' ? 'Request was cancelled.' : ''),
    };
  });
  const payload = {
    team: env.teamName,
    dataset_id: dataset.datasetId,
    sessions: assignments.map((row) => ({ session_id: row.sessionId, day: row.day, start_period: row.startPeriod, room_id: row.roomId })),
    fest_week: { bookings: decisions, session_overrides: [] },
    exams: examAssignments.map((row) => ({ exam_id: row.examId, day: row.day, session: row.session, rooms: row.rooms })),
  };
  return { payload, dataset, version, bookings, exams };
}

export async function exportSchedule() {
  const { payload, version } = await createExportObject();
  const exportDirectory = fileURLToPath(new URL('../../exports/', import.meta.url));
  await mkdir(exportDirectory, { recursive: true });
  const filePath = fileURLToPath(new URL('../../exports/schedule.json', import.meta.url));
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  let afterFilePath = null;
  if (version.kind !== 'generation') {
    afterFilePath = fileURLToPath(new URL('../../exports/schedule_after.json', import.meta.url));
    await writeFile(afterFilePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
  return { filePath, afterFilePath, datasetId: payload.dataset_id, sessions: payload.sessions.length, exams: payload.exams.length, bookings: payload.fest_week.bookings.length };
}

export async function getExportPreview() {
  const { payload } = await createExportObject();
  return payload;
}
