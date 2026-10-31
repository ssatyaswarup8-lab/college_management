# CIT Campus Scheduling Backend

Backend API for the CIT campus scheduling and venue management application. The frontend is maintained separately.

## Local setup

Requirements: Node.js 20 or newer and a MongoDB connection string.

1. Open a terminal in this `backend` directory.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and fill in `MONGODB_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`. Fill in `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD` only if bootstrap needs to create the first Admin. Add `GEMINI_API_KEY` only to enable the optional booking text parser; set `TEAM_NAME` if the official export should use a name other than `CIT`.
4. Run `npm run bootstrap`. This creates the first Admin only when one does not already exist. It imports and activates `data/cit_public.json` only when there is no active dataset.
5. Start the API with `npm run dev`.

The API listens on `http://localhost:5000`. The frontend origin defaults to `http://localhost:5173`.

## First API checks

Health check:

```http
GET http://localhost:5000/api/health
```

Log in using the initial Admin credentials configured in `.env`:

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{"email":"<INITIAL_ADMIN_EMAIL>","password":"<INITIAL_ADMIN_PASSWORD>"}
```

The response contains an access token. Send it as `Authorization: Bearer <access_token>` for protected routes. The refresh token is set as an HTTP-only cookie.

Create additional accounts using the Admin token:

```http
POST http://localhost:5000/api/admin/users
Authorization: Bearer <access_token>
Content-Type: application/json

{"name":"Faculty Demo","email":"faculty@example.test","password":"replace-with-a-long-password","role":"FACULTY","facultyId":"F01"}
```

There is intentionally no public signup endpoint. Only an Admin can create accounts, and the client cannot assign itself a role.

## Current API areas

- Authentication and Admin-managed account creation
- Admin dataset JSON/CSV preview, import, listing, and activation
- Booking requester acceptance or decline of an Admin-offered alternative, with decision history
- Priority-ordered booking queue using dataset category order and role caps
- Booking priority conflict checks with auditable Admin override reasons
- Read-only booking decision impact previews with affected sessions, groups, and conflict reasons
- Admin timetable generation from the active dataset
- Read-only what-if scenario impact previews followed by simulated timetable proposals
- Admin schedule analytics for student gaps and faculty daily teaching loads
- Room finder supports an optional origin room or building to prefer same-building candidates
- Personalized Student and Faculty timetables, including date-selectable Student agendas with relevant events
- Conflict assistance with department-scoped access, valid fixes, explanatory near misses, and Admin-only resolution approval
- Ranked substitute-faculty recommendations with qualification, availability, and daily-load explanations
- Manual change impact analysis scoped to department coordinators' own courses
- Manual change impact previews report per-group gap changes, room violations, and faculty loads for both affected days
- Conflict suggestions explain affected groups, faculty, rooms, student gaps, and faculty daily load
- Personal notifications for booking decisions and Admin audit logs for successful authenticated API mutations

See [docs/API_CONTRACT.md](docs/API_CONTRACT.md) for the current request and response contracts. More feature APIs will be documented as they are implemented.

## Environment variables

Keep `.env` local and private. `.env.example` contains required variable names and non-secret defaults. See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for the full variable reference. Gemini is currently used by the optional booking text parser.
