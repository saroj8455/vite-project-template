import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema(
  {
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    event: { type: String, required: true, index: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

auditEventSchema.index({ meeting: 1, createdAt: -1 });

export const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
