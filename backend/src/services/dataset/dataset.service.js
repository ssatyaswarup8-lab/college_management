import { createHash } from 'node:crypto';
import { BookingRequest } from '../../models/BookingRequest.js';
import { Course } from '../../models/Course.js';
import { Dataset } from '../../models/Dataset.js';
import { Exam } from '../../models/Exam.js';
import { Faculty } from '../../models/Faculty.js';
import { Room } from '../../models/Room.js';
import { RoomUnavailability } from '../../models/RoomUnavailability.js';
import { Session } from '../../models/Session.js';
import { StudentGroup } from '../../models/StudentGroup.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/apiError.js';
import { validateDataset } from './dataset.validator.js';

const entityModels = [Room, Faculty, StudentGroup, Course, Session, BookingRequest, Exam, RoomUnavailability];

function sourceHash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function countsOf(data) {
  return {
    rooms: data.rooms.length,
    faculty: data.faculty.length,
    studentGroups: data.student_groups.length,
    courses: data.courses.length,
    sessions: data.sessions.length,
    bookingRequests: data.booking_requests.length,
    exams: data.exams.length,
  };
}

export function previewDataset(data) {
  const validation = validateDataset(data);
  return {
    datasetId: data?.dataset_id ?? null,
    institute: data?.institute ?? null,
    valid: validation.valid,
    errors: validation.errors,
    counts: validation.counts ?? null,
    totalTeachingHours: Array.isArray(data?.sessions) ? data.sessions.reduce((sum, session) => sum + (Number(session.duration) || 0), 0) : null,
  };
}

export async function importDataset(data, { sourceFileName = null, importedBy = null } = {}) {
  const preview = previewDataset(data);
  if (!preview.valid) {
    throw new ApiError(422, 'DATASET_INVALID', 'Dataset validation failed.', { errors: preview.errors });
  }

  const hash = sourceHash(data);
  const duplicate = await Dataset.findOne({ datasetId: data.dataset_id, sourceHash: hash });
  if (duplicate) {
    throw new ApiError(409, 'DATASET_ALREADY_IMPORTED', 'This dataset content has already been imported.', { datasetVersionId: String(duplicate._id) });
  }

  const latest = await Dataset.findOne({ datasetId: data.dataset_id }).sort({ revision: -1 }).select('revision');
  const cancellations = new Set((data.cancellations ?? []).map((item) => item.request_id));
  const dataset = await Dataset.create({
    datasetId: data.dataset_id,
    revision: (latest?.revision ?? 0) + 1,
    status: 'preview',
    institute: data.institute,
    calendar: data.calendar,
    priorityOrder: data.priority_order,
    roleCategoryCap: data.role_category_cap,
    sourceFileName,
    sourceHash: hash,
    counts: countsOf(data),
    importedBy,
  });
  const datasetRef = dataset._id;

  try {
    const insert = async (Model, rows) => {
      if (rows.length) await Model.insertMany(rows, { ordered: true });
    };
    await insert(Room, data.rooms.map((row) => ({ dataset: datasetRef, sourceId: row.id, name: row.name, building: row.building, type: row.type, capacity: row.capacity, features: row.features, accessible: row.accessible, allowedUses: row.allowed_uses })));
    await insert(Faculty, data.faculty.map((row) => ({ dataset: datasetRef, sourceId: row.id, name: row.name, department: row.department, maxHoursPerDay: row.max_hours_per_day, needsAccessible: row.needs_accessible, unavailable: row.unavailable, preferences: row.preferences })));
    await insert(StudentGroup, data.student_groups.map((row) => ({ dataset: datasetRef, sourceId: row.id, name: row.name, year: row.year, department: row.department, size: row.size, needsAccessible: row.needs_accessible })));
    await insert(Course, data.courses.map((row) => ({ dataset: datasetRef, sourceId: row.id, title: row.title, department: row.department, year: row.year, lectureHours: row.lecture_hours, tutorialHours: row.tutorial_hours, labBlocks: row.lab_blocks })));
    await insert(Session, data.sessions.map((row) => ({ dataset: datasetRef, sourceId: row.id, courseId: row.course_id, kind: row.kind, groups: row.groups, facultyId: row.faculty_id, size: row.size, duration: row.duration, roomTypes: row.room_types, needsAccessible: row.needs_accessible, basketSlot: row.basket_slot, fixedSlot: row.fixed_slot })));
    await insert(BookingRequest, data.booking_requests.map((row) => ({ dataset: datasetRef, sourceId: row.id, submittedAt: row.submitted_at, requester: row.requester, requesterRole: row.role, department: row.department, requestedCategory: row.requested_category, title: row.title, attendance: row.attendance, durationPeriods: row.duration_periods, windows: row.windows.map((window) => ({ day: window.day, fromPeriod: window.from_period, toPeriod: window.to_period })), roomTypes: row.room_types, needs: row.needs, requestedRoom: row.requested_room, mandatoryForGroups: row.mandatory_for_groups, seriesId: row.series_id, rawText: row.raw_text, status: cancellations.has(row.id) ? 'cancelled' : 'pending' })));
    await insert(Exam, data.exams.map((row) => ({ dataset: datasetRef, sourceId: row.id, courseIds: row.course_ids, groups: row.groups, size: row.size, durationHours: row.duration_hours })));
    await insert(RoomUnavailability, data.room_unavailability.map((row) => ({ dataset: datasetRef, roomId: row.room_id, day: row.day, periods: row.periods, reason: row.reason, source: 'dataset' })));
    return dataset;
  } catch (error) {
    await Promise.all(entityModels.map((Model) => Model.deleteMany({ dataset: datasetRef })));
    await Dataset.deleteOne({ _id: datasetRef });
    throw error;
  }
}

