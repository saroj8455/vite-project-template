import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearAuthState, getAuthState, setAuthState } from '../lib/storage';
import { getCurrentUser, login as loginRequest } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    async function bootstrapAuth() {
      const authState = getAuthState();
      if (!authState?.accessToken || !authState?.refreshToken) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(authState.accessToken);
        setUser(currentUser);
        setAccessToken(authState.accessToken);
        setRefreshToken(authState.refreshToken);
      } catch {
        clearAuthState();
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrapAuth();
  }, []);

  const login = async ({ username, password }) => {
    const data = await loginRequest({ username, password, expiresInMins: 60 });
    const nextState = {
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

    setAuthState(nextState);
    setUser(nextState.user);
    setAccessToken(nextState.accessToken);
    setRefreshToken(nextState.refreshToken);
  };

  const logout = () => {
    clearAuthState();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(user && accessToken),
      isBootstrapping,
      login,
      logout,
    }),
    [user, accessToken, refreshToken, isBootstrapping],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
