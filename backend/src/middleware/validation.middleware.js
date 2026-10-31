import { ApiError } from '../utils/apiError.js';

const REQUEST_PARTS = new Set(['body', 'params', 'query']);

export function validate(schema, part = 'body') {
  if (!REQUEST_PARTS.has(part)) {
    throw new TypeError(`Unsupported request part: ${part}`);
  }

  return function validationMiddleware(req, _res, next) {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
        message: issue.message,
      }));
      return next(new ApiError(422, 'VALIDATION_ERROR', 'Request validation failed.', { issues: details }));
    }

    req[part] = result.data;
    return next();
  };
}
