import mongoose from 'mongoose';

const unavailableSchema = new mongoose.Schema({
  day: { type: String, required: true, enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
  periods: { type: [Number], required: true },
  reason: { type: String, default: '' },
}, { _id: false });

const preferenceSchema = new mongoose.Schema({
  type: { type: String, required: true },
  days: { type: [String], default: [] },
  periods: { type: [Number], default: [] },
}, { _id: false, strict: false });

const facultySchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  sourceId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true, index: true },
  maxHoursPerDay: { type: Number, default: 4, min: 0 },
  needsAccessible: { type: Boolean, default: false },
  unavailable: { type: [unavailableSchema], default: [] },
  preferences: { type: [preferenceSchema], default: [] },
}, { timestamps: true });

facultySchema.index({ dataset: 1, sourceId: 1 }, { unique: true });
facultySchema.index({ dataset: 1, department: 1 });

export const Faculty = mongoose.models.Faculty ?? mongoose.model('Faculty', facultySchema);
