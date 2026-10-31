import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function list(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit).populate('actor', 'name email role').lean();
    return sendSuccess(res, { data: { logs } });
  } catch (error) { return next(error); }
}

export async function getOne(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.auditId)) throw new ApiError(404, 'AUDIT_ENTRY_NOT_FOUND', 'Audit entry was not found.');
    const log = await AuditLog.findById(req.params.auditId).populate('actor', 'name email role').lean();
    if (!log) throw new ApiError(404, 'AUDIT_ENTRY_NOT_FOUND', 'Audit entry was not found.');
    return sendSuccess(res, { data: { log } });
  } catch (error) { return next(error); }
}
