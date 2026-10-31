import mongoose from 'mongoose';

const windowSchema = new mongoose.Schema({
  day: { type: String, required: true, enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
  fromPeriod: { type: Number, required: true, min: 1, max: 13 },
  // 14 is valid as a window boundary for midnight after event period P13.
  toPeriod: { type: Number, required: true, min: 1, max: 14 },
}, { _id: false });

const decisionSchema = new mongoose.Schema({
  status: { type: String, enum: ['approved', 'rejected', 'alternative_offered'] },
  day: { type: String, default: null },
  startPeriod: { type: Number, default: null },
  endPeriod: { type: Number, default: null },
  roomId: { type: String, default: null },
  reason: { type: String, default: '' },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  decidedAt: { type: Date, default: null },
  priorityCategory: { type: String, default: null },
  priorityRank: { type: Number, default: null, min: 1 },
  priorityOverrideReason: { type: String, default: '', maxlength: 500 },
  priorityOverrideRequestIds: { type: [String], default: [] },
}, { _id: false });

const bookingRequestSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  sourceId: { type: String, trim: true, default: null },
  submittedAt: { type: Date, default: Date.now, index: true },
  requester: { type: String, required: true, trim: true },
  requesterUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  requesterRole: { type: String, required: true, trim: true },
  department: { type: String, default: null },
  requestedCategory: { type: String, required: true, enum: ['institute_event', 'guest_lecture', 'department_event', 'club_event'] },
  title: { type: String, required: true, trim: true },
  attendance: { type: Number, required: true, min: 1 },
  durationPeriods: { type: Number, required: true, min: 1, max: 13 },
  windows: { type: [windowSchema], required: true },
  roomTypes: { type: [String], required: true },
  needs: { type: [String], default: [] },
  requestedRoom: { type: String, default: null },
  mandatoryForGroups: { type: [String], default: [] },
  seriesId: { type: String, default: null },
  rawText: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'alternative_offered', 'cancelled'], default: 'pending', index: true },
  decision: { type: decisionSchema, default: null },
  decisionHistory: { type: [decisionSchema], default: [] },
}, { timestamps: true });

bookingRequestSchema.index({ dataset: 1, sourceId: 1 }, { unique: true, sparse: true });
bookingRequestSchema.index({ dataset: 1, status: 1, submittedAt: 1 });

export const BookingRequest = mongoose.models.BookingRequest ?? mongoose.model('BookingRequest', bookingRequestSchema);
