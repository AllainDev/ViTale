'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  isRegistered: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  /**
   * @deprecated Storing the JWT in component state forces the client to manage it,
   * which conflicts with the HttpOnly cookie strategy. Use `isAuthenticated`
   * and the `/auth/profile` endpoint instead. This setter is kept only for
   * backward compatibility with existing call sites; the value is NOT used
   * to attach the Authorization header — the HttpOnly cookie does that.
   */
  jwt: string | null;
  setJwt: (token: string | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  jwt: null,
  isAuthenticated: false,
  setJwt: () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // OWASP A02 + A07: NEVER store JWT in localStorage/sessionStorage. The server
  // sets an HttpOnly `vitale_jwt` cookie on successful login/refresh, and
  // `fetch(..., { credentials: 'include' })` sends it automatically.
  //
  // The user profile is resolved via `GET /auth/profile` which reads the cookie.
  // We only need to know "am I logged in?" in the UI — that boolean comes from
  // whether `/auth/profile` returns 200.
  const refreshProfile = React.useCallback(async (overrideToken?: string | null) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
      const baseUrl = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
      
      const token = overrideToken !== undefined ? overrideToken : (typeof window !== 'undefined' ? localStorage.getItem('vitale_jwt') : null);
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const res = await fetch(
        `${baseUrl}/auth/profile`,
        { credentials: 'include', cache: 'no-store', headers }
      );
      if (!res.ok) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      const avatarSeed = data.email || data.fullName || data.id || 'anonymous';
      setUser({
        id: data.id ?? 'unknown_id',
        email: data.email || 'Khách',
        isRegistered: data.isRegistered ?? false,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`,
      });
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setIsLoading(false));
  }, [refreshProfile]);

  const setJwt = React.useCallback((_token: string | null) => {
    if (typeof window !== 'undefined') {
      if (_token) {
        localStorage.setItem('vitale_jwt', _token);
      } else {
        localStorage.removeItem('vitale_jwt');
      }
    }
    // The server already wrote/cleared the HttpOnly cookie; we just need to
    // re-fetch the profile to update UI state.
    refreshProfile(_token);
  }, [refreshProfile]);

  const logout = React.useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
      const baseUrl = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('vitale_jwt') : null;
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Call logout endpoint (server clears the HttpOnly cookie).
      await fetch(
        `${baseUrl}/auth/logout`,
        { method: 'POST', credentials: 'include', headers }
      );
    } catch {
      // Ignore network errors during logout — we still want to clear local state.
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vitale_jwt');
    }
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, jwt: null, setJwt, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
