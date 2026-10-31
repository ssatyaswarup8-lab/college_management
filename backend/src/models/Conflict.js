import mongoose from 'mongoose';

const solutionSchema = new mongoose.Schema({
  placement: { type: mongoose.Schema.Types.Mixed, required: true },
  valid: { type: Boolean, default: true },
  impact: { type: mongoose.Schema.Types.Mixed, default: {} },
  rankScore: { type: Number, default: 0 },
}, { _id: false });

const conflictSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  scheduleVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleVersion', required: true },
  sessionId: { type: String, required: true, index: true },
  proposedPlacement: { type: mongoose.Schema.Types.Mixed, default: null },
  violations: { type: [mongoose.Schema.Types.Mixed], default: [] },
  solutions: { type: [solutionSchema], default: [] },
  nearMisses: { type: [mongoose.Schema.Types.Mixed], default: [] },
  status: { type: String, enum: ['open', 'analyzed', 'solutions_ready', 'proposal_created', 'resolved'], default: 'open', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  selectedSolution: { type: Number, default: null },
  proposedVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleVersion', default: null },
}, { timestamps: true });

conflictSchema.index({ dataset: 1, status: 1, createdAt: -1 });

export const Conflict = mongoose.models.Conflict ?? mongoose.model('Conflict', conflictSchema);
