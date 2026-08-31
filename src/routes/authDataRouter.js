import { json, redirect } from 'react-router-dom';
import { clearAuthState } from '../lib/storage';
import { getCurrentUser, login as loginRequest, logout } from '../services/authService';

const APP_BASE = import.meta.env.BASE_URL || '/';

function stripBaseFromPath(pathname) {
  if (!pathname || APP_BASE === '/') return pathname || '/';

  const normalizedBase = APP_BASE.endsWith('/') ? APP_BASE.slice(0, -1) : APP_BASE;
  if (pathname === normalizedBase) return '/';
  if (pathname.startsWith(`${normalizedBase}/`)) {
    return pathname.slice(normalizedBase.length) || '/';
  }
  return pathname;
}

function normalizeRedirectTo(value) {
  if (typeof value !== 'string') return '/dashboard';
  let next = value;

  if (!next.startsWith('/')) return '/dashboard';
  if (next.startsWith('//')) return '/dashboard';

  next = stripBaseFromPath(next);
  return next || '/dashboard';
}

export async function loginLoader({ request }) {
  try {
    await getCurrentUser();
    const redirectTo = normalizeRedirectTo(new URL(request.url).searchParams.get('redirectTo'));
    return redirect(redirectTo);
  } catch {
    return null;
  }
}

export async function loginAction({ request }) {
  const formData = await request.formData();
  const username = formData.get('username');
  const password = formData.get('password');
  const redirectTo = normalizeRedirectTo(formData.get('redirectTo'));

  if (!username || !password) {
    return json({ error: 'Username and password are required.' }, { status: 400 });
  }

  try {
    await loginRequest({
      username,
      password,
    });
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('login_success_notice', '1');
    }
    return redirect(redirectTo);
  } catch (error) {
    return json(
      { error: error.response?.data?.message || 'Unable to login. Please verify credentials.' },
      { status: 401 },
    );
  }
}

export async function protectedLoader({ request }) {
  try {
    const user = await getCurrentUser();
    return { user };
  } catch {
    clearAuthState();
    const url = new URL(request.url);
    const currentPath = `${stripBaseFromPath(url.pathname)}${url.search}`;
    return redirect(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
  }
}

export function dashboardLoader() {
  return {
    generatedAt: new Date().toISOString(),
  };
}

export async function logoutAction() {
  try {
    await logout();
  } catch {
    // The client should still complete logout when an expired cookie is rejected.
  }
  clearAuthState();
  return redirect('/login');
}
