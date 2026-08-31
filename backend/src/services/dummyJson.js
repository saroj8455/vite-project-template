import { env } from '../config/env.js';

async function request(path, options = {}) {
  const response = await fetch(`${env.dummyJsonApiUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'DummyJSON authentication failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export function listDummyJsonUsers(limit = 10) {
  return request(`/users?limit=${limit}`);
}
