import mongoose from 'mongoose';

const disruptionSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  baseVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleVersion', required: true },
  proposedVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleVersion', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '', maxlength: 1000 },
  changes: { type: [mongoose.Schema.Types.Mixed], required: true },
  impact: { type: mongoose.Schema.Types.Mixed, default: null },
  status: { type: String, enum: ['analyzed', 'repairing', 'repaired', 'failed', 'applied'], default: 'analyzed', index: true },
  comparison: {
    sessionsMoved: { type: Number, default: 0 },
    sessionsAdded: { type: Number, default: 0 },
    timeChanged: { type: Number, default: 0 },
    roomOnlyChanged: { type: Number, default: 0 },
    hardViolations: { type: Number, default: 0 },
    softPenaltyBefore: { type: Number, default: 0 },
    softPenaltyAfter: { type: Number, default: 0 },
  },
  failure: { code: { type: String, default: null }, message: { type: String, default: null }, details: { type: mongoose.Schema.Types.Mixed, default: null } },
  repairedAt: { type: Date, default: null },
  appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  appliedAt: { type: Date, default: null },
}, { timestamps: true });

disruptionSchema.index({ dataset: 1, createdAt: -1 });

export const Disruption = mongoose.models.Disruption ?? mongoose.model('Disruption', disruptionSchema);
