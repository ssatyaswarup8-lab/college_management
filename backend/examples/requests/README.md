# API Request Examples

These JSON files use IDs and values from the bundled `data/cit_public.json` starter dataset. If your active dataset is different, replace IDs and adjust room types and feature names to match it. Use the Admin or requester token required by the route. Some booking and timetable proposals may need a different slot or room if your generated schedule already occupies the example slot. They are request examples, not automated tests.

| File | Endpoint |
|---|---|
| `booking_create.json` | `POST /api/bookings` |
| `booking_approve.json` | `POST /api/bookings/:id/approve` |
| `booking_impact.json` | `POST /api/bookings/:id/impact` (read-only decision preview) |
| `booking_alternative_offer.json` | `POST /api/bookings/:id/alternative` |
| `booking_alternative_accept.json` | `POST /api/bookings/:id/alternative/accept` (empty body is also valid) |
| `booking_alternative_decline.json` | `POST /api/bookings/:id/alternative/decline` |
| `manual_change_impact.json` | `POST /api/admin/schedule/session/impact` |
| `manual_change_impact_cross_day.json` | `POST /api/admin/schedule/session/impact` (cross-day faculty load preview) |
| `scenario_create.json` | `POST /api/scenarios` |
| `scenario_preview.json` | `POST /api/scenarios/preview` (read-only impact preview) |
| `disruption_analyze.json` | `POST /api/admin/disruptions/analyze` |
| `conflict_analyze.json` | `POST /api/conflicts/analyze` |
| `conflict_solutions.json` | `POST /api/conflicts/:id/solutions` |
| `substitute_apply.json` | `POST /api/admin/faculty/substitutes/apply` |
| `substitute_find.json` | `POST /api/faculty/substitutes/find` |
| `substitute_qualification.json` | `POST /api/admin/faculty/qualifications` |
| `substitute_restore.json` | `POST /api/admin/faculty/substitutes/restore` |
| `room_find_origin.json` | `POST /api/rooms/find` with an origin-room building preference |

The Student personal agenda GET examples are in `student_agenda.http`. Response shapes are in `../responses/student_agenda.json`, `../responses/student_schedule.json`, `../responses/student_next_class.json`, and `../responses/faculty_schedule.json`. Schedule version IDs and course titles are dynamic, and timetable assignments can differ after regeneration.

If the API returns `PRIORITY_REVIEW_REQUIRED`, an Admin may add `"priorityOverrideReason": "Reviewed the higher-priority request; proceeding because ..."` to the approval or alternative-offer body. Do not send that field when no higher-priority request conflicts. Alternative acceptance rechecks priority; if a new conflict arose after the offer, only an Admin can accept with an override reason. The requester must own a booking to accept, decline, or cancel it. The substitute example uses session `MA101-AB-L1` and faculty `F20`; an Admin must record an active qualification for faculty `F20` and course `MA101` before applying it.

The scenario preview request uses the bundled dataset room `LH-1`; affected session rows depend on the active generated timetable. See `scenario_preview.http` and `../responses/scenario_preview.json` for the request and response shape.

The room-finder example uses the real starter-dataset room ID `LH-1`. Candidate availability depends on the active schedule. Location preference matches the origin building; exact distance is unavailable until room location data is added.

For the substitute workflow, first record the Admin-verified qualification in `substitute_qualification.json`, call the finder example, review its current response, and then submit `substitute_apply.json` only if F20 is eligible. `substitute_restore.json` demonstrates the restore request after a substitute assignment exists. Finder results depend on the active timetable and qualification records; see `../responses/substitute_find.json` for an illustrative response.

The booking impact example targets bundled request `BR-01` and venue `AUD`. Its preview result depends on the currently active timetable and approved bookings; inspect the actual response before approving. A response-shape example is in `../responses/booking_impact.json`.

Manual timetable impact examples use bundled session `MA101-AB-L1` and rooms `LH-1`/`LH-2`. The cross-day example is intended to show the response shape for both affected faculty days. Preview outcomes depend on the active timetable; see `../responses/manual_change_impact.json` for an illustrative response.

`conflict_analyze.json` demonstrates a capacity conflict using bundled session `MA101-AB-L1` and room `CR-101`. Use the conflict ID returned by analysis with `conflict_solutions.json`; inspect valid fixes separately from near misses, which contain violations and cannot be applied. See `conflict_resolution.http` and `../responses/conflict_solutions.json`.
