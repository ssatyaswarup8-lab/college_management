import mongoose from 'mongoose';

const roomUnavailabilitySchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  roomId: { type: String, required: true, trim: true, index: true },
  day: { type: String, required: true, enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
  periods: { type: [Number], required: true },
  reason: { type: String, default: '' },
  source: { type: String, enum: ['dataset', 'admin', 'disruption', 'scenario'], default: 'dataset' },
  effectiveFrom: { type: Date, default: null },
  effectiveUntil: { type: Date, default: null },
}, { timestamps: true });

roomUnavailabilitySchema.index({ dataset: 1, roomId: 1, day: 1 });

export const RoomUnavailability = mongoose.models.RoomUnavailability
  ?? mongoose.model('RoomUnavailability', roomUnavailabilitySchema);
