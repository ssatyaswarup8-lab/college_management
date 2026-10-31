import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  sourceId: { type: String, required: true, trim: true },
  courseId: { type: String, required: true, trim: true, index: true },
  kind: { type: String, required: true, enum: ['lecture', 'tutorial', 'lab'] },
  groups: { type: [String], required: true },
  facultyId: { type: String, required: true, trim: true, index: true },
  size: { type: Number, required: true, min: 1 },
  duration: { type: Number, required: true, min: 1, max: 9 },
  roomTypes: { type: [String], required: true },
  needsAccessible: { type: Boolean, default: false },
  basketSlot: { type: String, default: null, index: true },
  fixedSlot: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

sessionSchema.index({ dataset: 1, sourceId: 1 }, { unique: true });
sessionSchema.index({ dataset: 1, groups: 1 });
sessionSchema.index({ dataset: 1, facultyId: 1 });

export const Session = mongoose.models.Session ?? mongoose.model('Session', sessionSchema);
