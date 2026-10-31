import { Dataset } from '../../models/Dataset.js';
import { Exam } from '../../models/Exam.js';
import { Room } from '../../models/Room.js';
import { RoomUnavailability } from '../../models/RoomUnavailability.js';
import { ScheduleVersion } from '../../models/ScheduleVersion.js';
import { ApiError } from '../../utils/apiError.js';
import { scheduleExams } from './exam.scheduler.js';

export async function generateExams({ requestedBy, options = {} }) {
  const dataset = await Dataset.findOne({ status: 'active' });
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'Import and activate a dataset before generating exams.');
  const scheduleVersion = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' });
  if (!scheduleVersion) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'Generate and activate the teaching timetable before generating exams.');

  const [exams, rooms, roomUnavailability] = await Promise.all([
    Exam.find({ dataset: dataset._id }).lean(),
    Room.find({ dataset: dataset._id }).lean(),
    RoomUnavailability.find({ dataset: dataset._id }).lean(),
  ]);
  const result = await scheduleExams({
    exams,
    rooms,
    calendar: dataset.calendar,
    roomUnavailability,
    maxNodes: options.maxNodes,
    maxTimeMs: options.maxTimeMs,
  });

  const updates = result.assignments.map((assignment) => ({
    updateOne: {
      filter: { dataset: dataset._id, sourceId: assignment.examId },
      update: { $set: { scheduledDay: assignment.day, examSession: assignment.session, rooms: assignment.rooms, scheduleVersion: scheduleVersion._id } },
    },
  }));
  if (updates.length) await Exam.bulkWrite(updates, { ordered: true });
  return {
    datasetId: dataset.datasetId,
    scheduleVersionId: String(scheduleVersion._id),
    requestedBy,
    examsScheduled: result.assignments.length,
    softPenalty: result.softPenalty,
    searchNodes: result.nodes,
    exams: result.assignments,
  };
}

export async function listExams({ groupId } = {}) {
  const dataset = await Dataset.findOne({ status: 'active' }).select('_id');
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const query = { dataset: dataset._id };
  if (groupId) query.groups = groupId;
  return Exam.find(query).sort({ scheduledDay: 1, examSession: 1, sourceId: 1 }).lean();
}

export async function getExam(examId) {
  const dataset = await Dataset.findOne({ status: 'active' }).select('_id');
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const exam = await Exam.findOne({ dataset: dataset._id, sourceId: examId }).lean();
  if (!exam) throw new ApiError(404, 'EXAM_NOT_FOUND', 'Exam was not found.');
  return exam;
}
