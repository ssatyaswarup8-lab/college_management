# Current API Contract

Base URL: `http://localhost:5000/api`. Successful responses use `{ "success": true, "message": "...", "data": {} }`. Errors use `{ "success": false, "message": "...", "error": { "code": "...", "details": {} } }`.

## Health

| Method | URL | Auth | Success |
|---|---|---|---|
| GET | `/health` | None | `200`, `data.status = "ok"` |
| GET | `/health/ready` | None | `200` when MongoDB is connected, `503` when unavailable; includes active dataset and schedule flags |

## Notifications and audit

| Method | URL | Auth | Success |
|---|---|---|---|
| GET | `/notifications?unreadOnly=true&limit=50` | Any active user | `200`, notifications belonging to the current user and their unread count |
| PATCH | `/notifications/:notificationId/read` | Any active user | `200`, marks only the caller's notification as read |
| PATCH | `/notifications/read-all` | Any active user | `200`, marks the caller's unread notifications as read |
| GET | `/admin/audit?limit=50` | Admin | `200`, most recent successful authenticated API mutations, with actor details |
| GET | `/admin/audit/:auditId` | Admin | `200`, one audit entry |

Booking approval, rejection, and alternative decisions create a notification for the request owner when the booking is linked to an account. The audit middleware records successful authenticated API mutations without storing request bodies or credentials.

## Authentication

| Method | URL | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/auth/login` | None | `{ "email": "...", "password": "..." }` | `200`, `data.accessToken`, `data.user`; refresh token is an HTTP-only cookie |
| POST | `/auth/refresh` | Refresh cookie | None | `200`, new `data.accessToken` and `data.user`; rotates refresh cookie |
| POST | `/auth/logout` | Bearer access token | None | `200`; revokes refresh token and clears cookie |
| GET | `/auth/me` | Bearer access token | None | `200`, `data.user` |

Invalid credentials or invalid/expired tokens return `401`. Access tokens expire after 15 minutes; refresh tokens expire after 7 days.

## Users

| Method | URL | Auth | Body | Success |
|---|---|---|---|---|
| GET | `/admin/users?role=...&department=...&isActive=true` | Admin | Optional filters | `200`, safe user account summaries |
| POST | `/admin/users` | Admin | `{ name, email, password, role, department?, facultyId?, studentGroupIds? }` | `201`, `data.user` |
| PATCH | `/admin/users/:userId/status` | Admin | `{ isActive: boolean }` | `200`, activates/deactivates the account; deactivation revokes its refresh token |
| PATCH | `/admin/users/:userId/profile` | Admin | Any of `{ name?, department?, facultyId?, studentGroupIds? }` | `200`, updates the profile; role-specific links are checked against the active dataset |

Password must be at least 12 characters. `role` must be one of `ADMIN`, `DEPARTMENT_COORDINATOR`, `FACULTY`, `CLUB_REPRESENTATIVE`, or `STUDENT`. Coordinator accounts require a department present in the active dataset; Faculty accounts require a valid `facultyId`; Student accounts require one or more valid `studentGroupIds`. Public signup is not provided.
Admins cannot deactivate their own account or the last active Admin account.

## Dataset administration

All endpoints require an Admin bearer token.

| Method | URL | Content | Success |
|---|---|---|---|
| GET | `/admin/datasets` | None | `200`, `data.datasets` |
| POST | `/admin/datasets/preview` | `multipart/form-data`, JSON file in `file` | `200`, validation preview |
| POST | `/admin/datasets/import` | `multipart/form-data`, JSON file in `file` | `201`, imported preview-version record |
| POST | `/admin/datasets/csv/preview` | CSV files named `rooms.csv`, `faculty.csv`, `student_groups.csv`, `courses.csv`, `sessions.csv`, `booking_requests.csv`, `exams.csv`; optional `cancellations.csv` and `room_unavailability.csv`; include `metadata` JSON form field | `200`, validation preview |
| POST | `/admin/datasets/csv/import` | Same CSV multipart format | `201`, imported preview-version record |
| GET | `/admin/datasets/:datasetVersionId/activation-impact` | None | `200`, active Faculty, Student, and Coordinator accounts whose profile links are missing from the selected dataset |
| POST | `/admin/datasets/:datasetVersionId/activate` | None | `200`, activated version |

The CSV `metadata` field must contain `dataset_id`, `institute`, `calendar`, `priority_order`, and `role_category_cap`, because those fields are not present in the starter CSV files.
Dataset activation does not automatically modify accounts. Review activation impact first; after activation, repair account links with `PATCH /admin/users/:userId/profile`.

## Timetable generation

| Method | URL | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/admin/schedule/generate` | Admin | `{}` or optional `{ maxNodes?, maxTimeMs?, restarts?, yieldEvery? }` | `200`, generation and schedule-version identifiers, session count, validation result, and search statistics |

