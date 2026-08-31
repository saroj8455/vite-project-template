import axios from 'axios';
import { getSessionAccessToken } from '../lib/storage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const accessToken = getSessionAccessToken();
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export default api;
