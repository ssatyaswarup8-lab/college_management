import mongoose from 'mongoose';

const scenarioSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '', maxlength: 1000 },
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  baseVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleVersion', required: true },
  proposedVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleVersion', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changes: { type: [mongoose.Schema.Types.Mixed], required: true },
  status: { type: String, enum: ['draft', 'simulating', 'simulated', 'failed', 'applied'], default: 'draft', index: true },
  comparison: {
    sessionsMoved: { type: Number, default: 0 },
    timeChanged: { type: Number, default: 0 },
    roomOnlyChanged: { type: Number, default: 0 },
    hardViolations: { type: Number, default: 0 },
    softPenaltyBefore: { type: Number, default: 0 },
    softPenaltyAfter: { type: Number, default: 0 },
    affectedFaculty: { type: [String], default: [] },
    affectedGroups: { type: [String], default: [] },
    affectedRooms: { type: [String], default: [] },
  },
  failure: { code: { type: String, default: null }, message: { type: String, default: null } },
  simulatedAt: { type: Date, default: null },
  appliedAt: { type: Date, default: null },
  appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

scenarioSchema.index({ dataset: 1, createdBy: 1, createdAt: -1 });

export const Scenario = mongoose.models.Scenario ?? mongoose.model('Scenario', scenarioSchema);
