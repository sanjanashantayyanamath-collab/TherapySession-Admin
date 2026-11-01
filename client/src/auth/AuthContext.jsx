import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { configureSessionExpiry, clearAccessToken, setAccessToken } from '../api/client.js';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const clearSession = useCallback((message) => {
    clearAccessToken();
    setUser(null);
    queryClient.clear();
    if (message) toast.error(message);
  }, [queryClient]);

  useEffect(() => {
    configureSessionExpiry(() => clearSession('Your session expired. Please sign in again.'));
    let active = true;
    (async () => {
      try {
        const refreshed = await authApi.refresh();
        setAccessToken(refreshed.accessToken);
        const current = await authApi.me();
        if (active) setUser(current);
      } catch {
        clearAccessToken();
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => { active = false; };
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally { clearSession(); }
  }, [clearSession]);

  const value = useMemo(() => ({ user, initializing, isAuthenticated: Boolean(user), login, logout, clearSession }), [user, initializing, login, logout, clearSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
