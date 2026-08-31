import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { Meeting } from '../models/Meeting.js';
import { MeetingParticipant } from '../models/MeetingParticipant.js';
import { asyncHandler, getRequestMetadata, publicUser } from '../utils/http.js';

const router = Router();
const codeSchema = z.object({ code: z.string().regex(/^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/) }).passthrough();
const createSchema = z.object({ title: z.string().trim().min(3).max(120).default('Untitled meeting') });
const decisionSchema = z.object({ decision: z.enum(['admit', 'deny']) });
const lockSchema = z.object({ locked: z.boolean() });

function newMeetingCode() {
  const value = randomBytes(8).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, 'x');
  return `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 10)}`;
}

function serializeMeeting(meeting) {
  return {
    id: meeting.id,
    code: meeting.code,
    title: meeting.title,
    locked: meeting.locked,
    status: meeting.status,
    hostId: meeting.host.toString(),
    createdAt: meeting.createdAt,
  };
}

function serializeParticipant(participant) {
  return {
    id: participant.id,
    role: participant.role,
    status: participant.status,
    requestedAt: participant.requestedAt,
    admittedAt: participant.admittedAt,
    joinedAt: participant.joinedAt,
    leftAt: participant.leftAt,
    removedAt: participant.removedAt,
    user: participant.user?.dummyJsonId ? publicUser(participant.user) : undefined,
  };
}

async function writeAudit({ meeting, actor, targetUser = null, event, req, metadata = {} }) {
  await AuditEvent.create({
    meeting: meeting._id,
    actor: actor?._id || null,
    targetUser: targetUser?._id || null,
    event,
    ...getRequestMetadata(req),
    metadata,
  });
}

async function getMeeting(code) {
  return Meeting.findOne({ code, status: 'active' });
}

const requireHost = asyncHandler(async (req, res, next) => {
  const meeting = await getMeeting(req.params.code);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found or has ended.' });
  if (!meeting.host.equals(req.user._id)) return res.status(403).json({ message: 'Host access required.' });
  req.meeting = meeting;
  return next();
});

router.post('/', requireAuth, validate(createSchema), asyncHandler(async (req, res) => {
  let meeting;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      meeting = await Meeting.create({ code: newMeetingCode(), title: req.body.title, host: req.user._id });
      break;
    } catch (error) {
      if (error.code !== 11000 || attempt === 4) throw error;
    }
  }
  const participant = await MeetingParticipant.create({
    meeting: meeting._id,
    user: req.user._id,
    role: 'host',
    status: 'admitted',
    admittedAt: new Date(),
    ...getRequestMetadata(req),
  });
  await writeAudit({ meeting, actor: req.user, event: 'meeting_created', req });
  await writeAudit({ meeting, actor: req.user, event: 'host_joined', req });
  res.status(201).json({ meeting: serializeMeeting(meeting), participant: serializeParticipant(participant) });
}));

router.get('/:code', requireAuth, validate(codeSchema, 'params'), asyncHandler(async (req, res) => {
  const meeting = await getMeeting(req.params.code);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found or has ended.' });
  const participant = await MeetingParticipant.findOne({ meeting: meeting._id, user: req.user._id });
  res.json({ meeting: serializeMeeting(meeting), participant: participant ? serializeParticipant(participant) : null });
}));

router.post('/:code/join-requests', requireAuth, validate(codeSchema, 'params'), asyncHandler(async (req, res) => {
  const meeting = await getMeeting(req.params.code);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found or has ended.' });
  const isHost = meeting.host.equals(req.user._id);
  const existing = await MeetingParticipant.findOne({ meeting: meeting._id, user: req.user._id });

  if (existing?.status === 'removed') return res.status(403).json({ message: 'You were removed from this meeting.' });
  if (meeting.locked && !isHost && !existing) return res.status(423).json({ message: 'The host has locked this meeting.' });

  const result = await MeetingParticipant.findOneAndUpdate(
    { meeting: meeting._id, user: req.user._id },
    {
      $setOnInsert: {
        meeting: meeting._id,
        user: req.user._id,
        role: isHost ? 'host' : 'participant',
        status: isHost ? 'admitted' : 'waiting',
        admittedAt: isHost ? new Date() : null,
        ...getRequestMetadata(req),
      },
    },
    { new: true, upsert: true, includeResultMetadata: true },
  );
  const participant = result.value;
  const wasCreated = !result.lastErrorObject.updatedExisting;
  participant.lastSeenAt = new Date();
  if (participant.status === 'left') {
    participant.status = isHost ? 'admitted' : 'waiting';
    participant.leftAt = null;
    participant.joinedAt = null;
    if (isHost) participant.admittedAt = new Date();
  }
  await participant.save();
  if (wasCreated) await writeAudit({ meeting, actor: req.user, event: isHost ? 'host_joined' : 'join_requested', req });
  res.status(participant.status === 'waiting' ? 202 : 200).json({ meeting: serializeMeeting(meeting), participant: serializeParticipant(participant) });
}));