The solver uses the active dataset. The first valid generated schedule becomes active; later generated schedules are saved as proposals. If no solution is found within the search limits, the API returns `409 NO_VALID_SOLUTION` and does not publish a schedule.

## Schedule version review

All endpoints require an Admin bearer token. `GET /admin/schedule/versions` supports optional `status` and `kind` filters. `GET /admin/schedule/versions/:versionId` returns version metadata and assignments. Generated proposals can be approved with `POST /admin/schedule/versions/:versionId/approve` or rejected with `POST /admin/schedule/versions/:versionId/reject` and `{ "reason": "..." }`. Approval revalidates the complete schedule and requires that the proposal's base version is still active; rejection records the Admin and reason. Manual, disruption, and scenario proposals use their own apply workflows.

## Schedule analytics

| Method | URL | Auth | Success |
|---|---|---|---|
| GET | `/admin/schedule/analytics` | Admin | `200`, active schedule version, student-group gap periods by day, and faculty daily teaching loads against each faculty member's daily limit |

Student gaps count unoccupied teaching periods between a group's first and last scheduled period on a day. Faculty loads use the effective assigned faculty member, including approved substitute assignments.

## Personal schedules

Student accounts can use `GET /student/me/schedule` for their linked groups, `GET /student/me/exams` for group exams, `GET /student/me/events` for approved events, and `GET /student/me/next-class` for the next or in-progress class. `GET /student/me/today` returns a period-ordered agenda for today; `/student/me/agenda?date=YYYY-MM-DD` returns it for a requested calendar date. Both combine the student's classes and relevant approved events and include `teachingDay`. The agenda uses the active dataset calendar timezone (`Asia/Kolkata` when omitted). Faculty accounts can use `GET /faculty/me/schedule` or `/faculty/me/classes` for sessions assigned to their linked faculty record.

## What-if scenario planning

All scenario endpoints require an Admin bearer token. Start with `POST /scenarios/preview` and `{ "changes": [...] }` to see which current sessions directly violate temporary room or faculty availability. The preview is read-only: it does not create a scenario or schedule version. Then use `POST /scenarios` with `name`, optional `description`, and the same `changes`; call `POST /scenarios/:scenarioId/simulate` to generate a proposed repair, and `GET /scenarios/:scenarioId/compare` to inspect the before-and-after assignments and impact summary. `POST /scenarios/:scenarioId/apply` activates a simulated proposal only after revalidation and only if its base schedule is still active.

Scenario changes accept `room_unavailable` (`roomId`, `days`, `periods`) and `faculty_unavailable` (`facultyId`, `days`, `periods`). Each directly impacted session includes its current placement and hard-constraint violation codes and explanations. Simulating a scenario may also move indirectly affected sessions to preserve a valid timetable; the compare response reports those moves.

The current timetable endpoint is `GET /admin/schedule/current`. Admins can view the active dataset schedule; department coordinators receive only sessions whose course belongs to their account department. Schedule export preview and file export are Admin-only.

`GET /admin/schedule/export/preview` returns the official export JSON. `POST /admin/schedule/export` writes `exports/schedule.json`; for a non-generation active schedule version it also writes `exports/schedule_after.json`. The top-level `team` value uses `TEAM_NAME`, defaulting to `CIT`.

Manual change impact analysis (`POST /admin/schedule/session/impact`) is available to Admins and department coordinators. Coordinator requests are limited to sessions whose course belongs to their account department. The response names the impacted sessions, faculty, groups, and rooms; includes room-related violations; reports faculty hours by both the original and proposed day; and returns per-group/day gap-period changes. `studentGapChange` remains the overall S2 soft-penalty delta; `studentGapPeriodChange` is the literal change in occupied-schedule gaps for the moved session's groups. Creating or applying schedule proposals remains Admin-only.

## Room search and utilization

All room endpoints require authentication. Room utilization dashboard access is Admin-only.

| Method | URL | Auth | Query/body | Success |
|---|---|---|---|---|
| GET | `/rooms/utilization?thresholdPercent=30` | Admin | Optional threshold from `0` to `100` | `200`, room utilization summary, underutilized rooms, and per-period utilization |
| GET | `/rooms/:roomId/utilization` | Authenticated user | None | `200`, weekly utilization and per-period utilization for one room |
| GET | `/rooms/available?day=WED&startPeriod=6&duration=1` | Authenticated user | Day, slot, and optional filters including `originRoomId` or `originBuilding` | `200`, ranked room candidates; unavailable rooms are excluded by default |
| POST | `/rooms/find` | Authenticated user | `{ day, startPeriod, duration, attendance?, roomTypes?, needs?, needsAccessible?, use?, availableOnly?, originRoomId?, originBuilding? }` | `200`, ranked room candidates with utilization and ranking reasons; unavailable rooms are excluded by default |

Supply either `originRoomId` or `originBuilding` to prefer candidates in the same building. The response includes `locationPreference` and a reason for the ranking. The starter dataset has no coordinates or inter-building distances, so candidates in other buildings are not ranked by exact physical distance. The two origin fields are mutually exclusive.

