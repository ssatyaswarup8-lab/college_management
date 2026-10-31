import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
  sourceId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  building: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true, index: true },
  capacity: { type: Number, required: true, min: 1 },
  features: { type: [String], default: [] },
  accessible: { type: Boolean, default: false },
  allowedUses: { type: [String], default: [] },
}, { timestamps: true });

roomSchema.index({ dataset: 1, sourceId: 1 }, { unique: true });
roomSchema.index({ dataset: 1, capacity: 1, type: 1 });

export const Room = mongoose.models.Room ?? mongoose.model('Room', roomSchema);
