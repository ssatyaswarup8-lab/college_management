export class ApiError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }
}

export function notFoundError(message = 'Resource not found', details = {}) {
  return new ApiError(404, 'NOT_FOUND', message, details);
}
