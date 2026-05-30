import { json, redirect } from 'react-router-dom';
import { clearAuthState, getAuthState, setAuthState } from '../lib/storage';
import { getCurrentUser, login as loginRequest } from '../services/authService';

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

export async function loginLoader() {
  const authState = getAuthState();
  if (!authState?.accessToken) {
    return null;
  }

  try {
    await getCurrentUser(authState.accessToken);
    return redirect('/dashboard');
  } catch {
    clearAuthState();
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
    const data = await loginRequest({
      username,
      password,
      expiresInMins: 60,
    });

    const authState = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: {
        id: data.id,
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        image: data.image,
      },
    };

    setAuthState(authState);
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
  const authState = getAuthState();
  if (!authState?.accessToken) {
    const currentPath = stripBaseFromPath(new URL(request.url).pathname);
    return redirect(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
  }

  try {
    const user = await getCurrentUser(authState.accessToken);
    return { user };
  } catch {
    clearAuthState();
    return redirect('/login');
  }
}

export function dashboardLoader() {
  return {
    generatedAt: new Date().toISOString(),
  };
}

export async function logoutAction() {
  clearAuthState();
  return redirect('/login');
}
