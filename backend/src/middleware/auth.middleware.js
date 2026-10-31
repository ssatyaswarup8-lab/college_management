import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export async function authenticate(req, _res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'A bearer access token is required.'));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new ApiError(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired.'));
  }

  try {
    const user = await User.findById(payload.sub).select('_id role isActive');
    if (!user || !user.isActive || user.role !== payload.role) {
      throw new ApiError(401, 'UNAUTHORIZED', 'User account is unavailable.');
    }

    req.user = { userId: String(user._id), role: user.role };
    return next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(error);
  }
}
