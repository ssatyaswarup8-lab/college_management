import { z } from 'zod';

const id = z.string().trim().min(1);
const stringList = z.array(id);
const periodList = z.array(z.number().int().min(1).max(13));
const day = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
// Window end is an inclusive period boundary; 14 represents midnight after P13.
const windowSchema = z.object({ day, from_period: z.number().int().min(1).max(13), to_period: z.number().int().min(1).max(14) }).passthrough();

const datasetSchema = z.object({
  dataset_id: id,
  institute: z.string().min(1),
  calendar: z.object({
    days: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI'])).min(1),
    periods: z.array(z.object({ id: z.number().int(), start: z.string(), end: z.string(), teaching: z.boolean() }).passthrough()).min(1),
    lunch: z.object({ after_period: z.number().int().min(1).max(12) }).passthrough(),
    lab_start_periods: z.array(z.number().int().min(1).max(9)),
    event_only_periods: z.array(z.number().int().min(10).max(13)),
    exam_week: z.object({
      days: z.array(day).min(1),
      sessions: z.array(z.object({ id, start: z.string(), end: z.string() }).passthrough()).min(1),
    }).passthrough(),
  }).passthrough(),
  priority_order: z.array(id).min(2),
  role_category_cap: z.record(z.string()),
  rooms: z.array(z.object({ id, name: z.string(), building: z.string(), type: id, capacity: z.number().int().positive(), features: stringList, accessible: z.boolean(), allowed_uses: stringList }).passthrough()).min(1),
  faculty: z.array(z.object({ id, name: z.string(), department: z.string(), max_hours_per_day: z.number().positive(), needs_accessible: z.boolean().optional(), unavailable: z.array(z.object({ day, periods: periodList }).passthrough()).default([]), preferences: z.array(z.record(z.unknown())).default([]) }).passthrough()).min(1),
  student_groups: z.array(z.object({ id, name: z.string(), year: z.number().int().positive(), department: z.string(), size: z.number().int().positive(), needs_accessible: z.boolean().optional() }).passthrough()).min(1),
  courses: z.array(z.object({ id, title: z.string(), department: z.string(), year: z.number().int().positive() }).passthrough()).min(1),
  sessions: z.array(z.object({ id, course_id: id, kind: z.enum(['lecture', 'tutorial', 'lab']), groups: stringList.min(1), faculty_id: id, size: z.number().int().positive(), duration: z.number().int().positive(), room_types: stringList.min(1), needs_accessible: z.boolean().optional(), basket_slot: id.nullable().optional(), fixed_slot: z.object({ day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI']), start_period: z.number().int().min(1).max(9) }).passthrough().nullable().optional() }).passthrough()).min(1),
  booking_requests: z.array(z.object({ id, submitted_at: z.string(), requester: z.string(), role: id, requested_category: id, title: z.string(), attendance: z.number().positive(), duration_periods: z.number().int().positive(), windows: z.array(windowSchema).min(1), room_types: stringList.min(1), needs: stringList, mandatory_for_groups: stringList }).passthrough()).default([]),
  cancellations: z.array(z.object({ request_id: id }).passthrough()).default([]),
  exams: z.array(z.object({ id, course_ids: stringList.min(1), groups: stringList.min(1), size: z.number().int().positive(), duration_hours: z.number().positive() }).passthrough()).default([]),
  room_unavailability: z.array(z.object({ room_id: id, day, periods: periodList }).passthrough()).default([]),
}).passthrough();

function duplicates(items, key = (item) => item.id) {
  const seen = new Set();
  const repeated = [];
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) repeated.push(value);
    seen.add(value);
  }
  return repeated;
}

export function validateDataset(input) {
  const parsed = datasetSchema.safeParse(input);
  if (!parsed.success) {
    return { valid: false, errors: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) };
  }

  const data = parsed.data;
  const errors = [];
  const checkUnique = (name, rows) => duplicates(rows).forEach((value) => errors.push({ path: name, message: `Duplicate id: ${value}` }));
  checkUnique('rooms', data.rooms);
  checkUnique('faculty', data.faculty);
  checkUnique('student_groups', data.student_groups);
  checkUnique('courses', data.courses);
  checkUnique('sessions', data.sessions);
  checkUnique('booking_requests', data.booking_requests);
  checkUnique('exams', data.exams);

  const roomIds = new Set(data.rooms.map((row) => row.id));
  const facultyIds = new Set(data.faculty.map((row) => row.id));
  const groupIds = new Set(data.student_groups.map((row) => row.id));
  const courseIds = new Set(data.courses.map((row) => row.id));
  const requestIds = new Set(data.booking_requests.map((row) => row.id));
  const ref = (path, target, idValue, set) => { if (!set.has(idValue)) errors.push({ path, message: `Unknown ${target} id: ${idValue}` }); };

  data.sessions.forEach((session, index) => {
    ref(`sessions.${index}.course_id`, 'course', session.course_id, courseIds);
    ref(`sessions.${index}.faculty_id`, 'faculty', session.faculty_id, facultyIds);
    session.groups.forEach((groupId) => ref(`sessions.${index}.groups`, 'student group', groupId, groupIds));
    if (session.kind === 'lab' && session.duration !== 3) errors.push({ path: `sessions.${index}.duration`, message: 'Lab sessions must have a duration of three periods.' });
  });
  data.exams.forEach((exam, index) => {
    exam.course_ids.forEach((courseId) => ref(`exams.${index}.course_ids`, 'course', courseId, courseIds));
    exam.groups.forEach((groupId) => ref(`exams.${index}.groups`, 'student group', groupId, groupIds));
  });
  data.booking_requests.forEach((request, index) => request.mandatory_for_groups.forEach((groupId) => ref(`booking_requests.${index}.mandatory_for_groups`, 'student group', groupId, groupIds)));
  data.cancellations.forEach((cancellation, index) => ref(`cancellations.${index}.request_id`, 'booking request', cancellation.request_id, requestIds));
  data.room_unavailability.forEach((closure, index) => ref(`room_unavailability.${index}.room_id`, 'room', closure.room_id, roomIds));

  const requiredPriorities = ['exam', 'regular_session', 'institute_event', 'guest_lecture', 'department_event', 'club_event'];
  requiredPriorities.forEach((priority) => {
    if (!data.priority_order.includes(priority)) errors.push({ path: 'priority_order', message: `Missing priority category: ${priority}` });
  });
  if (new Set(data.priority_order).size !== data.priority_order.length) errors.push({ path: 'priority_order', message: 'Priority categories must be unique.' });

  return {
    valid: errors.length === 0,
    errors,
    counts: {
      rooms: data.rooms.length,
      faculty: data.faculty.length,
      studentGroups: data.student_groups.length,
      courses: data.courses.length,
      sessions: data.sessions.length,
      bookingRequests: data.booking_requests.length,
      exams: data.exams.length,
    },
  };
}
