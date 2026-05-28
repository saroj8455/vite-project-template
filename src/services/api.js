import axios from 'axios';
import { getAuthState, setAuthState, clearAuthState } from '../lib/storage';
import { refreshSession } from './authService';

const api = axios.create({
  baseURL: 'https://dummyjson.com',
  timeout: 15000,
  withCredentials: true,
});

let isRefreshing = false;
let pendingRequests = [];

function resolvePending(error, accessToken = null) {
  pendingRequests.forEach((request) => {
    if (error) {
      request.reject(error);
      return;
    }
    request.resolve(accessToken);
  });
  pendingRequests = [];
}

api.interceptors.request.use((config) => {
  const authState = getAuthState();
  if (authState?.accessToken) {
    config.headers.Authorization = `Bearer ${authState.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const authState = getAuthState();
    if (!authState?.refreshToken) {
      clearAuthState();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshed = await refreshSession(authState.refreshToken);
      const nextState = {
        ...authState,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? authState.refreshToken,
      };
      setAuthState(nextState);
      resolvePending(null, nextState.accessToken);

      originalRequest.headers.Authorization = `Bearer ${nextState.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      resolvePending(refreshError, null);
      clearAuthState();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