router.get('/:code/session', requireAuth, validate(codeSchema, 'params'), asyncHandler(async (req, res) => {
  const meeting = await getMeeting(req.params.code);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found or has ended.' });
  const participant = await MeetingParticipant.findOne({ meeting: meeting._id, user: req.user._id });
  if (!participant) return res.status(403).json({ message: 'Join this meeting before checking access.' });
  participant.lastSeenAt = new Date();
  await participant.save();
  res.json({ meeting: serializeMeeting(meeting), participant: serializeParticipant(participant) });
}));

router.post('/:code/media-sessions', requireAuth, validate(codeSchema, 'params'), asyncHandler(async (req, res) => {
  const meeting = await getMeeting(req.params.code);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found or has ended.' });
  const participant = await MeetingParticipant.findOne({ meeting: meeting._id, user: req.user._id });
  if (!participant || participant.status !== 'admitted') return res.status(403).json({ message: 'Meeting admission is required.' });

  participant.joinedAt = participant.joinedAt || new Date();
  participant.lastSeenAt = new Date();
  await participant.save();
  await writeAudit({ meeting, actor: req.user, event: 'media_connected', req, metadata: { transport: 'webrtc' } });
  res.status(201).json({ participant: serializeParticipant(participant) });
}));

router.post('/:code/leave', requireAuth, validate(codeSchema, 'params'), asyncHandler(async (req, res) => {
  const meeting = await getMeeting(req.params.code);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found or has ended.' });
  const participant = await MeetingParticipant.findOne({ meeting: meeting._id, user: req.user._id });
  if (participant && participant.status === 'admitted') {
    const wasConnected = Boolean(participant.joinedAt);
    participant.status = 'left';
    participant.leftAt = new Date();
    await participant.save();
    await writeAudit({ meeting, actor: req.user, event: wasConnected ? 'media_disconnected' : 'participant_left', req });
  }
  res.status(204).end();
}));

router.get('/:code/participants', requireAuth, validate(codeSchema, 'params'), requireHost, asyncHandler(async (req, res) => {
  const participants = await MeetingParticipant.find({ meeting: req.meeting._id }).populate('user').sort({ requestedAt: 1 });
  res.json({ participants: participants.map(serializeParticipant) });
}));

router.patch('/:code/participants/:participantId', requireAuth, validate(codeSchema, 'params'), validate(decisionSchema), requireHost, asyncHandler(async (req, res) => {
  const participant = await MeetingParticipant.findOne({ _id: req.params.participantId, meeting: req.meeting._id }).populate('user');
  if (!participant || participant.role === 'host') return res.status(404).json({ message: 'Participant not found.' });
  participant.status = req.body.decision === 'admit' ? 'admitted' : 'denied';
  participant.admittedAt = req.body.decision === 'admit' ? new Date() : null;
  await participant.save();
  await writeAudit({ meeting: req.meeting, actor: req.user, targetUser: participant.user, event: `participant_${participant.status}`, req });
  res.json({ participant: serializeParticipant(participant) });
}));

router.delete('/:code/participants/:participantId', requireAuth, validate(codeSchema, 'params'), requireHost, asyncHandler(async (req, res) => {
  const participant = await MeetingParticipant.findOne({ _id: req.params.participantId, meeting: req.meeting._id }).populate('user');
  if (!participant || participant.role === 'host') return res.status(404).json({ message: 'Participant not found.' });
  participant.status = 'removed';
  participant.removedAt = new Date();
  await participant.save();
  await writeAudit({ meeting: req.meeting, actor: req.user, targetUser: participant.user, event: 'participant_removed', req });
  res.status(204).end();
}));

router.patch('/:code/lock', requireAuth, validate(codeSchema, 'params'), validate(lockSchema), requireHost, asyncHandler(async (req, res) => {
  req.meeting.locked = req.body.locked;
  await req.meeting.save();
  await writeAudit({ meeting: req.meeting, actor: req.user, event: req.body.locked ? 'meeting_locked' : 'meeting_unlocked', req });
  res.json({ meeting: serializeMeeting(req.meeting) });
}));

router.get('/:code/audit', requireAuth, validate(codeSchema, 'params'), requireHost, asyncHandler(async (req, res) => {
  const events = await AuditEvent.find({ meeting: req.meeting._id }).populate('actor targetUser', 'username firstName lastName').sort({ createdAt: -1 }).limit(200);
  res.json({ events: events.map((event) => ({
    id: event.id,
    event: event.event,
    createdAt: event.createdAt,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    metadata: event.metadata,
    actor: event.actor ? { id: event.actor.id, username: event.actor.username, firstName: event.actor.firstName, lastName: event.actor.lastName } : null,
    targetUser: event.targetUser ? { id: event.targetUser.id, username: event.targetUser.username, firstName: event.targetUser.firstName, lastName: event.targetUser.lastName } : null,
  })) });
}));

export default router;
