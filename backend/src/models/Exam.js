import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  sourceId: { type: String, required: true, trim: true },
  courseIds: { type: [String], required: true },
  groups: { type: [String], required: true },
  size: { type: Number, required: true, min: 1 },
  durationHours: { type: Number, required: true, min: 1 },
  scheduledDay: { type: String, default: null, enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', null] },
  examSession: { type: String, default: null, enum: ['AM', 'PM', null] },
  rooms: { type: [String], default: [] },
  scheduleVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleVersion', default: null },
}, { timestamps: true });

examSchema.index({ dataset: 1, sourceId: 1 }, { unique: true });
examSchema.index({ dataset: 1, scheduledDay: 1, examSession: 1 });
examSchema.index({ dataset: 1, groups: 1 });

export const Exam = mongoose.models.Exam ?? mongoose.model('Exam', examSchema);
