import { ApiError } from '../utils/apiError.js';

export function requireRoles(...allowedRoles) {
  if (allowedRoles.length === 0) {
    throw new TypeError('requireRoles needs at least one allowed role.');
  }

  return function roleMiddleware(req, _res, next) {
    if (!req.user) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    }

    return next();
  };
}
