import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['host', 'participant'], default: 'participant' },
    status: { type: String, enum: ['waiting', 'admitted', 'denied', 'removed', 'left'], default: 'waiting', index: true },
    requestedAt: { type: Date, default: Date.now },
    admittedAt: { type: Date, default: null },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
    removedAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: Date.now },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

participantSchema.index({ meeting: 1, user: 1 }, { unique: true });

export const MeetingParticipant = mongoose.model('MeetingParticipant', participantSchema);
