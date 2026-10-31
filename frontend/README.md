# CIT CampusFlow

CIT CampusFlow is a role-based frontend for campus scheduling, venue bookings, exams, disruptions, and schedule scenarios at Chilika Institute of Technology. The frontend consumes the independently developed CIT backend and does not implement scheduling or constraint validation itself.

## Architecture

```text
React pages and components
        ↓
TanStack Query hooks (server state)
        ↓
Feature API modules
        ↓
Shared Axios client
        ↓
CIT backend: http://localhost:5000/api
```

Backend responses and validation remain authoritative. Frontend role checks only control navigation and do not replace backend authorization.

## Technology

- React and JavaScript
- Vite
- Tailwind CSS
- React Router
- Axios
- TanStack Query

## Setup

1. Install Node.js (Vite requires a supported current Node.js version) and npm.
2. In this directory, run `npm install`.
3. Copy `.env.example` to `.env` if you want to use the backend URL directly. The default Vite proxy forwards `/api` to `http://localhost:5000`.
4. Start the backend on port 5000.
5. Start the frontend with `npm run dev` and open `http://localhost:5173`.

## Demo accounts

No demo credentials were included with the frontend prompt. Add the accounts supplied by the backend/team before sharing the project with judges. The login form does not create or hard-code users.

## Current scope

The project includes authentication infrastructure, role-based routes, dashboards, timetable views, exams, bookings, disruptions, scenarios, conflicts, rooms, faculty, analytics, audit, and notification API clients. A page can only return live data when the corresponding backend endpoint is running and implemented.

## Known limitations

- API response shapes for several features are not yet confirmed by the backend team; pages support the documented response envelope and common field aliases.
- Dataset activation depends on the upload response explicitly reporting successful validation. The supplied API contract does not define a separate validation endpoint.
- System settings and audit detail capabilities depend on the backend response; no settings write endpoint is defined in the current API contract.
- Demo credentials and production deployment configuration must be supplied by the team.
