import { Dataset } from '../../models/Dataset.js';
import { Faculty } from '../../models/Faculty.js';
import { ScheduleVersion } from '../../models/ScheduleVersion.js';
import { ScheduledSession } from '../../models/ScheduledSession.js';
import { Session } from '../../models/Session.js';
import { StudentGroup } from '../../models/StudentGroup.js';
import { ApiError } from '../../utils/apiError.js';
import { calculateStudentGroupGaps } from './student-gap.metrics.js';

export async function getScheduleAnalytics() {
  const dataset = await Dataset.findOne({ status: 'active' }).lean();
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const version = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' }).lean();
  if (!version) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'No active timetable exists.');
  const [assignments, sessions, faculty, groups] = await Promise.all([
    ScheduledSession.find({ scheduleVersion: version._id }).lean(),
    Session.find({ dataset: dataset._id }).lean(),
    Faculty.find({ dataset: dataset._id }).lean(),
    StudentGroup.find({ dataset: dataset._id }).lean(),
  ]);
  const sessionMap = new Map(sessions.map((row) => [row.sourceId, row]));
  const facultyMap = new Map(faculty.map((row) => [row.sourceId, row]));
  const facultyDays = new Map();

  for (const assignment of assignments) {
    const session = sessionMap.get(assignment.sessionId);
    if (!session) continue;
    const facultyId = assignment.facultyOverrideId ?? session.facultyId;
    const facultyKey = `${facultyId}|${assignment.day}`;
    if (!facultyDays.has(facultyKey)) facultyDays.set(facultyKey, { facultyId, day: assignment.day, periods: 0, sessions: 0 });
    const load = facultyDays.get(facultyKey);
    load.periods += session.duration;
    load.sessions += 1;
  }

  const studentGaps = calculateStudentGroupGaps({ assignments, sessions, groups });

  const facultyLoads = [...facultyDays.values()].map((load) => {
    const member = facultyMap.get(load.facultyId);
    const dailyLimit = member?.maxHoursPerDay ?? 4;
    return { ...load, facultyName: member?.name ?? load.facultyId, department: member?.department ?? null, dailyLimit, overLimitBy: Math.max(0, load.periods - dailyLimit) };
  }).sort((a, b) => b.overLimitBy - a.overLimitBy || b.periods - a.periods || a.facultyId.localeCompare(b.facultyId));

  return {
    datasetId: dataset.datasetId,
    scheduleVersion: { id: String(version._id), versionNumber: version.versionNumber },
    summary: {
      sessionsScheduled: assignments.length,
      studentGroupDaysWithGaps: studentGaps.length,
      totalStudentGapPeriods: studentGaps.reduce((total, row) => total + row.gapCount, 0),
      facultyDaysOverDailyLimit: facultyLoads.filter((row) => row.overLimitBy > 0).length,
    },
    studentGaps,
    facultyDailyLoads: facultyLoads,
  };
}
