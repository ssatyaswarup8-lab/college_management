import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  sourceId: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true, index: true },
  year: { type: Number, required: true, min: 1 },
  lectureHours: { type: Number, default: 0, min: 0 },
  tutorialHours: { type: Number, default: 0, min: 0 },
  labBlocks: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

courseSchema.index({ dataset: 1, sourceId: 1 }, { unique: true });
courseSchema.index({ dataset: 1, department: 1, year: 1 });

export const Course = mongoose.models.Course ?? mongoose.model('Course', courseSchema);
