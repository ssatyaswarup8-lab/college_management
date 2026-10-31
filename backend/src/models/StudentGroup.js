import mongoose from 'mongoose';

const studentGroupSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  sourceId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  year: { type: Number, required: true, min: 1 },
  department: { type: String, required: true, trim: true, index: true },
  size: { type: Number, required: true, min: 1 },
  needsAccessible: { type: Boolean, default: false },
}, { timestamps: true });

studentGroupSchema.index({ dataset: 1, sourceId: 1 }, { unique: true });
studentGroupSchema.index({ dataset: 1, year: 1, department: 1 });

export const StudentGroup = mongoose.models.StudentGroup ?? mongoose.model('StudentGroup', studentGroupSchema);
