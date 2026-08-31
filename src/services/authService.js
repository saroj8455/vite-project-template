import api from './api';
import { setSessionAccessToken } from '../lib/storage';

export async function login(payload) {
  const { data } = await api.post('/auth/login', payload);
  setSessionAccessToken(data.accessToken);
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function verifyEmail(token) {
  const { data } = await api.post('/auth/verify-email', { token });
  return data;
}

export async function requestPasswordReset(email) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token, password) {
  const { data } = await api.post('/auth/reset-password', { token, password });
  return data;
}
