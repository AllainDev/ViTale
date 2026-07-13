'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export interface User {
  id: string;
  email: string;
  isRegistered: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  jwt: string | null;
  setJwt: (token: string | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  jwt: null,
  setJwt: () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [jwtState, setJwtState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const processToken = React.useCallback((token: string | null) => {
    if (!token) {
      setUser(null);
      setJwtState(null);
      return;
    }
    
    try {
      const decoded = jwtDecode<any>(token);
      const email = decoded.email || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
      const id = decoded.tid || decoded.sub || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
      
      setUser(prev => {
        if (prev && prev.id === id) return prev; // Bail out if same user
        return {
          id: id || "unknown_id",
          email: email || "",
          isRegistered: true,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id || email}`
        };
      });
      setJwtState(token);
    } catch (e) {
      console.error("Failed to decode JWT", e);
      setUser(null);
      setJwtState(null);
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('vitale_jwt');
    if (savedToken) {
      processToken(savedToken);
    }
    setIsLoading(false);
  }, [processToken]);

  const setJwt = React.useCallback((token: string | null) => {
    if (token) {
      localStorage.setItem('vitale_jwt', token);
    } else {
      localStorage.removeItem('vitale_jwt');
    }
    processToken(token);
  }, [processToken]);

  const logout = React.useCallback(() => {
    setJwt(null);
  }, [setJwt]);

  return (
    <AuthContext.Provider value={{ user, jwt: jwtState, setJwt, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
