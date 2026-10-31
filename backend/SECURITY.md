# Backend Security Notes

## Secrets

- Store `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INITIAL_ADMIN_PASSWORD`, and `GEMINI_API_KEY` in a private local `.env` or a deployment secret manager.
- Never commit `.env`, production credentials, access tokens, or refresh tokens. `.env.example` contains variable names and a non-secret Gemini model default only.
- Use distinct, high-entropy JWT secrets outside local development and rotate them if exposed.

## Accounts and access

- There is no public signup endpoint. An Admin creates accounts and assigns roles.
- Protected routes require authentication and role checks; do not rely on frontend visibility to enforce authorization.
- Department-coordinator timetable reads must be scoped to the coordinator's department. Full schedule export is restricted to Admins.
- Manual change impact analysis must verify the requested session belongs to the coordinator's department before returning schedule details.
- Conflict listing, analysis, and solution generation must be scoped to the coordinator's department; only Admins can apply a resolution proposal.
- Passwords are hashed with `bcryptjs`; do not log credentials or tokens.

## Uploads and AI requests

- Dataset imports should use the authenticated Admin endpoints and pass backend schema validation before activation.
- Booking text submitted to the Gemini parser is sent to Google Gemini. Avoid including secrets or unrelated sensitive personal data in that text. Manual booking entry remains available.
- Treat all imported data and AI output as untrusted until backend validation succeeds.

## Deployment

- Set `NODE_ENV=production`, configure the exact frontend origin in `FRONTEND_URL`, and use HTTPS at the public edge.
- Restrict MongoDB network access and database credentials to the application environment.
- Review logs and error responses before exposing the service publicly; do not add secrets or raw credentials to log messages.
