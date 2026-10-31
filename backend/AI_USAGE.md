# AI Usage

## Current use

Gemini is used only by the booking text parser (`POST /api/bookings/parse`). It converts a request into a draft with structured fields such as title, venue type, attendance, duration, requested time windows, and equipment needs.

The parser does not approve a booking, reserve a room, or change the timetable. The returned draft is marked `requiresUserReview: true`; the requester must review it and submit a normal booking request. The backend validates the response against a Zod schema and returns a manual-entry path when Gemini is unavailable or not configured.

## Configuration

- `GEMINI_API_KEY` is required to enable parsing.
- `GEMINI_MODEL` is optional; configuration defaults to `gemini-3.8-flash`.
- Keep both values in the local `.env` file or deployment secret store. Never commit actual API keys.

## Data handling

The submitted request text is included in the prompt sent to Google Gemini. Do not include passwords, access tokens, or unrelated sensitive personal data in a booking description. If AI parsing is unavailable or not desired, create the booking with the manual form/API fields instead.

Timetable generation, scenario impact previews, scenario simulation, and schedule validation are deterministic backend operations; they do not send timetable or disruption data to Gemini.

Room availability and origin-building preferences are evaluated locally against the active dataset and schedule. The room finder does not send location or search details to Gemini.

Booking decision impact previews also run the local deterministic booking validator and priority checks. Their proposal details are not sent to Gemini.

Manual timetable change impact analysis and student-gap comparisons are also computed locally from the active schedule and dataset.

Substitute recommendations are deterministic: they use Admin-verified qualifications, hard schedule checks, department match, and faculty teaching load. Candidate ranking does not use Gemini.

## Human review and validation

Gemini output is treated as untrusted input. It is parsed as JSON, checked against the backend schema, and later subjected to the ordinary booking authorization, room availability, capacity, and schedule checks. AI output does not bypass those rules.
