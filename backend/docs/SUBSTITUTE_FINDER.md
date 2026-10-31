# Substitute Faculty Finder

`POST /api/faculty/substitutes/find` evaluates faculty who could take a scheduled session. Admins can search any session. Faculty can search sessions assigned to their faculty record, and department coordinators can search sessions in their department.

Each candidate includes:

- `eligibilityChecks.qualification`: whether an Admin-verified active qualification exists for the course.
- `eligibilityChecks.schedule`: hard-constraint violations at the session's current time and room.
- `eligibilityChecks.dailyWorkload`: current hours, hours after assignment, daily limit, and remaining hours.
- `rankReasons`: course-department match, resulting daily load, eligibility, and the fact that the class remains in its existing slot.
- `timetableImpact`: affected groups and slot, with zero other sessions moved.

Candidates are ranked eligible first, then by same-department preference, lower current daily load, and faculty ID. `recommended` provides the top eligible faculty ID for existing clients; `recommendedCandidate` gives the full explanation. If no candidate is eligible, both recommendation fields are null and the response explains why.

Finding a candidate does not change the schedule. An Admin must review the result and explicitly call `/api/admin/faculty/substitutes/apply`. The apply endpoint rechecks the active qualification, schedule conflicts, and version before committing the substitution.
