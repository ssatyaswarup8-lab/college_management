import { Dataset } from '../../models/Dataset.js';
import { Faculty } from '../../models/Faculty.js';
import { Room } from '../../models/Room.js';
import { RoomUnavailability } from '../../models/RoomUnavailability.js';
import { ScheduleVersion } from '../../models/ScheduleVersion.js';
import { ScheduledSession } from '../../models/ScheduledSession.js';
import { Session } from '../../models/Session.js';
import { StudentGroup } from '../../models/StudentGroup.js';
import { ApiError } from '../../utils/apiError.js';
import { validateSchedule } from './schedule.validator.js';

async function activeDataset() {
  const dataset = await Dataset.findOne({ status: 'active' });
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  return dataset;
}

export async function listScheduleVersions({ status, kind } = {}) {
  const dataset = await activeDataset();
  return ScheduleVersion.find({ dataset: dataset._id, ...(status ? { status } : {}), ...(kind ? { kind } : {}) })
    .sort({ versionNumber: -1 })
    .select('-__v')
    .lean();
}

export async function getScheduleVersion(versionId) {
  const dataset = await activeDataset();
  const version = await ScheduleVersion.findOne({ _id: versionId, dataset: dataset._id }).select('-__v').lean();
  if (!version) throw new ApiError(404, 'SCHEDULE_VERSION_NOT_FOUND', 'Schedule version was not found in the active dataset.');
  const assignments = await ScheduledSession.find({ scheduleVersion: version._id }).sort({ day: 1, startPeriod: 1 }).lean();
  return { version, assignments };
}

export async function approveGeneratedVersion(versionId, approvedBy) {
  const dataset = await activeDataset();
  const version = await ScheduleVersion.findOne({ _id: versionId, dataset: dataset._id });
  if (!version) throw new ApiError(404, 'SCHEDULE_VERSION_NOT_FOUND', 'Schedule version was not found in the active dataset.');
  if (version.kind !== 'generation') throw new ApiError(409, 'VERSION_APPROVAL_UNSUPPORTED', 'This schedule version must be applied through its originating workflow.');
  if (version.status !== 'proposed') throw new ApiError(409, 'SCHEDULE_VERSION_NOT_PROPOSED', 'Only proposed generated schedules can be approved.');

  const current = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' });
  if ((current && String(current._id) !== String(version.baseVersion)) || (!current && version.baseVersion)) {
    throw new ApiError(409, 'SCHEDULE_VERSION_STALE', 'The active timetable changed after this schedule was generated. Generate a fresh proposal before approving.');
  }
  const [rooms, faculty, studentGroups, sessions, roomUnavailability, assignments] = await Promise.all([
    Room.find({ dataset: dataset._id }).lean(),
    Faculty.find({ dataset: dataset._id }).lean(),
    StudentGroup.find({ dataset: dataset._id }).lean(),
    Session.find({ dataset: dataset._id }).lean(),
    RoomUnavailability.find({ dataset: dataset._id }).lean(),
    ScheduledSession.find({ scheduleVersion: version._id }).lean(),
  ]);
  const validation = validateSchedule({ dataset, rooms, faculty, studentGroups, sessions, roomUnavailability, assignments });
  if (!validation.valid) throw new ApiError(409, 'SCHEDULE_CONFLICT', 'Generated proposal no longer satisfies all hard constraints.', { violations: validation.hardViolations });

  let baseSuperseded = false;
  try {
    if (current) {
      const update = await ScheduleVersion.updateOne({ _id: current._id, status: 'active' }, { $set: { status: 'superseded' } });
      if (update.modifiedCount !== 1) throw new ApiError(409, 'SCHEDULE_VERSION_STALE', 'The active timetable changed while this proposal was being approved.');
      baseSuperseded = true;
    }
    const activation = await ScheduleVersion.updateOne({ _id: version._id, status: 'proposed' }, {
      $set: {
        status: 'active',
        approvedBy,
        approvedAt: new Date(),
        'summary.hardViolations': validation.hardViolationCount,
        'summary.softPenalty': validation.softPenalty,
      },
    });
    if (activation.modifiedCount !== 1) throw new ApiError(409, 'SCHEDULE_VERSION_NOT_PROPOSED', 'This generated proposal has already been decided.');
    return ScheduleVersion.findById(version._id);
  } catch (error) {
    if (baseSuperseded) await ScheduleVersion.updateOne({ _id: current._id, status: 'superseded' }, { $set: { status: 'active' } });
    throw error;
  }
}

export async function rejectGeneratedVersion(versionId, rejectedBy, reason) {
  const dataset = await activeDataset();
  const version = await ScheduleVersion.findOne({ _id: versionId, dataset: dataset._id });
  if (!version) throw new ApiError(404, 'SCHEDULE_VERSION_NOT_FOUND', 'Schedule version was not found in the active dataset.');
  if (version.kind !== 'generation') throw new ApiError(409, 'VERSION_REJECTION_UNSUPPORTED', 'This schedule version must be rejected through its originating workflow.');
  if (version.status !== 'proposed') throw new ApiError(409, 'SCHEDULE_VERSION_NOT_PROPOSED', 'Only proposed generated schedules can be rejected.');
  const rejection = await ScheduleVersion.findOneAndUpdate({ _id: version._id, status: 'proposed' }, {
    $set: { status: 'rejected', rejectedBy, rejectedAt: new Date(), decisionReason: reason },
  }, { new: true });
  if (!rejection) throw new ApiError(409, 'SCHEDULE_VERSION_NOT_PROPOSED', 'This generated proposal has already been decided.');
  return rejection;
}
