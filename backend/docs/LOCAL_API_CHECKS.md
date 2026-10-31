# Local API Checks

These are manual smoke checks for a local backend. They do not replace automated tests.

## Start the backend

1. In `backend/.env`, set `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD` if bootstrap needs to create the first Admin.
2. Set `GEMINI_API_KEY` only if you want to check the optional AI booking parser. `GEMINI_MODEL` is optional.
   `TEAM_NAME` is optional and defaults to `CIT` in timetable exports.
3. From the `backend` directory, run `npm install`, then `npm run bootstrap`, then `npm run dev`.
4. Confirm `GET http://localhost:5000/api/health` responds with status `200`.
5. Confirm `GET http://localhost:5000/api/health/ready` responds with status `200` and `checks.database = "connected"`.

Bootstrap creates the initial Admin if one does not exist and imports `data/cit_public.json` only if there is no active dataset. It does not overwrite an existing Admin or active dataset.

## Authentication and initial data

Send `POST /api/auth/login` with the initial Admin email and password. Use the returned access token as `Authorization: Bearer <access_token>` on protected requests. Public signup is intentionally unavailable; verify this by checking that no signup route is documented or mounted.

When creating test accounts, use Faculty IDs, departments, and student group IDs that exist in the active dataset. The backend validates those links before saving an account.

With the Admin token, check:

- `GET /api/admin/datasets` returns the active dataset after bootstrap.
- `GET /api/bookings/priority-queue` returns pending requests in dataset priority order for an Admin.
- Before deciding a booking, call `POST /api/bookings/BR-01/impact` with `examples/requests/booking_impact.json`; inspect violations, affected sessions/groups, and higher-priority pending requests. Confirm previewing leaves the booking pending, then use the normal approval endpoint only after review.
- Try approving a lower-priority request that overlaps a higher-priority pending request; confirm `409 PRIORITY_REVIEW_REQUIRED`, then retry as Admin with `priorityOverrideReason` to record the override.
- Offer a requester an alternative, then create a higher-priority request for the same room/window before accepting; confirm acceptance rechecks priority and requires an Admin override if needed.
- `GET /api/admin/datasets/:datasetVersionId/activation-impact` previews linked accounts that may need profile updates before/after a dataset change.
- `POST /api/admin/schedule/generate` creates a schedule if one is not yet active. Later generations are proposals and require the applicable approval flow.
- As Admin, submit `examples/requests/manual_change_impact.json` to `POST /api/admin/schedule/session/impact`; review affected sessions, room status, group gap changes, and faculty load. Repeat with `manual_change_impact_cross_day.json` and confirm both the original and destination faculty day loads appear in `facultyDailyHours.byDay`.
- `GET /api/admin/schedule/current` returns the schedule once active.
- `GET /api/admin/schedule/analytics` returns student-gap and faculty-load analytics.
- As a Student linked to a dataset group, check `GET /api/student/me/schedule`, `/exams`, `/events`, `/next-class`, and `/today`; the daily agenda should contain only that student's classes and relevant approved events, ordered by period. Check `/api/student/me/agenda?date=2026-11-02` for a selected date and confirm invalid dates are rejected.
- `GET /api/rooms/utilization` returns the room utilization dashboard.
- `POST /api/rooms/find` returns ranked available rooms for the requested slot; set `availableOnly: false` to inspect unavailable alternatives and their reason.
- Retry room search with `originRoomId: "LH-1"` or `originBuilding: "Lecture Hall Complex"`; same-building candidates should include `locationPreference.sameBuilding: true` and rank ahead of candidates in other buildings. Supplying both should fail validation. The bundled dataset does not define exact distances between buildings.
- Retry room search with `originRoomId: "LH-1"`; same-building candidates should include `locationPreference.sameBuilding: true` and rank ahead of candidates in other buildings. The bundled dataset does not define exact distances between buildings.
- `POST /api/conflicts/analyze` and `POST /api/conflicts/:id/solutions` return validated fixes and explanatory near misses; confirm a near miss contains at least one violation and cannot be sent to the Admin-only apply route.
- With an Admin token, add the bundled `F20` qualification for `MA101`, then call `POST /api/faculty/substitutes/find` for `MA101-AB-L1`; review candidate eligibility checks, day load, rank reasons, and recommendation before applying any substitute.
- With the Admin token, send `examples/requests/scenario_preview.json` to `POST /api/scenarios/preview`; confirm the response names directly impacted sessions and violation reasons, and that the scenario list and active timetable are unchanged. Then create and simulate a scenario, review `/api/scenarios/:id/compare`, and apply only if you intend to activate the proposal.
- For an `alternative_offered` booking, sign in as its requester and call `POST /api/bookings/:id/alternative/accept` or `/decline` with a reason; verify the response and `decisionHistory`.

## Optional Gemini parser

With `GEMINI_API_KEY` configured, send `POST /api/bookings/parse` with a valid authenticated requester token and a JSON body such as `{ "text": "Request a projector-equipped room for 40 people on Wednesday at 2 PM for one hour" }`. Review the returned draft before using it to create a booking. Without the key, the endpoint should report that AI parsing is not configured; manual booking remains usable.

Do not paste actual secrets into source files, documentation, screenshots, or support messages.
