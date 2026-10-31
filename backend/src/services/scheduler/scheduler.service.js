import { Dataset } from '../../models/Dataset.js';
import { Faculty } from '../../models/Faculty.js';
import { Room } from '../../models/Room.js';
import { RoomUnavailability } from '../../models/RoomUnavailability.js';
import { ScheduleGeneration } from '../../models/ScheduleGeneration.js';
import { ScheduleVersion } from '../../models/ScheduleVersion.js';
import { ScheduledSession } from '../../models/ScheduledSession.js';
import { Session } from '../../models/Session.js';
import { StudentGroup } from '../../models/StudentGroup.js';
import { ApiError } from '../../utils/apiError.js';
import { buildConstraintContext } from './hard.constraints.js';
import { solveTimetable } from './solver.js';
import { validateSchedule } from './schedule.validator.js';

export async function generateSchedule({ requestedBy, options = {} }) {
  const dataset = await Dataset.findOne({ status: 'active' });
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'Import and activate a dataset before generating a timetable.');

  const [rooms, faculty, studentGroups, sessions, roomUnavailability] = await Promise.all([
    Room.find({ dataset: dataset._id }).lean(),
    Faculty.find({ dataset: dataset._id }).lean(),
    StudentGroup.find({ dataset: dataset._id }).lean(),
    Session.find({ dataset: dataset._id }).lean(),
    RoomUnavailability.find({ dataset: dataset._id }).lean(),
  ]);
  if (!sessions.length) throw new ApiError(409, 'DATASET_EMPTY', 'The active dataset has no sessions to schedule.');

  const generation = await ScheduleGeneration.create({
    dataset: dataset._id,
    requestedBy,
    status: 'running',
    startedAt: new Date(),
    solver: 'deterministic-bounded-backtracking',
  });
  let createdVersion = null;

  try {
    const context = buildConstraintContext({ dataset, rooms, faculty, studentGroups, sessions, roomUnavailability });
    const result = await solveTimetable(context, sessions, options);
    if (!result.solved) {
      generation.status = 'failed';
      generation.completedAt = new Date();
      generation.error = { code: 'NO_VALID_SOLUTION', message: result.reason };
      await generation.save();
      throw new ApiError(409, 'NO_VALID_SOLUTION', 'The solver did not find a valid timetable within its search limits.', {
        reason: result.reason,
        unscheduledSessionIds: result.unscheduledSessionIds,
        searchNodes: result.nodes,
        elapsedMs: result.elapsedMs,
      });
    }

    const validation = validateSchedule({ dataset, rooms, faculty, studentGroups, sessions, roomUnavailability, assignments: result.assignments });
    if (!validation.valid) {
      generation.status = 'failed';
      generation.completedAt = new Date();
      generation.error = { code: 'SCHEDULE_VALIDATION_FAILED', message: 'Generated schedule failed deterministic validation.' };
      generation.result = { sessionsScheduled: result.assignments.length, hardViolations: validation.hardViolationCount, softPenalty: validation.softPenalty };
      await generation.save();
      throw new ApiError(500, 'SCHEDULE_VALIDATION_FAILED', 'Generated timetable failed backend validation and was not saved.', {
        violations: validation.hardViolations,
      });
    }

    const latestVersion = await ScheduleVersion.findOne({ dataset: dataset._id }).sort({ versionNumber: -1 }).select('versionNumber');
    const activeVersion = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' }).select('_id');
    const version = await ScheduleVersion.create({
      dataset: dataset._id,
      versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
      generationId: generation._id,
      kind: 'generation',
      baseVersion: activeVersion?._id ?? null,
      status: activeVersion ? 'proposed' : 'active',
      createdBy: requestedBy,
      reason: 'Generated from the active dataset.',
      summary: {
        sessionsScheduled: result.assignments.length,
        hardViolations: validation.hardViolationCount,
        softPenalty: validation.softPenalty,
      },
    });
    createdVersion = version;

    await ScheduledSession.insertMany(result.assignments.map((assignment) => ({
      dataset: dataset._id,
      scheduleVersion: version._id,
      sessionId: assignment.sessionId,
      day: assignment.day,
      startPeriod: assignment.startPeriod,
      roomId: assignment.roomId,
      source: 'generated',
    })));

    generation.status = 'succeeded';
    generation.completedAt = new Date();
    generation.result = {
      sessionsScheduled: result.assignments.length,
      examsScheduled: 0,
      hardViolations: validation.hardViolationCount,
      softPenalty: validation.softPenalty,
    };
    await generation.save();

    return {
      generationId: String(generation._id),
      scheduleVersionId: String(version._id),
      scheduleStatus: version.status,
      datasetId: dataset.datasetId,
      sessionsScheduled: result.assignments.length,
      examsScheduled: 0,
      hardViolations: validation.hardViolationCount,
      softPenalty: validation.softPenalty,
      searchNodes: result.nodes,
      elapsedMs: result.elapsedMs,
    };
  } catch (error) {
    if (createdVersion) {
      await ScheduledSession.deleteMany({ scheduleVersion: createdVersion._id });
      await ScheduleVersion.deleteOne({ _id: createdVersion._id });
    }
    if (generation.status === 'running') {
      generation.status = 'failed';
      generation.completedAt = new Date();
      generation.error = { code: error.code ?? 'SCHEDULE_GENERATION_FAILED', message: error.message };
      await generation.save();
    }
    throw error;
  }
}
