import { getSessionAccessToken } from '../lib/storage';

function getSignalingUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  const apiUrl = new URL(apiBase, window.location.origin);
  const apiPrefix = apiUrl.pathname.replace(/\/api\/?$/, '');
  const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${apiUrl.host}${apiPrefix}/ws/meetings`;
}

function getIceServers() {
  const configuredServers = import.meta.env.VITE_ICE_SERVERS;
  if (!configuredServers) return [{ urls: 'stun:stun.l.google.com:19302' }];
  try {
    const servers = JSON.parse(configuredServers);
    return Array.isArray(servers) ? servers : [{ urls: 'stun:stun.l.google.com:19302' }];
  } catch {
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  }
}

export function createMeetingSignaling({ roomCode, onPeerJoin, onPeerLeave, onPeerStream, onError }) {
  const accessToken = getSessionAccessToken();
  if (!accessToken) throw new Error('Sign in again before joining the call.');

  const peers = new Map();
  const pendingCandidates = new Map();
  let localStream = null;
  let isClosed = false;
  const socket = new WebSocket(getSignalingUrl(), ['meet-v1', accessToken]);

  function send(payload) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }

  function closePeer(peerId) {
    const peer = peers.get(peerId);
    if (!peer) return;
    peers.delete(peerId);
    pendingCandidates.delete(peerId);
    peer.close();
    onPeerLeave?.(peerId);
  }

  async function flushCandidates(peerId) {
    const peer = peers.get(peerId);
    const candidates = pendingCandidates.get(peerId) || [];
    pendingCandidates.delete(peerId);
    for (const candidate of candidates) await peer.addIceCandidate(candidate);
  }

  function ensurePeer(peerId) {
    if (peers.has(peerId)) return peers.get(peerId);
    const peer = new RTCPeerConnection({ iceServers: getIceServers() });
    peers.set(peerId, peer);
    if (localStream) localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) send({ type: 'signal', targetId: peerId, signal: { type: 'candidate', candidate } });
    };
    peer.ontrack = ({ streams }) => {
      if (streams[0]) onPeerStream?.(streams[0], peerId);
    };
    peer.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(peer.connectionState)) closePeer(peerId);
    };
    return peer;
  }

  async function createOffer(peerId) {
    const peer = ensurePeer(peerId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    send({ type: 'signal', targetId: peerId, signal: { type: 'offer', description: peer.localDescription } });
  }

  async function receiveSignal(peerId, signal) {
    const peer = ensurePeer(peerId);
    if (signal.type === 'candidate') {
      if (peer.remoteDescription) await peer.addIceCandidate(signal.candidate);
      else pendingCandidates.set(peerId, [...(pendingCandidates.get(peerId) || []), signal.candidate]);
      return;
    }
    if (signal.type === 'offer') {
      await peer.setRemoteDescription(signal.description);
      await flushCandidates(peerId);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      send({ type: 'signal', targetId: peerId, signal: { type: 'answer', description: peer.localDescription } });
      return;
    }
    if (signal.type === 'answer') {
      await peer.setRemoteDescription(signal.description);
      await flushCandidates(peerId);
    }
  }

  socket.addEventListener('message', ({ data }) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'ready') {
        send({ type: 'join', roomCode });
      } else if (message.type === 'peer-joined') {
        onPeerJoin?.(message.peerId);
        void createOffer(message.peerId).catch((error) => onError?.(error));
      } else if (message.type === 'peer-left') {
        closePeer(message.peerId);
      } else if (message.type === 'signal') {
        void receiveSignal(message.peerId, message.signal).catch((error) => onError?.(error));
      } else if (message.type === 'error') {
        onError?.(new Error(message.message));
      }
    } catch {
      onError?.(new Error('Invalid signaling response.'));
    }
  });
  socket.addEventListener('error', () => onError?.(new Error('Meeting signaling connection failed.')));
  socket.addEventListener('close', ({ code }) => {
    if (!isClosed && code !== 1000) onError?.(new Error('Meeting signaling connection closed.'));
  });

  return {
    addStream(stream) {
      localStream = stream;
    },
    leave() {
      isClosed = true;
      for (const peerId of peers.keys()) closePeer(peerId);
      if (socket.readyState < WebSocket.CLOSING) socket.close(1000, 'Leaving meeting');
    },
  };
}
