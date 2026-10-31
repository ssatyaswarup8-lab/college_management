import mongoose from 'mongoose';

const scheduleGenerationSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['queued', 'running', 'succeeded', 'failed'], default: 'queued', index: true },
  solver: { type: String, default: 'unconfigured' },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  error: { code: { type: String, default: null }, message: { type: String, default: null } },
  result: {
    sessionsScheduled: { type: Number, default: 0 },
    examsScheduled: { type: Number, default: 0 },
    hardViolations: { type: Number, default: 0 },
    softPenalty: { type: Number, default: 0 },
  },
}, { timestamps: true });

scheduleGenerationSchema.index({ dataset: 1, createdAt: -1 });

export const ScheduleGeneration = mongoose.models.ScheduleGeneration
  ?? mongoose.model('ScheduleGeneration', scheduleGenerationSchema);
