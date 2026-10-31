# Third-Party Components

This file records direct backend dependencies from `package.json`. The committed `package-lock.json` pins the resolved dependency tree; update this inventory when direct dependencies change.

## Runtime dependencies

| Package | Purpose |
|---|---|
| `@google/genai` | Google Gemini SDK used by the optional booking text parser |
| `bcryptjs` | Password hashing and verification |
| `cookie-parser` | Reads the HTTP-only refresh-token cookie |
| `cors` | Restricts browser access to the configured frontend origin |
| `dotenv` | Loads local environment configuration |
| `express` | HTTP server and route handling |
| `helmet` | HTTP security headers |
| `jsonwebtoken` | Access and refresh token signing and verification |
| `mongoose` | MongoDB models and database access |
| `morgan` | HTTP request logging |
| `multer` | Multipart dataset upload handling |
| `zod` | Request and AI response validation |

## Development dependencies

| Package | Purpose |
|---|---|
| `jest` | Test runner |
| `supertest` | HTTP endpoint testing |

Before redistributing or deploying the backend, review the license and security notices for the resolved packages in the lockfile. Keep dependencies current through reviewed changes to `package.json` and `package-lock.json`.

The scenario preview and simulation flow uses the existing local scheduler and constraint validator. It does not add a third-party service or dependency.

Room location preference uses the room's dataset building label and adds no mapping or geolocation dependency.

Booking impact analysis uses the existing MongoDB records and booking validator; it adds no external conflict-analysis service or package.

Manual schedule impact metrics, including per-group student gaps, use backend calculations and add no third-party analytics service.

Substitute eligibility and ranking use the existing qualification records and deterministic scheduler constraints; no external recommendation service is used.
