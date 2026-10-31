import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export function notFoundMiddleware(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
}

export function errorMiddleware(err, _req, res, _next) {
  const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = status >= 500
    ? (env.nodeEnv === 'development' ? err.message : 'Unexpected server error')
    : err.message;

  if (status >= 500) {
    logger.error(err.message, env.nodeEnv === 'production' ? undefined : { stack: err.stack });
  }

  return res.status(status).json({
    success: false,
    message,
    error: {
      code: err.code ?? (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      details: err.details ?? {},
    },
  });
}
