import axios from 'axios';

const authApi = axios.create({
  baseURL: 'https://dummyjson.com/auth',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
});

export async function login(payload) {
  const { data } = await authApi.post('/login', payload);
  return data;
}

export async function getCurrentUser(accessToken) {
  const { data } = await authApi.get('/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return data;
}

export async function refreshSession(refreshToken, expiresInMins = 60) {
  const { data } = await authApi.post('/refresh', {
    refreshToken,
    expiresInMins,
  });
  return data;
}
