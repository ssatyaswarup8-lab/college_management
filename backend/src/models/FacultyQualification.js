import mongoose from 'mongoose';

const facultyQualificationSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  facultyId: { type: String, required: true, trim: true, index: true },
  courseId: { type: String, required: true, trim: true, index: true },
  qualificationNote: { type: String, default: '', maxlength: 500 },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  revokedAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });

facultyQualificationSchema.index({ dataset: 1, facultyId: 1, courseId: 1 }, { unique: true });

export const FacultyQualification = mongoose.models.FacultyQualification
  ?? mongoose.model('FacultyQualification', facultyQualificationSchema);
