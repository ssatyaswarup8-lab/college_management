import dotenv from 'dotenv';

dotenv.config();

const port = Number.parseInt(process.env.PORT ?? '5000', 10);
const geminiTimeoutMs = Number.parseInt(process.env.GEMINI_TIMEOUT_MS ?? '300000', 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

if (!Number.isInteger(geminiTimeoutMs) || geminiTimeoutMs < 1000 || geminiTimeoutMs > 300000) {
  throw new Error('GEMINI_TIMEOUT_MS must be an integer between 1000 and 300000.');
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port,
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
  initialAdminName: process.env.INITIAL_ADMIN_NAME ?? '',
  initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL ?? '',
  initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD ?? '',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  geminiTimeoutMs,
  teamName: process.env.TEAM_NAME?.trim() || 'CIT',
});
