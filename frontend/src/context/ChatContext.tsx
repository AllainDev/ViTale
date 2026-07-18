'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ChatMessage, Language } from '@/types/chat';
import {
  listSessions,
  saveSession as persistSession,
  deleteSession as removeSession,
  type StoredSession,
} from '@/components/Chat/chatHistory';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
const STORAGE_LANG = 'vitale_chat_lang';
const STORAGE_SESSION = 'vitale_chat_session_id';

interface ChatContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  gps: { lat: number; lon: number } | null;
  requestGps: () => Promise<void>;
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionId: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  /** Local list of past sessions (newest first). */
  sessions: StoredSession[];
  refreshSessions: () => void;
  loadSession: (id: string) => boolean;
  removeSessionById: (id: string) => void;
  startNewChat: () => void;
}

const ChatContext = createContext<ChatContextValue>({
  language: 'vi',
  setLanguage: () => {},
  gps: null,
  requestGps: async () => {},
  messages: [],
  isStreaming: false,
  sessionId: null,
  sendMessage: async () => {},
  clearChat: () => {},
  sessions: [],
  refreshSessions: () => {},
  loadSession: () => false,
  removeSessionById: () => {},
  startNewChat: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('vi');
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  const refreshSessions = useCallback(() => {
    setSessions(listSessions());
  }, []);

  // Load persisted language + session on mount
  useEffect(() => {
    const savedLang = localStorage.getItem(STORAGE_LANG) as Language | null;
    if (savedLang === 'vi' || savedLang === 'en') setLanguageState(savedLang);

    const savedSession = localStorage.getItem(STORAGE_SESSION);
    if (savedSession) {
      setSessionId(savedSession);
      hydrateSession(savedSession);
    }

    refreshSessions();
  }, [refreshSessions]);

  // Auto-save current session to local history whenever messages change
  useEffect(() => {
    if (!sessionId || messages.length === 0) return;
    persistSession(sessionId, messages);
    refreshSessions();
  }, [messages, sessionId, refreshSessions]);

  // Hydrate session messages from backend
  const hydrateSession = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`${API_BASE}/chat/sessions/${sid}/messages`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      const loaded: ChatMessage[] = (data.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.createdAt).getTime(),
      }));
      setMessages(loaded);
    } catch (err) {
      console.warn('Failed to hydrate session', err);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_LANG, lang);
    // Only reset session so next message is sent in the new language.
    // Messages remain visible so the user doesn't lose the conversation.
    setSessionId(null);
    localStorage.removeItem(STORAGE_SESSION);
  }, []);

  const requestGps = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported');
      return;
    }
    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          resolve();
        },
        (err) => { console.warn('GPS denied', err); resolve(); },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    try {
      const res = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: text,
          sessionId: sessionId ?? undefined,
          language,
          gpsLat: gps?.lat,
          gpsLon: gps?.lon,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message ?? data.content ?? '',
        tags: data.action ? data.action.split(',') : (data.tags ?? []),
        toolCalls: data.toolCalls,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem(STORAGE_SESSION, data.sessionId);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: language === 'vi'
          ? 'Xin lỗi, kết nối đang gián đoạn. Vui lòng thử lại.'
          : 'Sorry, connection interrupted. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
    }
  }, [language, gps, sessionId, isStreaming]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(STORAGE_SESSION);
  }, []);

  /** Load a session by id from local history; returns true if found. */
  const loadSession = useCallback((id: string): boolean => {
    const stored = listSessions().find((s) => s.id === id);
    if (!stored) return false;
    setMessages(stored.messages);
    setSessionId(stored.id);
    localStorage.setItem(STORAGE_SESSION, stored.id);
    return true;
  }, []);

  /** Delete a session from local history (does not affect current messages). */
  const removeSessionById = useCallback((id: string) => {
    removeSession(id);
    refreshSessions();
  }, [refreshSessions]);

  /** Start a brand-new chat — clears messages + session. */
  const startNewChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(STORAGE_SESSION);
  }, []);

  return (
    <ChatContext.Provider value={{
      language, setLanguage, gps, requestGps,
      messages, isStreaming, sessionId, sendMessage, clearChat,
      sessions, refreshSessions, loadSession, removeSessionById, startNewChat,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);