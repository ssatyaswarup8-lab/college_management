import { Course } from '../../models/Course.js';
import { Dataset } from '../../models/Dataset.js';
import { Faculty } from '../../models/Faculty.js';
import { FacultyQualification } from '../../models/FacultyQualification.js';
import { Room } from '../../models/Room.js';
import { RoomUnavailability } from '../../models/RoomUnavailability.js';
import { ScheduledSession } from '../../models/ScheduledSession.js';
import { ScheduleVersion } from '../../models/ScheduleVersion.js';
import { Session } from '../../models/Session.js';
import { StudentGroup } from '../../models/StudentGroup.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/apiError.js';
import { buildConstraintContext, validatePlacement } from '../scheduler/hard.constraints.js';

export async function listFacultyDirectory({ userId, userRole }) {
  const dataset = await Dataset.findOne({ status: 'active' }).select('_id');
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');

  const filter = { dataset: dataset._id };
  if (userRole === 'DEPARTMENT_COORDINATOR') {
    const user = await User.findById(userId).select('department isActive').lean();
    if (!user || !user.isActive) throw new ApiError(401, 'UNAUTHORIZED', 'User account is unavailable.');
    if (!user.department) throw new ApiError(403, 'DEPARTMENT_REQUIRED', 'Coordinator account must be linked to a department.');
    filter.department = user.department;
  }
  return Faculty.find(filter).sort({ department: 1, name: 1 }).lean();
}

export async function addQualification({ input, verifiedBy }) {
  const dataset = await Dataset.findOne({ status: 'active' }).select('_id');
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const [faculty, course] = await Promise.all([
    Faculty.findOne({ dataset: dataset._id, sourceId: input.facultyId }).select('_id'),
    Course.findOne({ dataset: dataset._id, sourceId: input.courseId }).select('_id'),
  ]);
  if (!faculty) throw new ApiError(404, 'FACULTY_NOT_FOUND', `Faculty ${input.facultyId} was not found.`);
  if (!course) throw new ApiError(404, 'COURSE_NOT_FOUND', `Course ${input.courseId} was not found.`);
  const existing = await FacultyQualification.findOne({ dataset: dataset._id, facultyId: input.facultyId, courseId: input.courseId });
  if (existing) {
    if (existing.active) throw new ApiError(409, 'QUALIFICATION_ALREADY_EXISTS', 'This faculty-course qualification is already active.');
    existing.qualificationNote = input.qualificationNote ?? '';
    existing.verifiedBy = verifiedBy;
    existing.revokedBy = null;
    existing.revokedAt = null;
    existing.active = true;
    await existing.save();
    return existing;
  }
  return FacultyQualification.create({ dataset: dataset._id, facultyId: input.facultyId, courseId: input.courseId, qualificationNote: input.qualificationNote ?? '', verifiedBy });
}

export async function revokeQualification({ qualificationId, revokedBy }) {
  const dataset = await Dataset.findOne({ status: 'active' }).select('_id');
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const qualification = await FacultyQualification.findOne({ _id: qualificationId, dataset: dataset._id });
  if (!qualification) throw new ApiError(404, 'QUALIFICATION_NOT_FOUND', 'Faculty qualification was not found.');
  if (!qualification.active) throw new ApiError(409, 'QUALIFICATION_ALREADY_REVOKED', 'This faculty qualification is already inactive.');
  qualification.active = false;
  qualification.revokedBy = revokedBy;
  qualification.revokedAt = new Date();
  await qualification.save();
  return qualification;
}

export async function listQualifications({ courseId, facultyId } = {}) {
  const dataset = await Dataset.findOne({ status: 'active' }).select('_id');
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  return FacultyQualification.find({ dataset: dataset._id, active: true, ...(courseId ? { courseId } : {}), ...(facultyId ? { facultyId } : {}) }).sort({ courseId: 1, facultyId: 1 }).lean();
}

