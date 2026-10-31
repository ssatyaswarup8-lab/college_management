import { Conflict } from '../../models/Conflict.js';
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
import { buildConstraintContext } from '../scheduler/hard.constraints.js';
import { generateCandidates, generateNearMissCandidates } from '../scheduler/candidate.generator.js';
import { validateSchedule } from '../scheduler/schedule.validator.js';
import { analyzeManualChange, proposeManualChange } from '../scheduler/manual.service.js';

async function loadConflictContext(conflict) {
  const [dataset, version, rooms, faculty, studentGroups, sessions, closures] = await Promise.all([
    Dataset.findById(conflict.dataset),
    ScheduleVersion.findById(conflict.scheduleVersion),
    Room.find({ dataset: conflict.dataset }).lean(),
    Faculty.find({ dataset: conflict.dataset }).lean(),
    StudentGroup.find({ dataset: conflict.dataset }).lean(),
    Session.find({ dataset: conflict.dataset }).lean(),
    RoomUnavailability.find({ dataset: conflict.dataset }).lean(),
  ]);
  if (!dataset || !version) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'The conflict schedule version is no longer available.');
  const assignments = await ScheduledSession.find({ scheduleVersion: version._id }).lean();
  return { dataset, version, rooms, faculty, studentGroups, sessions, closures, assignments };
}

async function assertSessionDepartmentAccess({ datasetId, sessionId, userId, userRole }) {
  if (userRole !== 'DEPARTMENT_COORDINATOR') return;
  const user = await User.findById(userId).select('department').lean();
  if (!user?.department) throw new ApiError(403, 'DEPARTMENT_REQUIRED', 'Coordinator account must be linked to a department.');
  const session = await Session.findOne({ dataset: datasetId, sourceId: sessionId }).select('courseId').lean();
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', `Session ${sessionId} was not found.`);
  const course = await Course.findOne({ dataset: datasetId, sourceId: session.courseId }).select('department').lean();
  if (course?.department !== user.department) throw new ApiError(403, 'FORBIDDEN', 'Coordinators may access conflicts only for their department sessions.');
}

async function departmentSessionIds(datasetId, department) {
  const courses = await Course.find({ dataset: datasetId, department }).select('sourceId').lean();
  const courseIds = courses.map((row) => row.sourceId);
  const sessions = await Session.find({ dataset: datasetId, courseId: { $in: courseIds } }).select('sourceId').lean();
  return sessions.map((row) => row.sourceId);
}

export async function createConflict({ userId, userRole, input }) {
  const dataset = await Dataset.findOne({ status: 'active' });
  const version = dataset && await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' });
  if (!dataset || !version) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'An active timetable is required to analyze a conflict.');
  const session = await Session.findOne({ dataset: dataset._id, sourceId: input.sessionId });
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', `Session ${input.sessionId} was not found.`);
  await assertSessionDepartmentAccess({ datasetId: dataset._id, sessionId: input.sessionId, userId, userRole });
  const analysis = input.proposedPlacement
    ? await analyzeManualChange({ sessionId: input.sessionId, ...input.proposedPlacement })
    : null;
  return Conflict.create({
    dataset: dataset._id,
    scheduleVersion: version._id,
    sessionId: input.sessionId,
    proposedPlacement: input.proposedPlacement,
    violations: analysis?.conflictsIntroduced ?? [],
    createdBy: userId,
    status: analysis ? 'analyzed' : 'open',
  });
}

export async function listConflicts({ status, userId, userRole } = {}) {
  const dataset = await Dataset.findOne({ status: 'active' }).select('_id');
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const conflicts = await Conflict.find({ dataset: dataset._id, ...(status ? { status } : {}) }).sort({ createdAt: -1 }).lean();
  if (userRole !== 'DEPARTMENT_COORDINATOR') return conflicts;
  const user = await User.findById(userId).select('department').lean();
  if (!user?.department) throw new ApiError(403, 'DEPARTMENT_REQUIRED', 'Coordinator account must be linked to a department.');
  const sessionIds = new Set(await departmentSessionIds(dataset._id, user.department));
  return conflicts.filter((conflict) => sessionIds.has(conflict.sessionId));
}

