import mongoose from 'mongoose';

const scheduledSessionSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  scheduleVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleVersion', required: true, index: true },
  sessionId: { type: String, required: true, trim: true, index: true },
  day: { type: String, required: true, enum: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
  startPeriod: { type: Number, required: true, min: 1, max: 9 },
  roomId: { type: String, required: true, trim: true, index: true },
  facultyOverrideId: { type: String, default: null, trim: true, index: true },
  source: { type: String, enum: ['generated', 'manual', 'repair', 'scenario', 'substitute'], default: 'generated' },
}, { timestamps: true });

scheduledSessionSchema.index({ scheduleVersion: 1, sessionId: 1 }, { unique: true });
scheduledSessionSchema.index({ scheduleVersion: 1, day: 1, startPeriod: 1, roomId: 1 });

export const ScheduledSession = mongoose.models.ScheduledSession
  ?? mongoose.model('ScheduledSession', scheduledSessionSchema);
