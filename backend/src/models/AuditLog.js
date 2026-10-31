import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, maxlength: 240 },
  method: { type: String, required: true, maxlength: 10 },
  path: { type: String, required: true, maxlength: 500 },
  entityType: { type: String, default: 'system', maxlength: 80 },
  entityId: { type: String, default: null, maxlength: 120 },
  statusCode: { type: Number, required: true },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
export const AuditLog = mongoose.models.AuditLog ?? mongoose.model('AuditLog', auditLogSchema);