Utilization is measured as occupied room-periods divided by eligible weekly room-periods. Academic sessions and approved bookings count as occupied. Underutilization is a configurable threshold, defaulting to 30%; per-period figures identify low-use periods for follow-up.

## Booking alternative responses

When an Admin offers an alternative venue, the requester can accept it with `POST /bookings/:id/alternative/accept` or decline it with `POST /bookings/:id/alternative/decline` and `{ "reason": "..." }`. Only the requester or an Admin can respond. Acceptance rechecks room and attendee availability; an accepted request becomes approved. Declining changes it to rejected. Previous offers and decisions are retained in `decisionHistory`. An offered alternative remains unresolved for schedule export until accepted, declined, or cancelled.

## Booking decision impact

Admins and authorized department coordinators can call `POST /bookings/:id/impact` with `{ "action": "approve" | "alternative", "day", "startPeriod", "roomId" }` to preview a proposed placement. It returns the room, deterministic blocking violations, conflicting sessions and approved bookings, affected faculty and mandatory groups, and any higher-priority pending requests. `available` is true only when the placement passes validation and does not need a priority override. An alternative preview may be outside the requester's windows; it does not require the offer reason because it saves no decision. This endpoint is read-only; use the existing approval or alternative endpoint to make a decision. The decision endpoint repeats all checks before saving.

## Booking priority queue

`GET /bookings/priority-queue?limit=50` is available to Admins and department coordinators. It returns pending requests ordered by the active dataset's `priority_order`, with earlier submissions first within the same rank. Each item includes requested and effective categories, rank, and whether the requester role's category cap changed the effective priority. Coordinator results are restricted to their department. Booking decisions snapshot effective category and rank in the decision record.

When an approval or alternative would use another pending request's explicitly requested room or overlap its mandatory attendee groups in an allowed window, the API returns `409 PRIORITY_REVIEW_REQUIRED` if that request has a higher effective priority. An Admin can retry with `priorityOverrideReason` (maximum 500 characters); the reason and affected request IDs are stored on the decision. Department coordinators cannot override this priority check. Accepting an offered alternative rechecks current priority; if a higher-priority request was submitted after the offer, only an Admin can accept with a recorded override reason.

## Faculty substitutes

| Method | URL | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/admin/faculty/qualifications` | Admin | `{ facultyId, courseId, qualificationNote? }` | `201`, records or re-verifies a faculty-course qualification |
| GET | `/admin/faculty/qualifications?courseId=...&facultyId=...` | Admin | Optional filters | `200`, active verified qualifications |
| DELETE | `/admin/faculty/qualifications/:id` | Admin | None | `200`, revokes a verified faculty-course qualification; a revoked qualification can be re-verified with the existing POST endpoint |
| POST | `/faculty/substitutes/find` | Admin, department coordinator, or faculty | `{ sessionId }` | `200`, ranked candidates with qualification, schedule-conflict, daily-load checks, and recommendation rationale |
| POST | `/admin/faculty/substitutes/apply` | Admin | `{ sessionId, facultyId, reason? }` | `200`, applies a qualified, conflict-free substitute in a new active schedule version |
| POST | `/admin/faculty/substitutes/restore` | Admin | `{ sessionId, reason? }` | `200`, restores the original faculty in a new active schedule version if still available |

Applying or restoring a substitute checks qualification where applicable and validates faculty availability, overlap, and daily teaching-hour limits before changing the active timetable.

The finder ranks eligible faculty before ineligible faculty, then by course-department match, lower existing teaching load that day, and faculty ID. Each candidate includes structured eligibility checks, daily load before/after, ranking reasons, and the unchanged session placement impact. `recommended` remains the recommended faculty ID; `recommendedCandidate` provides its details. The finder never applies a candidate automatically.

## Conflict assistance

Conflict listing, analysis, and solution generation are available to Admins and department coordinators. Coordinator results and requested sessions are limited to courses in the coordinator's own department. `POST /conflicts/:id/solutions` accepts optional `{ maxSolutions?, maxNearMisses? }` and returns valid solutions separately from ranked near misses with hard-violation codes and explanations. Near misses cannot be applied. Applying a selected valid solution is Admin-only and creates a schedule proposal.

Generated valid solutions include affected faculty, groups, and rooms; the change in student-gap penalty; daily faculty load; and timetable soft-penalty differences. Near misses are diagnostic suggestions only. Solutions are generated only against the active version. If the schedule has changed since a conflict was recorded, the API returns `409 CONFLICT_STALE` and requires a fresh analysis.

## Common status codes

- `400` malformed request or missing upload
- `401` unauthenticated
- `403` role not permitted
- `404` route or resource not found
- `409` business conflict, missing active dataset, or no valid solution found
- `413` uploaded file exceeds 20 MB
- `422` request or dataset validation failed
- `500` unexpected server failure
