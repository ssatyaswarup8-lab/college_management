import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  reason: { type: String, default: '' },
}, { _id: false });

const scheduleVersionSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  versionNumber: { type: Number, required: true, min: 1 },
  generationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleGeneration', default: null },
  baseVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleVersion', default: null },
  kind: { type: String, enum: ['generation', 'manual_edit', 'disruption_repair', 'scenario', 'substitute_change', 'substitute_reversion'], required: true },
  status: { type: String, enum: ['proposed', 'active', 'superseded', 'rejected'], default: 'proposed', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectedAt: { type: Date, default: null },
  decisionReason: { type: String, default: '', maxlength: 500 },
  reason: { type: String, default: '' },
  changes: { type: [changeSchema], default: [] },
  summary: {
    sessionsScheduled: { type: Number, default: 0 },
    hardViolations: { type: Number, default: 0 },
    softPenalty: { type: Number, default: 0 },
    sessionsMoved: { type: Number, default: 0 },
  },
}, { timestamps: true });

scheduleVersionSchema.index({ dataset: 1, versionNumber: 1 }, { unique: true });
scheduleVersionSchema.index({ dataset: 1, status: 1, createdAt: -1 });

export const ScheduleVersion = mongoose.models.ScheduleVersion
  ?? mongoose.model('ScheduleVersion', scheduleVersionSchema);
