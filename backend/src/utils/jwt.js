import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

function secretFor(tokenType) {
  const secret = tokenType === 'refresh' ? env.jwtRefreshSecret : env.jwtSecret;
  if (!secret) {
    const error = new Error(`${tokenType === 'refresh' ? 'JWT_REFRESH_SECRET' : 'JWT_SECRET'} is not configured.`);
    error.code = 'JWT_SECRET_MISSING';
    throw error;
  }
  return secret;
}

export function signAccessToken(user) {
  return jwt.sign(
    { role: user.role, tokenType: 'access' },
    secretFor('access'),
    { subject: String(user._id), expiresIn: '15m', jwtid: randomUUID() },
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { tokenType: 'refresh' },
    secretFor('refresh'),
    { subject: String(user._id), expiresIn: '7d', jwtid: randomUUID() },
  );
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, secretFor('access'));
  if (payload.tokenType !== 'access') throw new Error('Invalid access token type.');
  return payload;
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, secretFor('refresh'));
  if (payload.tokenType !== 'refresh') throw new Error('Invalid refresh token type.');
  return payload;
}
