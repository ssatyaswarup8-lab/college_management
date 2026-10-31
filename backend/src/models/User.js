import mongoose from 'mongoose';
import { ROLE_VALUES } from '../constants/roles.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: ROLE_VALUES },
  department: { type: String, trim: true, default: null, required() { return this.role === 'DEPARTMENT_COORDINATOR'; } },
  facultyId: { type: String, trim: true, default: null, required() { return this.role === 'FACULTY'; } },
  studentGroupIds: {
    type: [String],
    default: [],
    validate: { validator(value) { return this.role !== 'STUDENT' || value.length > 0; }, message: 'Student accounts must be linked to at least one student group.' },
  },
  isActive: { type: Boolean, default: true, index: true },
  refreshTokenHash: { type: String, default: null, select: false },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, department: 1 });
userSchema.index({ facultyId: 1 });
userSchema.index({ studentGroupIds: 1 });

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
