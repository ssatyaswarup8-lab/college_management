import mongoose from 'mongoose';

const datasetSchema = new mongoose.Schema({
  datasetId: { type: String, required: true, trim: true },
  revision: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['preview', 'active', 'archived'], default: 'preview', index: true },
  institute: { type: String, required: true },
  calendar: { type: mongoose.Schema.Types.Mixed, required: true },
  priorityOrder: { type: [String], required: true },
  roleCategoryCap: { type: mongoose.Schema.Types.Mixed, required: true },
  sourceFileName: { type: String, default: null },
  sourceHash: { type: String, required: true },
  counts: {
    rooms: { type: Number, required: true, min: 0 },
    faculty: { type: Number, required: true, min: 0 },
    studentGroups: { type: Number, required: true, min: 0 },
    courses: { type: Number, required: true, min: 0 },
    sessions: { type: Number, required: true, min: 0 },
    bookingRequests: { type: Number, required: true, min: 0 },
    exams: { type: Number, required: true, min: 0 },
  },
  importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  activatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  activatedAt: { type: Date, default: null },
}, { timestamps: true });

datasetSchema.index({ datasetId: 1, revision: 1 }, { unique: true });
datasetSchema.index({ status: 1, activatedAt: -1 });

export const Dataset = mongoose.models.Dataset ?? mongoose.model('Dataset', datasetSchema);