export async function findSubstitutes({ userId, userRole, sessionId }) {
  const dataset = await Dataset.findOne({ status: 'active' });
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const version = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' });
  if (!version) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'An active timetable is required to find substitutes.');
  const [sessions, faculty, rooms, groups, closures, assignments, courses, user] = await Promise.all([
    Session.find({ dataset: dataset._id }).lean(), Faculty.find({ dataset: dataset._id }).lean(),
    Room.find({ dataset: dataset._id }).lean(), StudentGroup.find({ dataset: dataset._id }).lean(),
    RoomUnavailability.find({ dataset: dataset._id }).lean(), ScheduledSession.find({ scheduleVersion: version._id }).lean(),
    Course.find({ dataset: dataset._id }).lean(), User.findById(userId).select('facultyId department'),
  ]);
  const session = sessions.find((row) => row.sourceId === sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', `Session ${sessionId} was not found.`);
  if (userRole === 'FACULTY' && user?.facultyId !== session.facultyId) throw new ApiError(403, 'FORBIDDEN', 'Faculty may find substitutes only for their own sessions.');
  if (userRole === 'DEPARTMENT_COORDINATOR') {
    const course = courses.find((row) => row.sourceId === session.courseId);
    if (!course || course.department !== user?.department) throw new ApiError(403, 'FORBIDDEN', 'Coordinators may find substitutes only for their department sessions.');
  }

  const placement = assignments.find((row) => row.sessionId === sessionId);
  if (!placement) throw new ApiError(404, 'SESSION_NOT_SCHEDULED', `Session ${sessionId} is not in the active timetable.`);
  const qualifications = await FacultyQualification.find({ dataset: dataset._id, courseId: session.courseId, active: true }).lean();
  const qualifiedIds = new Set(qualifications.map((row) => row.facultyId));
  const alternateSessions = sessions.map((row) => row);
  const context = buildConstraintContext({
    dataset, rooms, faculty, studentGroups: groups, sessions: alternateSessions,
    roomUnavailability: closures,
    // Remove the session being reassigned from occupancy so the candidate is checked as a replacement.
    assignments: assignments.filter((assignment) => assignment.sessionId !== sessionId),
  });
  const course = courses.find((row) => row.sourceId === session.courseId);

  const currentFacultyId = placement.facultyOverrideId ?? session.facultyId;
  const candidates = faculty.filter((member) => member.sourceId !== currentFacultyId).map((member) => {
    const qualified = qualifiedIds.has(member.sourceId);
    const replacement = { ...session, facultyId: member.sourceId };
    const violations = validatePlacement(context, replacement, placement, { excludeSessionId: sessionId });
    const reasons = [
      ...(!qualified ? ['No Admin-verified qualification for this course.'] : []),
      ...violations.map((violation) => violation.message),
    ];
    const existingHours = assignments.reduce((total, assignment) => {
      if (assignment.day !== placement.day || assignment.sessionId === sessionId) return total;
      const assignedSession = sessions.find((row) => row.sourceId === assignment.sessionId);
      const effectiveFacultyId = assignment.facultyOverrideId ?? assignedSession?.facultyId;
      return total + (effectiveFacultyId === member.sourceId ? assignedSession?.duration ?? 0 : 0);
    }, 0);
    const sameDepartment = member.department === course?.department;
    const eligible = reasons.length === 0;
    const hoursAfterAssignment = existingHours + session.duration;
    const dailyLimitSafe = hoursAfterAssignment <= member.maxHoursPerDay;
    const rankReasons = [
      sameDepartment ? 'Same department as the course.' : `Different department (${member.department}).`,
      `Daily load after assignment: ${hoursAfterAssignment}/${member.maxHoursPerDay} hours on ${placement.day}.`,
      eligible ? 'Meets qualification and schedule constraints.' : 'Not eligible until all listed blockers are resolved.',
      'The class stays in the same room and time slot; no other session needs to move.',
    ];
    return {
      facultyId: member.sourceId,
      name: member.name,
      department: member.department,
      eligible,
      reasons,
      eligibilityChecks: {
        qualification: { passed: qualified, courseId: session.courseId, note: qualifications.find((row) => row.facultyId === member.sourceId)?.qualificationNote ?? null },
        schedule: { passed: violations.length === 0, violations },
        dailyWorkload: {
          passed: dailyLimitSafe,
          day: placement.day,
          currentHours: existingHours,
          hoursAfterAssignment,
          dailyLimit: member.maxHoursPerDay,
          remainingHours: Math.max(0, member.maxHoursPerDay - hoursAfterAssignment),
        },
      },
      qualificationNote: qualifications.find((row) => row.facultyId === member.sourceId)?.qualificationNote ?? null,
      dailyHoursAfterAssignment: hoursAfterAssignment,
      dailyLimit: member.maxHoursPerDay,
      timetableImpact: { sessionsMoved: 0, groupsAffected: session.groups, roomId: placement.roomId, day: placement.day, startPeriod: placement.startPeriod },
      rankReasons,
      rankScore: (sameDepartment ? 0 : 10) + existingHours,
    };
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.rankScore - b.rankScore || a.facultyId.localeCompare(b.facultyId));

  const rankedCandidates = candidates.map(({ rankScore, ...candidate }, index) => ({ ...candidate, rank: index + 1 }));
  const recommendedCandidate = rankedCandidates.find((candidate) => candidate.eligible) ?? null;

  return {
    session: { sessionId, courseId: session.courseId, courseTitle: course?.title, currentFacultyId, originalFacultyId: session.facultyId, day: placement.day, startPeriod: placement.startPeriod, roomId: placement.roomId },
    candidates: rankedCandidates,
    recommended: recommendedCandidate?.facultyId ?? null,
    recommendationReason: recommendedCandidate
      ? 'Highest-ranked eligible candidate, ordered by department match, daily teaching load, and faculty ID.'
      : 'No faculty member currently meets the qualification and schedule constraints.',
    recommendedCandidate,
  };
}

export async function applySubstitute({ sessionId, facultyId, approvedBy, reason = '' }) {
  const dataset = await Dataset.findOne({ status: 'active' });
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const current = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' });
  if (!current) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'An active timetable is required to apply a substitute.');

  const [sessions, faculty, rooms, groups, closures, assignments] = await Promise.all([
    Session.find({ dataset: dataset._id }).lean(), Faculty.find({ dataset: dataset._id }).lean(),
    Room.find({ dataset: dataset._id }).lean(), StudentGroup.find({ dataset: dataset._id }).lean(),
    RoomUnavailability.find({ dataset: dataset._id }).lean(), ScheduledSession.find({ scheduleVersion: current._id }).lean(),
  ]);
  const session = sessions.find((row) => row.sourceId === sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', `Session ${sessionId} was not found.`);
  const placement = assignments.find((row) => row.sessionId === sessionId);
  if (!placement) throw new ApiError(404, 'SESSION_NOT_SCHEDULED', `Session ${sessionId} is not in the active timetable.`);
  const replacement = faculty.find((row) => row.sourceId === facultyId);
  if (!replacement) throw new ApiError(404, 'FACULTY_NOT_FOUND', `Faculty ${facultyId} was not found.`);
  const effectiveFacultyId = placement.facultyOverrideId ?? session.facultyId;
  if (facultyId === effectiveFacultyId) throw new ApiError(400, 'SUBSTITUTE_UNCHANGED', 'Selected faculty member is already assigned to this session.');

  const qualification = await FacultyQualification.exists({ dataset: dataset._id, facultyId, courseId: session.courseId, active: true });
  if (!qualification) throw new ApiError(409, 'SUBSTITUTE_NOT_QUALIFIED', 'Selected faculty member has no active Admin-verified qualification for this course.');
  const context = buildConstraintContext({
    dataset, rooms, faculty, studentGroups: groups, sessions,
    roomUnavailability: closures,
    assignments: assignments.filter((row) => row.sessionId !== sessionId),
  });
  const violations = validatePlacement(context, { ...session, facultyId }, placement, { excludeSessionId: sessionId });
  if (violations.length) throw new ApiError(409, 'SUBSTITUTE_SCHEDULE_CONFLICT', 'Selected faculty member cannot take this session in the current slot.', { violations });

  const before = { sessionId, facultyId: effectiveFacultyId, day: placement.day, startPeriod: placement.startPeriod, roomId: placement.roomId };
  const after = { ...before, facultyId };
  const latest = await ScheduleVersion.findOne({ dataset: dataset._id }).sort({ versionNumber: -1 }).select('versionNumber');
  const version = await ScheduleVersion.create({
    dataset: dataset._id,
    versionNumber: (latest?.versionNumber ?? 0) + 1,
    baseVersion: current._id,
    kind: 'substitute_change',
    status: 'proposed',
    createdBy: approvedBy,
    reason: reason || `Substitute approved for ${sessionId}.`,
    changes: [{ sessionId, before, after, reason }],
    summary: { sessionsScheduled: assignments.length, hardViolations: 0, softPenalty: current.summary?.softPenalty ?? 0, sessionsMoved: 0 },
  });

  let baseSuperseded = false;
  try {
    await ScheduledSession.insertMany(assignments.map((row) => ({
      dataset: dataset._id,
      scheduleVersion: version._id,
      sessionId: row.sessionId,
      day: row.day,
      startPeriod: row.startPeriod,
      roomId: row.roomId,
      facultyOverrideId: row.sessionId === sessionId ? facultyId : row.facultyOverrideId ?? null,
      source: row.sessionId === sessionId ? 'substitute' : row.source ?? 'generated',
    })));

    const activatedBase = await ScheduleVersion.updateOne({ _id: current._id, status: 'active' }, { $set: { status: 'superseded' } });
    if (activatedBase.modifiedCount !== 1) throw new ApiError(409, 'SCHEDULE_VERSION_STALE', 'The active timetable changed while the substitute was being applied. Please retry.');
    baseSuperseded = true;
    version.status = 'active';
    version.approvedBy = approvedBy;
    version.approvedAt = new Date();
    await version.save();
    return { versionId: String(version._id), status: version.status, sessionId, previousFacultyId: effectiveFacultyId, facultyId };
  } catch (error) {
    if (baseSuperseded) await ScheduleVersion.updateOne({ _id: current._id, status: 'superseded' }, { $set: { status: 'active' } });
    await ScheduledSession.deleteMany({ scheduleVersion: version._id });
    await ScheduleVersion.deleteOne({ _id: version._id });
    if (error instanceof ApiError && error.code === 'SCHEDULE_VERSION_STALE') throw error;
    throw error;
  }
}

export async function restoreOriginalFaculty({ sessionId, approvedBy, reason = '' }) {
  const dataset = await Dataset.findOne({ status: 'active' });
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const current = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' });
  if (!current) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'An active timetable is required to restore the original faculty member.');
  const [sessions, faculty, rooms, groups, closures, assignments] = await Promise.all([
    Session.find({ dataset: dataset._id }).lean(), Faculty.find({ dataset: dataset._id }).lean(),
    Room.find({ dataset: dataset._id }).lean(), StudentGroup.find({ dataset: dataset._id }).lean(),
    RoomUnavailability.find({ dataset: dataset._id }).lean(), ScheduledSession.find({ scheduleVersion: current._id }).lean(),
  ]);
  const session = sessions.find((row) => row.sourceId === sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', `Session ${sessionId} was not found.`);
  const placement = assignments.find((row) => row.sessionId === sessionId);
  if (!placement) throw new ApiError(404, 'SESSION_NOT_SCHEDULED', `Session ${sessionId} is not in the active timetable.`);
  const substituteId = placement.facultyOverrideId;
  if (!substituteId) throw new ApiError(409, 'SUBSTITUTE_NOT_ASSIGNED', `Session ${sessionId} has no substitute assignment to restore.`);
  const originalFaculty = faculty.find((row) => row.sourceId === session.facultyId);
  if (!originalFaculty) throw new ApiError(409, 'ORIGINAL_FACULTY_NOT_FOUND', `Original faculty ${session.facultyId} is no longer in the active dataset.`);

  const context = buildConstraintContext({
    dataset, rooms, faculty, studentGroups: groups, sessions,
    roomUnavailability: closures,
    assignments: assignments.filter((row) => row.sessionId !== sessionId),
  });
  const violations = validatePlacement(context, session, placement, { excludeSessionId: sessionId });
  if (violations.length) throw new ApiError(409, 'ORIGINAL_FACULTY_UNAVAILABLE', 'Original faculty member cannot take this session in the current slot.', { violations });

  const before = { sessionId, facultyId: substituteId, day: placement.day, startPeriod: placement.startPeriod, roomId: placement.roomId };
  const after = { ...before, facultyId: session.facultyId };
  const latest = await ScheduleVersion.findOne({ dataset: dataset._id }).sort({ versionNumber: -1 }).select('versionNumber');
  const version = await ScheduleVersion.create({
    dataset: dataset._id,
    versionNumber: (latest?.versionNumber ?? 0) + 1,
    baseVersion: current._id,
    kind: 'substitute_reversion',
    status: 'proposed',
    createdBy: approvedBy,
    reason: reason || `Restored original faculty for ${sessionId}.`,
    changes: [{ sessionId, before, after, reason }],
    summary: { sessionsScheduled: assignments.length, hardViolations: 0, softPenalty: current.summary?.softPenalty ?? 0, sessionsMoved: 0 },
  });

  let baseSuperseded = false;
  try {
    await ScheduledSession.insertMany(assignments.map((row) => ({
      dataset: dataset._id,
      scheduleVersion: version._id,
      sessionId: row.sessionId,
      day: row.day,
      startPeriod: row.startPeriod,
      roomId: row.roomId,
      facultyOverrideId: row.sessionId === sessionId ? null : row.facultyOverrideId ?? null,
      source: row.sessionId === sessionId ? 'manual' : row.source ?? 'generated',
    })));
    const superseded = await ScheduleVersion.updateOne({ _id: current._id, status: 'active' }, { $set: { status: 'superseded' } });
    if (superseded.modifiedCount !== 1) throw new ApiError(409, 'SCHEDULE_VERSION_STALE', 'The active timetable changed while restoring the original faculty. Please retry.');
    baseSuperseded = true;
    version.status = 'active';
    version.approvedBy = approvedBy;
    version.approvedAt = new Date();
    await version.save();
    return { versionId: String(version._id), status: version.status, sessionId, previousFacultyId: substituteId, facultyId: session.facultyId };
  } catch (error) {
    if (baseSuperseded) await ScheduleVersion.updateOne({ _id: current._id, status: 'superseded' }, { $set: { status: 'active' } });
    await ScheduledSession.deleteMany({ scheduleVersion: version._id });
    await ScheduleVersion.deleteOne({ _id: version._id });
    throw error;
  }
}
