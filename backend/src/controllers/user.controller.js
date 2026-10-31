import { createUserAccount, listUserAccounts, setUserAccountStatus, updateUserProfile } from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function createUser(req, res, next) {
  try {
    const user = await createUserAccount(req.body);
    return sendSuccess(res, {
      status: 201,
      message: 'User account created',
      data: { user },
    });
  } catch (error) {
    return next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const users = await listUserAccounts(req.query);
    return sendSuccess(res, { data: { users } });
  } catch (error) { return next(error); }
}

export async function setStatus(req, res, next) {
  try {
    const user = await setUserAccountStatus({ targetUserId: req.params.userId, isActive: req.body.isActive, actorId: req.user.userId });
    return sendSuccess(res, { message: user.isActive ? 'User account activated' : 'User account deactivated', data: { user } });
  } catch (error) { return next(error); }
}

export async function updateProfile(req, res, next) {
  try {
    const user = await updateUserProfile({ targetUserId: req.params.userId, input: req.body });
    return sendSuccess(res, { message: 'User profile updated', data: { user } });
  } catch (error) { return next(error); }
}
