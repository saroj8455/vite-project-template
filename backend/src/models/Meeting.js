import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    locked: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'ended'], default: 'active', index: true },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Meeting = mongoose.model('Meeting', meetingSchema);
