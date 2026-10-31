import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

const refreshCookieOptions = (req) => ({
  httpOnly: true,
  secure: req.secure || req.get('x-forwarded-proto') === 'https',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export async function login(req, res, next) {
  try {
    const session = await authService.login(req.body);
    res.cookie('refreshToken', session.refreshToken, refreshCookieOptions(req));
    return sendSuccess(res, {
      message: 'Login successful',
      data: { accessToken: session.accessToken, user: session.user },
    });
  } catch (error) {
    return next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const session = await authService.refreshSession(req.cookies?.refreshToken);
    res.cookie('refreshToken', session.refreshToken, refreshCookieOptions(req));
    return sendSuccess(res, {
      message: 'Session refreshed',
      data: { accessToken: session.accessToken, user: session.user },
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logout(req.user.userId);
    res.clearCookie('refreshToken', { ...refreshCookieOptions(req), maxAge: undefined });
    return sendSuccess(res, { message: 'Logout successful', data: {} });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    return sendSuccess(res, { data: { user } });
  } catch (error) {
    return next(error);
  }
}
