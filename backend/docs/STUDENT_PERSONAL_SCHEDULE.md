# Student Personal Schedule API

These endpoints are available to authenticated `STUDENT` accounts. A student's timetable comes from the `studentGroupIds` linked to the account by an Admin; the client cannot pass another student's group IDs to retrieve their classes.

## Weekly schedule

`GET /api/student/me/schedule` returns classes for every linked group, with course title, instructor, room, day, period range, and clock times. If a student belongs to multiple groups, the result includes classes for each group and may include separate sessions at the same time only when the underlying timetable contains them.

## Daily agenda

`GET /api/student/me/today` returns today's classes plus approved events. `GET /api/student/me/agenda?date=YYYY-MM-DD` selects another calendar date. Both use the active dataset's timezone, falling back to `Asia/Kolkata`. The response includes `teachingDay`, the linked groups, active schedule version, and a merged agenda ordered by start period. Events with no mandatory groups are treated as campus-wide events; otherwise they appear only for students in a listed group.

The agenda is a view of the active timetable and approved booking requests. It does not modify either source. A day outside the dataset's teaching days returns an empty agenda and `teachingDay: false`.

## Next class, exams, and events

- `GET /api/student/me/next-class` returns the nearest class from the weekly timetable, including the current class with `status: "in_progress"`.
- `GET /api/student/me/exams` returns exams associated with at least one linked group.
- `GET /api/student/me/events` returns approved events relevant to the linked groups.

## Example

Use the authenticated Student token in [student_agenda.http](../examples/requests/student_agenda.http). Example IDs in timetable rows use the bundled starter dataset; exact assignments depend on the active generated schedule.
