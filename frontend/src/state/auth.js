import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { apiFetch, setToken as storeToken } from '../api/client';

const AuthContext = createContext(null);

function getStoredToken() {
  return localStorage.getItem('tastyhub_token');
}

function getStoredUser() {
  const raw = localStorage.getItem('tastyhub_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (!user) localStorage.removeItem('tastyhub_user');
  else localStorage.setItem('tastyhub_user', JSON.stringify(user));
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUserState] = useState(getStoredUser());
  const [loading, setLoading] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    storeToken(token);
    if (!token) {
      setStoredUser(null);
      setUserState(null);
    }
  }, [token]);

  useEffect(() => {
    async function loadMe() {
      if (!token) return;
      setLoading(true);
      try {
        const data = await apiFetch('/auth/me', { auth: true });
        setUserState(data.user);
        setStoredUser(data.user);
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    loadMe();
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      setUser(nextUser) {
        setUserState(nextUser);
        setStoredUser(nextUser);
      },
      establishSession(accessToken, nextUser) {
        setToken(accessToken);
        setUserState(nextUser);
        setStoredUser(nextUser);
      },
      async login(email, password) {
        const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
        setToken(data.access_token);
        setUserState(data.user);
        setStoredUser(data.user);
        return data;
      },
      async register(username, email, password) {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: { username, email, password },
        });
        return data;
      },
      async verifyEmail(verifyToken) {
        const data = await apiFetch('/auth/verify-email', { method: 'POST', body: { token: verifyToken } });
        if (data.access_token && data.user) {
          setToken(data.access_token);
          setUserState(data.user);
          setStoredUser(data.user);
        }
        return data;
      },
      async resendVerification(email) {
        return apiFetch('/auth/resend-verification', { method: 'POST', body: { email } });
      },
      logout() {
        setToken(null);
      },
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthContext не ініціалізовано');
  return ctx;
}

