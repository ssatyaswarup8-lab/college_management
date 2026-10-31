import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { Course } from '../models/Course.js';
import { Dataset } from '../models/Dataset.js';
import { Faculty } from '../models/Faculty.js';
import { StudentGroup } from '../models/StudentGroup.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

const REFRESH_TOKEN_HASH_ROUNDS = 12;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function tokenMatches(token, savedHash) {
  if (!savedHash) return false;
  return bcrypt.compare(hashToken(token), savedHash);
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    facultyId: user.facultyId,
    studentGroupIds: user.studentGroupIds,
    isActive: user.isActive,
  };
}

async function issueSession(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(hashToken(refreshToken), REFRESH_TOKEN_HASH_ROUNDS);
  await user.save();
  return { accessToken, refreshToken, user: publicUser(user) };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash +refreshTokenHash');
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  return issueSession(user);
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'A refresh token is required.');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.isActive || !(await tokenMatches(refreshToken, user.refreshTokenHash))) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or has been revoked.');
  }

  user.refreshTokenHash = null;
  return issueSession(user);
}

export async function logout(userId) {
  await User.updateOne({ _id: userId }, { $set: { refreshTokenHash: null } });
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'UNAUTHORIZED', 'User account is unavailable.');
  }
  return publicUser(user);
}

export async function createUserAccount({ name, email, password, role, department, facultyId, studentGroupIds = [] }) {
  if (role === 'DEPARTMENT_COORDINATOR' || role === 'FACULTY' || role === 'STUDENT') {
    const dataset = await Dataset.findOne({ status: 'active' }).select('_id');
    if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'Import and activate a dataset before creating linked faculty, student, or coordinator accounts.');
    if (role === 'FACULTY' && !await Faculty.exists({ dataset: dataset._id, sourceId: facultyId })) {
      throw new ApiError(422, 'FACULTY_NOT_FOUND', `Faculty ${facultyId} does not exist in the active dataset.`);
    }
    if (role === 'STUDENT') {
      const validCount = await StudentGroup.countDocuments({ dataset: dataset._id, sourceId: { $in: studentGroupIds } });
      if (!studentGroupIds.length || validCount !== new Set(studentGroupIds).size) {
        throw new ApiError(422, 'STUDENT_GROUP_NOT_FOUND', 'Every student group must exist in the active dataset, and at least one group is required.');
      }
    }
    if (role === 'DEPARTMENT_COORDINATOR' && !await Course.exists({ dataset: dataset._id, department })) {
      throw new ApiError(422, 'DEPARTMENT_NOT_FOUND', `Department ${department} has no courses in the active dataset.`);
    }
  }
  const passwordHash = await bcrypt.hash(password, REFRESH_TOKEN_HASH_ROUNDS);
  try {
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      department,
      facultyId,
      studentGroupIds,
    });
    return publicUser(user);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists.');
    }
    throw error;
  }
}

export async function listUserAccounts(filters = {}) {
  const query = {};
  if (filters.role) query.role = filters.role;
  if (filters.department) query.department = filters.department;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  const users = await User.find(query).sort({ role: 1, name: 1 }).lean();
  return users.map((user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    facultyId: user.facultyId,
    studentGroupIds: user.studentGroupIds,
    isActive: user.isActive,
    createdAt: user.createdAt,
  }));
}

export async function setUserAccountStatus({ targetUserId, isActive, actorId }) {
  const user = await User.findById(targetUserId).select('+refreshTokenHash');
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User account was not found.');
  if (String(targetUserId) === String(actorId) && !isActive) {
    throw new ApiError(409, 'SELF_DEACTIVATION_FORBIDDEN', 'You cannot deactivate your own account.');
  }
  if (!isActive && user.role === 'ADMIN' && user.isActive) {
    const activeAdmins = await User.countDocuments({ role: 'ADMIN', isActive: true });
    if (activeAdmins <= 1) throw new ApiError(409, 'LAST_ADMIN_REQUIRED', 'At least one active Admin account must remain.');
  }
  user.isActive = isActive;
  if (!isActive) user.refreshTokenHash = null;
  await user.save();
  return publicUser(user);
}

export async function updateUserProfile({ targetUserId, input }) {
  const user = await User.findById(targetUserId);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User account was not found.');
  if (input.name !== undefined) user.name = input.name;

  const hasProfileUpdate = input.department !== undefined || input.facultyId !== undefined || input.studentGroupIds !== undefined;
  let dataset = null;
  if (hasProfileUpdate) {
    dataset = await Dataset.findOne({ status: 'active' }).select('_id');
    if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists for validating account links.');
  }
  if (input.department !== undefined) {
    if (user.role !== 'DEPARTMENT_COORDINATOR') throw new ApiError(422, 'PROFILE_FIELD_NOT_APPLICABLE', 'Only department coordinator accounts can have a department profile link.');
    if (!await Course.exists({ dataset: dataset._id, department: input.department })) throw new ApiError(422, 'DEPARTMENT_NOT_FOUND', `Department ${input.department} has no courses in the active dataset.`);
    user.department = input.department;
  }
  if (input.facultyId !== undefined) {
    if (user.role !== 'FACULTY') throw new ApiError(422, 'PROFILE_FIELD_NOT_APPLICABLE', 'Only Faculty accounts can have a faculty profile link.');
    if (!await Faculty.exists({ dataset: dataset._id, sourceId: input.facultyId })) throw new ApiError(422, 'FACULTY_NOT_FOUND', `Faculty ${input.facultyId} does not exist in the active dataset.`);
    user.facultyId = input.facultyId;
  }
  if (input.studentGroupIds !== undefined) {
    if (user.role !== 'STUDENT') throw new ApiError(422, 'PROFILE_FIELD_NOT_APPLICABLE', 'Only Student accounts can have student group links.');
    const uniqueGroupIds = [...new Set(input.studentGroupIds)];
    const validCount = await StudentGroup.countDocuments({ dataset: dataset._id, sourceId: { $in: uniqueGroupIds } });
    if (!uniqueGroupIds.length || validCount !== uniqueGroupIds.length) throw new ApiError(422, 'STUDENT_GROUP_NOT_FOUND', 'Every student group must exist in the active dataset.');
    user.studentGroupIds = uniqueGroupIds;
  }
  await user.save();
  return publicUser(user);
}
