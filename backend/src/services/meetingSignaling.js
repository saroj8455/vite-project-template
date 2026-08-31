import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { env, isAllowedClientOrigin } from '../config/env.js';
import { getUserFromSessionToken } from '../middleware/auth.js';
import { Meeting } from '../models/Meeting.js';
import { MeetingParticipant } from '../models/MeetingParticipant.js';

const MAX_MESSAGE_BYTES = 16 * 1024;

function send(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

function readToken(protocolHeader) {
  if (typeof protocolHeader !== 'string') return null;
  const protocols = protocolHeader.split(',').map((value) => value.trim());
  return protocols[0] === 'meet-v1' && protocols[1] ? protocols[1] : null;
}

function isValidRoomCode(value) {
  return typeof value === 'string' && /^[a-z0-9]{3,12}(?:-[a-z0-9]{3,12}){0,3}$/i.test(value);
}

export function attachMeetingSignaling(server) {
  const rooms = new Map();
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_MESSAGE_BYTES,
    handleProtocols(protocols) {
      return protocols.has('meet-v1') ? 'meet-v1' : false;
    },
  });

  function removeFromRoom(client) {
    if (!client.roomCode) return;
    const room = rooms.get(client.roomCode);
    if (room) {
      room.delete(client.id);
      for (const peer of room.values()) send(peer.socket, { type: 'peer-left', peerId: client.id });
      if (room.size === 0) rooms.delete(client.roomCode);
    }
    client.roomCode = null;
  }

  async function joinRoom(client, roomCode) {
    if (!isValidRoomCode(roomCode)) return send(client.socket, { type: 'error', message: 'Invalid meeting code.' });
    const meeting = await Meeting.findOne({ code: roomCode, status: 'active' }).select('_id host');
    if (!meeting) return send(client.socket, { type: 'error', message: 'Meeting is unavailable.' });

    const participant = await MeetingParticipant.findOne({ meeting: meeting.id, user: client.user.id })
      .select('role status');
    const canJoin = participant && (participant.role === 'host' || participant.status === 'admitted');
    if (!canJoin) return send(client.socket, { type: 'error', message: 'Meeting admission is required.' });

    removeFromRoom(client);
    const room = rooms.get(roomCode) || new Map();
    rooms.set(roomCode, room);
    client.roomCode = roomCode;
    room.set(client.id, client);
    send(client.socket, { type: 'joined', peerId: client.id });
    for (const peer of room.values()) {
      if (peer.id !== client.id) send(peer.socket, { type: 'peer-joined', peerId: client.id });
    }
  }

  function relaySignal(client, payload) {
    if (!client.roomCode || typeof payload.targetId !== 'string' || !payload.signal) return;
    const target = rooms.get(client.roomCode)?.get(payload.targetId);
    if (target) send(target.socket, { type: 'signal', peerId: client.id, signal: payload.signal });
  }

  async function handleMessage(client, raw) {
    if (raw.length > MAX_MESSAGE_BYTES) return client.socket.close(1009, 'Message too large');
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      return send(client.socket, { type: 'error', message: 'Invalid signaling message.' });
    }

    if (payload.type === 'join') return joinRoom(client, payload.roomCode);
    if (payload.type === 'signal') return relaySignal(client, payload);
    return send(client.socket, { type: 'error', message: 'Unsupported signaling message.' });
  }

  wss.on('connection', async (socket, request) => {
    const origin = request.headers.origin;
    if (origin && !isAllowedClientOrigin(origin)) return socket.close(1008, 'Origin is not allowed');

    const token = readToken(request.headers['sec-websocket-protocol']);
    if (!token) return socket.close(1008, 'Authentication is required');

    try {
      const user = await getUserFromSessionToken(token);
      if (!user) return socket.close(1008, 'Session is invalid');
      const client = { id: randomUUID(), socket, user, roomCode: null };
      socket.on('message', (raw) => {
        void handleMessage(client, raw).catch(() => {
          send(socket, { type: 'error', message: 'Meeting signaling failed.' });
        });
      });
      socket.on('close', () => removeFromRoom(client));
      socket.on('error', () => removeFromRoom(client));
      send(socket, { type: 'ready' });
    } catch {
      socket.close(1008, 'Session is invalid');
    }
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname !== '/ws/meetings') return socket.destroy();
    wss.handleUpgrade(request, socket, head, (websocket) => wss.emit('connection', websocket, request));
  });

  return wss;
}
