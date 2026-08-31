import { useEffect, useRef, useState } from 'react';
import {
  FiClock, FiCopy, FiLock, FiLogIn, FiMic, FiMicOff, FiPhoneOff, FiPlus, FiShield,
  FiUnlock, FiUserCheck, FiUserMinus, FiUserX, FiUsers, FiVideo, FiVideoOff,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { createMeetingSignaling } from '../services/meetingSignaling';
import { meetingService } from '../services/meetingService';

function errorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function auditEventLabel(event) {
  return event.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function MeetingPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('Class meeting');
  const [meeting, setMeeting] = useState(null);
  const [membership, setMembership] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(code));
  const [isCreating, setIsCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [peerIds, setPeerIds] = useState([]);
  const roomRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteStreamsRef = useRef(new Map());
  const isHost = membership?.role === 'host';
  const isAdmitted = membership?.status === 'admitted';

  const teardown = () => {
    roomRef.current?.leave();
    roomRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    remoteStreamsRef.current.clear();
    setRemoteStreams([]);
    setPeerIds([]);
    setIsConnected(false);
    setIsMicOn(true);
    setIsCamOn(true);
  };

  const loadParticipants = async (meetingCode) => {
    const data = await meetingService.participants(meetingCode);
    setParticipants(data.participants);
  };

  const loadAudit = async () => {
    if (!meeting?.code) return;
    setIsAuditLoading(true);
    try {
      const data = await meetingService.audit(meeting.code);
      setAuditEvents(data.events);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load meeting activity.'));
    } finally {
      setIsAuditLoading(false);
    }
  };

  const toggleAudit = async () => {
    const nextIsOpen = !isAuditOpen;
    setIsAuditOpen(nextIsOpen);
    if (nextIsOpen) await loadAudit();
  };

  useEffect(() => {
    if (!code) {
      setMeeting(null);
      setMembership(null);
      setParticipants([]);
      setIsLoading(false);
      return undefined;
    }
    let active = true;
    const refresh = async (requestAccess = false) => {
      try {
        const data = requestAccess ? await meetingService.requestJoin(code) : await meetingService.session(code);
        if (!active) return;
        setMeeting(data.meeting);
        setMembership(data.participant);
        setError('');
        if (data.participant.role === 'host') await loadParticipants(code);
        if (['denied', 'removed'].includes(data.participant.status)) {
          teardown();
          setNotice(data.participant.status === 'removed' ? 'The host removed you from this meeting.' : 'The host declined your request.');
        }
      } catch (requestError) {
        if (active) setError(errorMessage(requestError, 'Unable to load meeting access.'));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    refresh(true);
    const timer = window.setInterval(() => refresh(false), 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
      teardown();
    };
  }, [code]);

  useEffect(() => {
    const onPageHide = () => teardown();
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  const createMeeting = async (event) => {
    event.preventDefault();
    setError('');
    setIsCreating(true);
    try {
      const data = await meetingService.create(title);
      navigate(`/meeting/${data.meeting.code}`);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to create the meeting.'));
    } finally {
      setIsCreating(false);
    }
  };

  const copyMeetingLink = async () => {
    if (!meeting) return;
    const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}meeting/${meeting.code}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice('Meeting link copied. Guests will wait for your approval.');
    } catch {
      setError('Unable to copy the meeting link on this device.');
    }
  };

  const joinMedia = async () => {
    if (!meeting || !isAdmitted || isConnected) return;
    setError('');
    setIsConnecting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera and microphone are unavailable on this device.');
      if (!window.isSecureContext && window.location.hostname !== 'localhost') throw new Error('Camera access requires HTTPS.');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const room = createMeetingSignaling({
        roomCode: meeting.code,
        onPeerJoin: (peerId) => {
          setPeerIds((current) => (current.includes(peerId) ? current : [...current, peerId]));
        },
        onPeerLeave: (peerId) => {
          remoteStreamsRef.current.delete(peerId);
          setRemoteStreams(Array.from(remoteStreamsRef.current.entries()));
          setPeerIds((current) => current.filter((id) => id !== peerId));
        },
        onPeerStream: (peerStream, peerId) => {
          remoteStreamsRef.current.set(peerId, peerStream);
          setRemoteStreams(Array.from(remoteStreamsRef.current.entries()));
        },
        onError: (signalError) => setError(errorMessage(signalError, 'Meeting signaling failed.')),
      });
      roomRef.current = room;
      room.addStream(stream);
      setIsConnected(true);
      meetingService.mediaConnected(meeting.code).catch(() => {
        // Media must remain usable even if the non-critical audit request fails.
      });
    } catch (mediaError) {
      teardown();
      setError(errorMessage(mediaError, 'Unable to start camera and microphone.'));
    } finally {
      setIsConnecting(false);
    }
  };

  const leaveMeeting = async () => {
    try {
      if (meeting) await meetingService.leave(meeting.code);
    } catch {
      // Local media must still close when the server cannot be reached.
    }
    teardown();
    navigate('/meeting');
  };

  const toggleMic = () => localStreamRef.current?.getAudioTracks().forEach((track) => {
    track.enabled = !track.enabled;
    setIsMicOn(track.enabled);
  });
  const toggleCam = () => localStreamRef.current?.getVideoTracks().forEach((track) => {
    track.enabled = !track.enabled;
    setIsCamOn(track.enabled);
  });

  const decide = async (participantId, decision) => {
    try {
      await meetingService.decide(meeting.code, participantId, decision);
      await loadParticipants(meeting.code);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to update the participant.'));
    }
  };
  const removeParticipant = async (participantId) => {
    try {
      await meetingService.remove(meeting.code, participantId);
      await loadParticipants(meeting.code);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to remove the participant.'));
    }
  };
  const toggleLock = async () => {
    try {
      const data = await meetingService.lock(meeting.code, !meeting.locked);
      setMeeting(data.meeting);
      setNotice(data.meeting.locked ? 'Meeting locked. New join requests are blocked.' : 'Meeting unlocked.');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to update meeting lock.'));
    }
  };

  if (!code) return <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Secure meeting</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Create a meeting link</h1><p className="mt-2 text-sm text-slate-600">Guests use the shared link, then wait until you admit them.</p><form onSubmit={createMeeting} className="mt-6 space-y-4"><label className="block text-sm font-medium text-slate-700">Meeting title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2" required minLength="3" maxLength="120" /></label>{error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}<button type="submit" disabled={isCreating} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><FiPlus size={16} /> {isCreating ? 'Creating...' : 'Create meeting'}</button></form></section>;
  if (isLoading || !meeting || !membership) return <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading secure meeting access...</p>;
  const waiting = membership.status === 'waiting';
  const blocked = ['denied', 'removed'].includes(membership.status);
  return <section className="space-y-4"><div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{isHost ? 'Host meeting' : 'Meeting invitation'}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{meeting.title}</h1><p className="mt-1 text-sm text-slate-600">Meeting code: <span className="font-mono font-medium">{meeting.code}</span></p></div>{isHost ? <button type="button" onClick={copyMeetingLink} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><FiCopy size={16} /> Copy invite link</button> : null}</div>{waiting ? <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Waiting for host approval</p><p className="mt-1">Keep this page open. Your access status updates automatically.</p></div> : null}{blocked ? <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p className="font-semibold">Meeting access unavailable</p><p className="mt-1">{notice || 'You cannot join this meeting.'}</p></div> : null}{notice && !blocked ? <p className="mt-3 text-sm font-medium text-emerald-700">{notice}</p> : null}{error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}{isAdmitted ? <div className="mt-5 space-y-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={joinMedia} disabled={isConnecting || isConnected} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><FiLogIn size={16} /> {isConnecting ? 'Starting...' : isConnected ? 'Connected' : 'Join call'}</button><button type="button" onClick={leaveMeeting} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"><FiPhoneOff size={16} /> Leave meeting</button>{isHost ? <button type="button" onClick={toggleLock} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{meeting.locked ? <FiUnlock size={16} /> : <FiLock size={16} />}{meeting.locked ? 'Unlock meeting' : 'Lock meeting'}</button> : null}</div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={toggleMic} disabled={!isConnected} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">{isMicOn ? <FiMic size={16} /> : <FiMicOff size={16} />}{isMicOn ? 'Mute mic' : 'Unmute mic'}</button><button type="button" onClick={toggleCam} disabled={!isConnected} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">{isCamOn ? <FiVideo size={16} /> : <FiVideoOff size={16} />}{isCamOn ? 'Stop camera' : 'Start camera'}</button></div><p className="inline-flex items-center gap-1 text-xs text-slate-500"><FiUsers size={14} /> Media peers connected: {peerIds.length}</p></div> : null}</div>{isHost ? <HostPanel participants={participants} onDecision={decide} onRemove={removeParticipant} auditEvents={auditEvents} isAuditOpen={isAuditOpen} isAuditLoading={isAuditLoading} onToggleAudit={toggleAudit} /> : null}{isAdmitted ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><article className="overflow-hidden rounded-xl border border-slate-200 bg-black shadow-sm"><div className="relative aspect-video"><video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" /><span className="absolute left-2 top-2 rounded bg-slate-900/70 px-2 py-1 text-xs text-white">You</span></div></article>{remoteStreams.map(([peerId, stream]) => <RemoteVideoTile key={peerId} stream={stream} peerId={peerId} />)}</div> : null}</section>;
}

function HostPanel({ participants, onDecision, onRemove, auditEvents, isAuditOpen, isAuditLoading, onToggleAudit }) {
  const guests = participants.filter((participant) => participant.role !== 'host');
  const waitingGuests = guests.filter((participant) => participant.status === 'waiting').length;
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.5)]">
    <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Host controls</p>
        <h2 className="mt-1 inline-flex items-center gap-2 text-xl font-extrabold text-white"><FiShield className="text-teal-300" size={18} /> Waiting room</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-slate-100">{waitingGuests} awaiting review</p>
        <button type="button" onClick={onToggleAudit} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-bold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-slate-900"><FiClock size={15} /> {isAuditOpen ? 'Hide activity' : 'View activity'}</button>
      </div>
    </div>
    <div className="divide-y divide-slate-100 px-5">
      {guests.length === 0 ? <p className="py-7 text-sm font-medium text-slate-500">No guest requests yet. New guests will appear here for approval.</p> : guests.map((participant) => <div key={participant.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-bold text-slate-950">{participant.user.firstName} {participant.user.lastName}</p>
          <p className="mt-1 text-sm text-slate-500">@{participant.user.username}</p>
        </div>
        <div className="w-full sm:w-auto">
          <span className={`mb-3 flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-bold capitalize ${participant.status === 'waiting' ? 'bg-amber-100 text-amber-800' : participant.status === 'admitted' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'} mx-auto sm:ml-auto sm:mr-0`}>{participant.status}</span>
          {participant.status === 'waiting' ? <div className="grid grid-cols-2 gap-2 sm:min-w-[310px]">
            <button type="button" onClick={() => onDecision(participant.id, 'admit')} className="inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-2.5 text-xs font-bold text-white shadow-[0_8px_18px_-10px_rgba(5,150,105,0.9)] transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:px-4 sm:text-sm"><FiUserCheck size={16} /><span className="sm:hidden">Admit</span><span className="hidden sm:inline">Admit to meeting</span></button>
            <button type="button" onClick={() => onDecision(participant.id, 'deny')} className="inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-2.5 text-xs font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 sm:px-3.5 sm:text-sm"><FiUserX size={16} /> Decline</button>
          </div> : null}
          {participant.status === 'admitted' ? <button type="button" onClick={() => onRemove(participant.id)} className="ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 text-sm font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"><FiUserMinus size={16} /> Remove</button> : null}
        </div>
      </div>)}
    </div>
    {isAuditOpen ? <div className="border-t border-slate-200 bg-slate-50 px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Security trail</p><h3 className="mt-1 text-base font-extrabold text-slate-950">Meeting activity</h3></div>
        <p className="max-w-52 text-right text-xs leading-5 text-slate-500">Visible only to the host. IP data is captured from requests reaching this server.</p>
      </div>
      {isAuditLoading ? <p className="py-6 text-sm font-medium text-slate-500">Loading activity...</p> : auditEvents.length === 0 ? <p className="py-6 text-sm font-medium text-slate-500">No activity has been recorded yet.</p> : <div className="mt-4 max-h-96 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {auditEvents.map((event) => <article key={event.id} className="px-4 py-3.5">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="font-bold text-slate-900">{auditEventLabel(event.event)}</p><p className="mt-0.5 text-sm text-slate-600">{event.actor ? `${event.actor.firstName} ${event.actor.lastName} (@${event.actor.username})` : 'System'}</p></div>
            <time className="text-xs font-medium text-slate-500" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
          </div>
          <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)]"><p><span className="font-bold text-slate-600">IP:</span> {event.ipAddress || 'Unavailable'}</p><p className="truncate" title={event.userAgent || ''}><span className="font-bold text-slate-600">Browser:</span> {event.userAgent || 'Unavailable'}</p></div>
        </article>)}
      </div>}
    </div> : null}
  </section>;
}

function RemoteVideoTile({ stream, peerId }) {
  const videoRef = useRef(null);
  useEffect(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, [stream]);
  return <article className="overflow-hidden rounded-xl border border-slate-200 bg-black shadow-sm"><div className="relative aspect-video"><video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" /><span className="absolute left-2 top-2 rounded bg-slate-900/70 px-2 py-1 text-xs text-white">Participant {peerId.slice(0, 6)}</span></div></article>;
}
