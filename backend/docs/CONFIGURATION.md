# Backend Configuration

Copy `.env.example` to `.env` for local development. Keep `.env` private and out of source control. The backend reads environment variables once through `src/config/env.js`.

| Variable | Required | Default | Used for |
|---|---|---|---|
| `PORT` | No | `5000` | HTTP listener port; must be an integer from 1 to 65535 |
| `NODE_ENV` | No | `development` | Logging behavior; production uses combined HTTP logs |
| `FRONTEND_URL` | No | `http://localhost:5173` | Credentialed CORS origin |
| `MONGODB_URI` | Yes to start the API/bootstrap | None | MongoDB connection string |
| `JWT_SECRET` | Yes for token issuance | None | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Yes for refresh-token issuance | None | Refresh-token signing secret |
| `INITIAL_ADMIN_NAME` | Required only when bootstrap must create the first Admin | None | Initial account name |
| `INITIAL_ADMIN_EMAIL` | Required only when bootstrap must create the first Admin | None | Initial account email |
| `INITIAL_ADMIN_PASSWORD` | Required only when bootstrap must create the first Admin; minimum 12 characters | None | Initial account password |
| `GEMINI_API_KEY` | No | AI parsing disabled | Enables `POST /api/bookings/parse` |
| `GEMINI_MODEL` | No | `gemini-3.8-flash` | Gemini model used for booking parsing |
| `TEAM_NAME` | No | `CIT` | `team` value in the official schedule export |

The initial Admin variables are not needed if an Admin already exists; bootstrap leaves that account unchanged. Do not put real secrets in this document or in `.env.example`.
