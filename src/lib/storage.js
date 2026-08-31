const AUTH_STORAGE_KEY = 'auth_state_v1';
const SESSION_ACCESS_TOKEN_KEY = 'meet_access_token_v1';

export function getAuthState() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthState(authState) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
}

export function clearAuthState() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_ACCESS_TOKEN_KEY);
}

export function getSessionAccessToken() {
  return sessionStorage.getItem(SESSION_ACCESS_TOKEN_KEY);
}

export function setSessionAccessToken(accessToken) {
  if (accessToken) sessionStorage.setItem(SESSION_ACCESS_TOKEN_KEY, accessToken);
}
