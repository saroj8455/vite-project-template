import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCopy,
  FiExternalLink,
  FiLogIn,
  FiMic,
  FiMicOff,
  FiPhoneOff,
  FiLock,
  FiSlash,
  FiShield,
  FiUsers,
  FiVideo,
  FiVideoOff,
} from 'react-icons/fi';
import { useRouteLoaderData } from 'react-router-dom';
import { joinRoom } from 'trystero';

const APP_ID = 'react-auth-dashboard-meeting-v1';
const MEDIA_REQUEST_TIMEOUT_MS = 12000;
const JOIN_ATTEMPT_WATCHDOG_MS = 16000;

async function ensureMediaPermissionsNotBlocked() {
  if (!navigator.permissions?.query) return;

  const [cameraPermission, micPermission] = await Promise.allSettled([
    navigator.permissions.query({ name: 'camera' }),
    navigator.permissions.query({ name: 'microphone' }),
  ]);

  const cameraState = cameraPermission.status === 'fulfilled' ? cameraPermission.value.state : 'unknown';
  const micState = micPermission.status === 'fulfilled' ? micPermission.value.state : 'unknown';

  if (cameraState === 'denied' || micState === 'denied') {
    throw new Error('Camera/Microphone permission is blocked in browser settings for this site.');
  }
}

function getDefaultRoomName(username) {
  const suffix = new Date().toISOString().slice(0, 10);
  return `${username || 'guest'}-${suffix}`;
}