export async function activateDataset(datasetVersionId, activatedBy) {
  const target = await Dataset.findById(datasetVersionId);
  if (!target) throw new ApiError(404, 'DATASET_NOT_FOUND', 'Dataset version was not found.');

  await Dataset.updateMany({ status: 'active', _id: { $ne: target._id } }, { $set: { status: 'archived' } });
  target.status = 'active';
  target.activatedBy = activatedBy;
  target.activatedAt = new Date();
  await target.save();
  return target;
}

export async function getDatasetActivationImpact(datasetVersionId) {
  const dataset = await Dataset.findById(datasetVersionId).lean();
  if (!dataset) throw new ApiError(404, 'DATASET_NOT_FOUND', 'Dataset version was not found.');
  if (dataset.status === 'archived') throw new ApiError(409, 'DATASET_ARCHIVED', 'An archived dataset cannot be used for an activation impact preview.');

  const [users, faculty, groups, courses] = await Promise.all([
    User.find({ isActive: true, role: { $in: ['FACULTY', 'STUDENT', 'DEPARTMENT_COORDINATOR'] } }).select('name email role department facultyId studentGroupIds').lean(),
    Faculty.find({ dataset: dataset._id }).select('sourceId').lean(),
    StudentGroup.find({ dataset: dataset._id }).select('sourceId').lean(),
    Course.find({ dataset: dataset._id }).select('department').lean(),
  ]);
  const facultyIds = new Set(faculty.map((row) => row.sourceId));
  const groupIds = new Set(groups.map((row) => row.sourceId));
  const departments = new Set(courses.map((row) => row.department));
  const invalidAccounts = users.map((user) => {
    const missingReferences = [];
    if (user.role === 'FACULTY' && !facultyIds.has(user.facultyId)) missingReferences.push({ field: 'facultyId', value: user.facultyId });
    if (user.role === 'STUDENT') {
      if (!user.studentGroupIds?.length) missingReferences.push({ field: 'studentGroupIds', value: null });
      else for (const groupId of user.studentGroupIds) if (!groupIds.has(groupId)) missingReferences.push({ field: 'studentGroupIds', value: groupId });
    }
    if (user.role === 'DEPARTMENT_COORDINATOR' && !departments.has(user.department)) missingReferences.push({ field: 'department', value: user.department });
    return missingReferences.length
      ? { userId: String(user._id), name: user.name, email: user.email, role: user.role, missingReferences }
      : null;
  }).filter(Boolean);
  return {
    datasetVersionId: String(dataset._id),
    datasetId: dataset.datasetId,
    revision: dataset.revision,
    activeLinkedAccountCount: users.length,
    accountsWithMissingLinks: invalidAccounts.length,
    invalidAccounts,
    note: 'Activation does not modify account profiles. Admins can repair account links after activation using PATCH /api/admin/users/:userId/profile.',
  };
}
