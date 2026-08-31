import api from './api';

function unwrap(request) {
  return request.then(({ data }) => data);
}

export const meetingService = {
  create: (title) => unwrap(api.post('/meetings', { title })),
  get: (code) => unwrap(api.get(`/meetings/${code}`)),
  requestJoin: (code) => unwrap(api.post(`/meetings/${code}/join-requests`)),
  session: (code) => unwrap(api.get(`/meetings/${code}/session`)),
  mediaConnected: (code) => unwrap(api.post(`/meetings/${code}/media-sessions`)),
  leave: (code) => unwrap(api.post(`/meetings/${code}/leave`)),
  participants: (code) => unwrap(api.get(`/meetings/${code}/participants`)),
  decide: (code, participantId, decision) => unwrap(api.patch(`/meetings/${code}/participants/${participantId}`, { decision })),
  remove: (code, participantId) => unwrap(api.delete(`/meetings/${code}/participants/${participantId}`)),
  lock: (code, locked) => unwrap(api.patch(`/meetings/${code}/lock`, { locked })),
  audit: (code) => unwrap(api.get(`/meetings/${code}/audit`)),
};