export async function findSolutions(conflictId, maxSolutions = 5, maxNearMisses = 3, requester = {}) {
  const conflict = await Conflict.findById(conflictId);
  if (!conflict) throw new ApiError(404, 'CONFLICT_NOT_FOUND', 'Conflict was not found.');
  await assertSessionDepartmentAccess({ datasetId: conflict.dataset, sessionId: conflict.sessionId, ...requester });
  const state = await loadConflictContext(conflict);
  const activeVersion = await ScheduleVersion.findOne({ dataset: conflict.dataset, status: 'active' }).select('_id').lean();
  if (!activeVersion || String(activeVersion._id) !== String(state.version._id)) {
    throw new ApiError(409, 'CONFLICT_STALE', 'The active timetable changed after this conflict was recorded. Analyze the conflict again.');
  }
  const session = state.sessions.find((row) => row.sourceId === conflict.sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Conflicted session was not found.');
  const before = state.assignments.find((row) => row.sessionId === conflict.sessionId);
  if (!before) throw new ApiError(404, 'SESSION_NOT_SCHEDULED', 'Conflicted session is not in the timetable.');

  const locked = state.assignments.filter((row) => row.sessionId !== conflict.sessionId);
  const context = buildConstraintContext({ dataset: state.dataset, rooms: state.rooms, faculty: state.faculty, studentGroups: state.studentGroups, sessions: state.sessions, roomUnavailability: state.closures, assignments: locked });
  const effectiveFacultyId = before.facultyOverrideId ?? session.facultyId;
  const candidateSession = effectiveFacultyId === session.facultyId ? session : { ...session, facultyId: effectiveFacultyId };
  const candidates = generateCandidates(candidateSession, context);
  let nearMisses = generateNearMissCandidates(candidateSession, context, { currentPlacement: before, limit: maxNearMisses });
  if (maxNearMisses > 0 && conflict.proposedPlacement) {
    const proposed = { sessionId: conflict.sessionId, ...conflict.proposedPlacement };
    const proposedViolations = validatePlacement(context, candidateSession, proposed, { excludeSessionId: conflict.sessionId });
    const alreadyIncluded = nearMisses.some((candidate) => candidate.placement.day === proposed.day
      && candidate.placement.startPeriod === proposed.startPeriod
      && candidate.placement.roomId === proposed.roomId);
    if (proposedViolations.length && !alreadyIncluded) {
      nearMisses = [{
        placement: proposed,
        valid: false,
        violationCount: proposedViolations.length,
        violations: proposedViolations,
        rankReasons: proposedViolations.map((violation) => violation.message),
        fromReportedProposal: true,
      }, ...nearMisses].slice(0, maxNearMisses);
      nearMisses = nearMisses.map((candidate, index) => ({ ...candidate, rank: index + 1 }));
    }
  }
  const solutions = [];
  const baselineResult = validateSchedule({ dataset: state.dataset, rooms: state.rooms, faculty: state.faculty, studentGroups: state.studentGroups, sessions: state.sessions, roomUnavailability: state.closures, assignments: state.assignments });

  for (const candidate of candidates) {
    if (candidate.day === before.day && candidate.startPeriod === before.startPeriod && candidate.roomId === before.roomId) continue;
    const assignments = [...locked.map((row) => ({ sessionId: row.sessionId, day: row.day, startPeriod: row.startPeriod, roomId: row.roomId, ...(row.facultyOverrideId ? { facultyOverrideId: row.facultyOverrideId } : {}) })), {
      sessionId: conflict.sessionId,
      day: candidate.day,
      startPeriod: candidate.startPeriod,
      roomId: candidate.roomId,
      ...(before.facultyOverrideId ? { facultyOverrideId: before.facultyOverrideId } : {}),
    }];
    const result = validateSchedule({ dataset: state.dataset, rooms: state.rooms, faculty: state.faculty, studentGroups: state.studentGroups, sessions: state.sessions, roomUnavailability: state.closures, assignments });
    if (!result.valid) continue;
    const timeChanged = candidate.day !== before.day || candidate.startPeriod !== before.startPeriod;
    const roomOnlyChanged = !timeChanged;
    const facultyHours = assignments.reduce((total, assignment) => {
      if (assignment.day !== candidate.day) return total;
      const scheduledSession = state.sessions.find((row) => row.sourceId === assignment.sessionId);
      const assignedFacultyId = assignment.facultyOverrideId ?? scheduledSession?.facultyId;
      return total + (assignedFacultyId === effectiveFacultyId ? scheduledSession?.duration ?? 0 : 0);
    }, 0);
    const facultyLimit = state.faculty.find((row) => row.sourceId === effectiveFacultyId)?.maxHoursPerDay ?? 4;
    const beforeRoomId = before.roomId;
    const gapChange = (result.softPenalties.S2 ?? 0) - (baselineResult.softPenalties.S2 ?? 0);
    const cost = (roomOnlyChanged ? 0 : candidate.day === before.day ? 10 : 20)
      + (result.softPenalty - baselineResult.softPenalty) * 0.5
      + (candidate.roomSlack ?? 0) / 1000;
    solutions.push({
      placement: { sessionId: conflict.sessionId, day: candidate.day, startPeriod: candidate.startPeriod, roomId: candidate.roomId },
      valid: true,
      impact: {
        timeChanged,
        roomOnlyChanged,
        softPenaltyBefore: baselineResult.softPenalty,
        softPenaltyAfter: result.softPenalty,
        softPenaltyDifference: result.softPenalty - baselineResult.softPenalty,
        affectedFaculty: [effectiveFacultyId],
        affectedGroups: session.groups,
        affectedRooms: [...new Set([beforeRoomId, candidate.roomId])],
        conflictsIntroduced: [],
        studentGapChange: gapChange,
        facultyDailyHours: { after: facultyHours, limit: facultyLimit, overLimitBy: Math.max(0, facultyHours - facultyLimit) },
      },
      rankScore: cost,
    });
  }
  solutions.sort((a, b) => a.rankScore - b.rankScore);
  conflict.solutions = solutions.slice(0, maxSolutions).map(({ rankScore, ...solution }) => ({ ...solution, rankScore }));
  conflict.nearMisses = nearMisses;
  conflict.status = conflict.solutions.length ? 'solutions_ready' : 'analyzed';
  await conflict.save();
  return {
    conflictId: String(conflict._id),
    solutions: conflict.solutions,
    nearMisses: conflict.nearMisses,
    note: 'Near-miss options contain hard violations and cannot be applied. Apply only a valid solution.',
  };
}

export async function applySolution(conflictId, solutionIndex, adminId) {
  const conflict = await Conflict.findById(conflictId);
  if (!conflict || !conflict.solutions[solutionIndex]) throw new ApiError(404, 'CONFLICT_SOLUTION_NOT_FOUND', 'Selected valid solution was not found.');
  const selected = conflict.solutions[solutionIndex];
  const proposal = await proposeManualChange({ ...selected.placement, reason: `Conflict resolution for ${conflict.sessionId}` }, adminId);
  conflict.selectedSolution = solutionIndex;
  conflict.proposedVersion = proposal.versionId;
  conflict.status = 'proposal_created';
  await conflict.save();
  return { conflictId: String(conflict._id), proposal, solution: selected };
}