export default function MeetingPage() {
  const { user } = useRouteLoaderData('app');
  const defaultRoom = useMemo(() => getDefaultRoomName(user?.username), [user?.username]);

  const [roomId, setRoomId] = useState(defaultRoom);
  const [role, setRole] = useState('student');
  const [isJoining, setIsJoining] = useState(false);
  const [isJoiningAudioOnly, setIsJoiningAudioOnly] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [status, setStatus] = useState('Ready to join a class call');
  const [error, setError] = useState('');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [hostNotice, setHostNotice] = useState('');
  const [moderationNotice, setModerationNotice] = useState('');
  const [showAudioOnlyFallback, setShowAudioOnlyFallback] = useState(false);
  const [peerIds, setPeerIds] = useState([]);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomRef = useRef(null);
  const moderationActionRef = useRef(null);
  const remoteStreamsRef = useRef(new Map());
  const peerNamesRef = useRef(new Map());
  const copyTimerRef = useRef(null);
  const hostNoticeTimerRef = useRef(null);
  const moderationNoticeTimerRef = useRef(null);
  const roomLockedRef = useRef(false);
  const joinAttemptRef = useRef(0);
  const joinWatchdogRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState([]);
  const [peerNames, setPeerNames] = useState({});
  const isConnectedRef = useRef(false);

  const isTeacher = role === 'teacher';

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  const requestUserMediaWithTimeout = async (constraints, timeoutMs = MEDIA_REQUEST_TIMEOUT_MS) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Media devices are unavailable on this browser/device.');
    }

    let timerId;
    const timeoutPromise = new Promise((_, reject) => {
      timerId = window.setTimeout(() => {
        reject(new Error('Camera/Microphone permission request timed out. Please try again.'));
      }, timeoutMs);
    });

    try {
      return await Promise.race([navigator.mediaDevices.getUserMedia(constraints), timeoutPromise]);
    } finally {
      if (timerId) {
        window.clearTimeout(timerId);
      }
    }
  };

  const clearTimers = () => {
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    if (hostNoticeTimerRef.current) {
      window.clearTimeout(hostNoticeTimerRef.current);
      hostNoticeTimerRef.current = null;
    }
    if (moderationNoticeTimerRef.current) {
      window.clearTimeout(moderationNoticeTimerRef.current);
      moderationNoticeTimerRef.current = null;
    }
    if (joinWatchdogRef.current) {
      window.clearTimeout(joinWatchdogRef.current);
      joinWatchdogRef.current = null;
    }
  };

  const teardown = () => {
    if (roomRef.current) {
      roomRef.current.leave();
      roomRef.current = null;
    }
    moderationActionRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    remoteStreamsRef.current.clear();
    peerNamesRef.current.clear();
    setRemoteStreams([]);
    setPeerNames({});
    setPeerIds([]);
    setModerationNotice('');
    setIsConnected(false);
    setIsMicOn(true);
    setIsCamOn(true);
  };

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden || !isConnectedRef.current || !localStreamRef.current) return;
      localStreamRef.current.getTracks().forEach((track) => {
        track.enabled = false;
      });
      setIsMicOn(false);
      setIsCamOn(false);
      setStatus('App moved to background. Mic/camera paused for safety.');
    };

    const onPageHide = () => {
      teardown();
      clearTimers();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      teardown();
      clearTimers();
    };
  }, []);

  const joinMeeting = async () => {
    return joinMeetingWithMode('video');
  };

  const joinAudioOnly = async () => {
    return joinMeetingWithMode('audio');
  };

  const joinMeetingWithMode = async (mode) => {
    if (isConnected) return;

    setError('');
    setShowPermissionHelp(false);
    setShowAudioOnlyFallback(false);

    const attemptId = Date.now();
    joinAttemptRef.current = attemptId;

    if (mode === 'audio') {
      setIsJoiningAudioOnly(true);
    } else {
      setIsJoining(true);
    }

    joinWatchdogRef.current = window.setTimeout(() => {
      if (joinAttemptRef.current !== attemptId || isConnected) return;
      teardown();
      setStatus('Join timed out');
      setError('Meeting join took too long. Please retry or use Audio-only join.');
      setShowAudioOnlyFallback(true);
      setIsJoining(false);
      setIsJoiningAudioOnly(false);
    }, JOIN_ATTEMPT_WATCHDOG_MS);

    try {
      if (!roomId.trim()) {
        throw new Error('Please enter a room ID.');
      }

      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error('Camera access requires HTTPS on web. Please run on a secure origin.');
      }

      await ensureMediaPermissionsNotBlocked();

      teardown();
      setStatus('Requesting camera/microphone...');

      const stream =
        mode === 'audio'
          ? await requestUserMediaWithTimeout({
              audio: true,
              video: false,
            })
          : await requestUserMediaWithTimeout({
              audio: true,
              video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });

      if (joinAttemptRef.current !== attemptId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const room = joinRoom({ appId: APP_ID }, roomId.trim());
      roomRef.current = room;

      const participantAction = room.makeAction('participant');
      const moderationAction = room.makeAction('moderation');

      moderationAction.onMessage = (payload, { peerId }) => {
        if (!payload?.type) return;

        const actor = peerNamesRef.current.get(peerId) || `Host ${peerId.slice(0, 6)}`;

        if (payload.type === 'mute_all' && !isTeacher && localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
          setIsMicOn(false);
          setModerationNotice(`${actor} muted all participants.`);
        }

        if (payload.type === 'disable_cameras' && !isTeacher && localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((track) => {
            track.enabled = false;
          });
          setIsCamOn(false);
          setModerationNotice(`${actor} disabled participant cameras.`);
        }

        if (payload.type === 'lock_room') {
          roomLockedRef.current = true;
          setModerationNotice(`${actor} locked the room. New participants should not join.`);
        }

        if (moderationNoticeTimerRef.current) {
          window.clearTimeout(moderationNoticeTimerRef.current);
        }
        moderationNoticeTimerRef.current = window.setTimeout(() => {
          setModerationNotice('');
          moderationNoticeTimerRef.current = null;
        }, 3000);
      };

      participantAction.onMessage = (payload, { peerId }) => {
        if (!payload?.name) return;
        peerNamesRef.current.set(peerId, payload.name);
        setPeerNames(Object.fromEntries(peerNamesRef.current));
      };

      room.onPeerJoin = (peerId) => {
        setStatus('Peer joined the class room.');
        setPeerIds((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
        room.addStream(stream, { target: peerId });
        participantAction.send(
          {
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Guest',
          },
          { target: peerId },
        );
      };

      room.onPeerLeave = (peerId) => {
        setPeerIds((prev) => prev.filter((id) => id !== peerId));
        remoteStreamsRef.current.delete(peerId);
        peerNamesRef.current.delete(peerId);
        setPeerNames(Object.fromEntries(peerNamesRef.current));
        setRemoteStreams(Array.from(remoteStreamsRef.current.entries()));
        setStatus('A participant left the room.');
      };

      room.onPeerStream = (peerStream, peerId) => {
        remoteStreamsRef.current.set(peerId, peerStream);
        setRemoteStreams(Array.from(remoteStreamsRef.current.entries()));
      };

      room.addStream(stream);
      participantAction.send({
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Guest',
      });

      setStatus(
        mode === 'audio'
          ? 'Connected (audio only). Share this Room ID with class participants.'
          : 'Connected. Share this Room ID with class participants.',
      );
      setIsConnected(true);

      // Save action for host controls while connected.
      moderationActionRef.current = moderationAction;
    } catch (err) {
      if (joinAttemptRef.current !== attemptId) {
        return;
      }
      teardown();
      if (mode === 'video' && (err?.name === 'NotAllowedError' || err?.name === 'NotReadableError')) {
        setShowAudioOnlyFallback(true);
      }
      if (err?.name === 'NotAllowedError') {
        setError('Camera/Microphone access was denied. Please allow permissions and try again.');
        setShowPermissionHelp(true);
      } else if (err?.name === 'NotFoundError') {
        setError('No camera or microphone was found on this device.');
      } else if (err?.name === 'NotReadableError') {
        setError('Camera or microphone is currently in use by another app.');
        setShowPermissionHelp(true);
      } else if (err?.name === 'AbortError') {
        setError('Media startup was interrupted. Please retry joining.');
      } else {
        setError(err?.message || 'Unable to join the meeting.');
        if ((err?.message || '').toLowerCase().includes('permission')) {
          setShowPermissionHelp(true);
        }
      }
      setStatus('Join failed');
    } finally {
      if (joinWatchdogRef.current) {
        window.clearTimeout(joinWatchdogRef.current);
        joinWatchdogRef.current = null;
      }
      setIsJoining(false);
      setIsJoiningAudioOnly(false);
    }
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId.trim());
      setCopyStatus('Room ID copied successfully.');
    } catch {
      setCopyStatus('Unable to copy room ID on this device.');
    }

    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopyStatus('');
      copyTimerRef.current = null;
    }, 1500);
  };

  const leaveMeeting = () => {
    teardown();
    setStatus('You left the meeting');
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = !track.enabled;
      setIsMicOn(track.enabled);
    });
  };

  const toggleCam = () => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = !track.enabled;
      setIsCamOn(track.enabled);
    });
  };

  const hostActionStub = (actionLabel) => {
    if (!isTeacher || !moderationActionRef.current) return;

    const actionTypeMap = {
      'Mute all participants': 'mute_all',
      'Disable all cameras': 'disable_cameras',
      'Lock room': 'lock_room',
    };

    const actionType = actionTypeMap[actionLabel];
    moderationActionRef.current.send({ type: actionType, issuedAt: Date.now() });
    setHostNotice(`${actionLabel} command broadcasted to participants.`);
    if (hostNoticeTimerRef.current) {
      window.clearTimeout(hostNoticeTimerRef.current);
    }
    hostNoticeTimerRef.current = window.setTimeout(() => {
      setHostNotice('');
      hostNoticeTimerRef.current = null;
    }, 2000);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Video Meeting Room</h1>
        <p className="mt-2 text-sm text-slate-600">Authenticated users can join the same room ID and connect over WebRTC.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Room ID
            <input
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2"
              placeholder="Enter room id"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Role
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-blue-500 focus:ring-2"
              disabled={isConnected}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={joinMeeting}
            disabled={isJoining || isJoiningAudioOnly || isConnected}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiLogIn size={16} /> {isJoining ? 'Joining...' : 'Join Meeting'}
          </button>
          <button
            type="button"
            onClick={copyRoomId}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FiCopy size={16} /> Copy Room ID
          </button>
          <button
            type="button"
            onClick={leaveMeeting}
            disabled={!isConnected}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiPhoneOff size={16} /> Leave
          </button>
        </div>

        {showAudioOnlyFallback && !isConnected ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-900">
              Video join failed. You can continue with microphone-only mode for this class.
            </p>
            <button
              type="button"
              onClick={joinAudioOnly}
              disabled={isJoiningAudioOnly || isJoining || isConnected}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiMic size={14} /> {isJoiningAudioOnly ? 'Joining Audio...' : 'Join Audio Only'}
            </button>
          </div>
        ) : null}

        {copyStatus ? <p className="mt-2 text-xs font-medium text-emerald-700">{copyStatus}</p> : null}

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-medium">Status: {status}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
            <FiUsers size={14} /> Peers connected: {peerIds.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Active role: {role === 'teacher' ? 'Teacher (Host)' : 'Student'}</p>
          {moderationNotice ? <p className="mt-2 text-xs font-semibold text-amber-700">{moderationNotice}</p> : null}
          {error ? <p className="mt-2 text-sm font-medium text-rose-600">{error}</p> : null}
          {showPermissionHelp ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">How to enable camera and microphone</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>Click the lock icon near the browser address bar.</li>
                <li>Set Camera and Microphone permissions to Allow.</li>
                <li>Reload this page and click Join Meeting again.</li>
              </ol>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                <FiExternalLink size={12} /> Reload After Permission Update
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={toggleMic}
            disabled={!isConnected}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isMicOn ? <FiMic size={16} /> : <FiMicOff size={16} />} {isMicOn ? 'Mute Mic' : 'Unmute Mic'}
          </button>
          <button
            type="button"
            onClick={toggleCam}
            disabled={!isConnected}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCamOn ? <FiVideo size={16} /> : <FiVideoOff size={16} />} {isCamOn ? 'Stop Camera' : 'Start Camera'}
          </button>
        </div>
      </div>

      {isTeacher ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
          <h2 className="inline-flex items-center gap-2 text-base font-bold text-amber-900">
            <FiShield size={16} /> Host Controls (Scaffold)
          </h2>
          <p className="mt-1 text-xs text-amber-800">Connect these controls to backend moderation endpoints.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => hostActionStub('Mute all participants')}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              <FiMicOff size={16} /> Mute All
            </button>
            <button
              type="button"
              onClick={() => hostActionStub('Disable all cameras')}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              <FiSlash size={16} /> Disable Cameras
            </button>
            <button
              type="button"
              onClick={() => hostActionStub('Lock room')}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              <FiLock size={16} /> Lock Room
            </button>
          </div>
          {hostNotice ? <p className="mt-3 text-xs font-semibold text-amber-900">{hostNotice}</p> : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-black shadow-sm">
          <div className="relative aspect-video">
            <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 rounded bg-slate-900/70 px-2 py-1 text-xs text-white">You</span>
          </div>
        </article>

        {remoteStreams.map(([peerId, stream]) => (
          <article key={peerId} className="overflow-hidden rounded-xl border border-slate-200 bg-black shadow-sm">
            <RemoteVideoTile peerId={peerId} peerName={peerNames[peerId]} stream={stream} />
          </article>
        ))}
      </div>
    </section>
  );
}

function RemoteVideoTile({ peerId, peerName, stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
      <span className="absolute left-2 top-2 rounded bg-slate-900/70 px-2 py-1 text-xs text-white">
        {peerName || `Peer ${peerId.slice(0, 8)}`}
      </span>
    </div>
  );
}
