/**
 * Chat session history — localStorage-based persistence.
 *
 * Sessions are saved client-side so the user can browse/load past
 * conversations from the hamburger drawer. This is a lightweight MVP —
 * when a backend GET /chat/sessions endpoint exists, swap these helpers
 * for the API calls without changing the drawer's contract.
 */

import type { ChatMessage } from '@/types/chat';

const STORAGE_KEY = 'vitale_chat_sessions_v1';

export interface StoredSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface SessionsById {
  [id: string]: StoredSession;
}

interface StoredIndex {
  byId: SessionsById;
  order: string[]; // ordered by updatedAt desc (newest first)
}

function read(): StoredIndex {
  if (typeof window === 'undefined') return { byId: {}, order: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { byId: {}, order: [] };
    const parsed = JSON.parse(raw) as StoredIndex;
    if (!parsed || typeof parsed !== 'object' || !parsed.byId || !Array.isArray(parsed.order)) {
      return { byId: {}, order: [] };
    }
    return parsed;
  } catch {
    return { byId: {}, order: [] };
  }
}

function write(idx: StoredIndex): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(idx));
  } catch (err) {
    console.warn('[chatHistory] failed to write storage', err);
  }
}

/** Auto-derive a title from the first user message (first 40 chars). */
export function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'Cuộc trò chuyện mới';
  const trimmed = first.content.trim().replace(/\s+/g, ' ');
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

export function listSessions(): StoredSession[] {
  const idx = read();
  return idx.order
    .map((id) => idx.byId[id])
    .filter((s): s is StoredSession => Boolean(s));
}

export function getSession(id: string): StoredSession | null {
  return read().byId[id] ?? null;
}

export function saveSession(
  id: string,
  messages: ChatMessage[],
  existingTitle?: string
): StoredSession {
  const idx = read();
  const now = Date.now();
  const prev = idx.byId[id];
  const title = existingTitle ?? prev?.title ?? deriveTitle(messages);
  const createdAt = prev?.createdAt ?? now;
  const session: StoredSession = { id, title, messages, createdAt, updatedAt: now };

  idx.byId[id] = session;
  // Re-insert at top of order
  idx.order = [id, ...idx.order.filter((x) => x !== id)];
  write(idx);
  return session;
}

export function deleteSession(id: string): void {
  const idx = read();
  delete idx.byId[id];
  idx.order = idx.order.filter((x) => x !== id);
  write(idx);
}

export function clearAllSessions(): void {
  write({ byId: {}, order: [] });
}