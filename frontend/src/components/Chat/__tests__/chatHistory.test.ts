import {
  listSessions,
  saveSession,
  getSession,
  deleteSession,
  clearAllSessions,
  deriveTitle,
} from '../chatHistory';
import type { ChatMessage } from '@/types/chat';

const makeMsg = (id: string, role: 'user' | 'assistant', content: string): ChatMessage => ({
  id,
  role,
  content,
  timestamp: Date.now(),
});

describe('chatHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('deriveTitle', () => {
    it('returns default when no user messages', () => {
      expect(deriveTitle([])).toMatch(/cuộc trò chuyện/i);
    });

    it('returns first user message trimmed to 40 chars', () => {
      const title = deriveTitle([makeMsg('1', 'user', 'Phở nào ngon ở Hà Nội?')]);
      expect(title).toBe('Phở nào ngon ở Hà Nội?');
    });

    it('truncates long messages with ellipsis', () => {
      const long = 'A'.repeat(60);
      const title = deriveTitle([makeMsg('1', 'user', long)]);
      expect(title.length).toBe(41); // 40 chars + ellipsis
      expect(title.endsWith('…')).toBe(true);
    });

    it('collapses whitespace', () => {
      const title = deriveTitle([makeMsg('1', 'user', '  Hello    world  ')]);
      expect(title).toBe('Hello world');
    });
  });

  describe('listSessions / getSession', () => {
    it('returns empty array when nothing saved', () => {
      expect(listSessions()).toEqual([]);
    });

    it('returns saved session by id', () => {
      const s = saveSession('a', [makeMsg('1', 'user', 'Xin chào')]);
      expect(s.id).toBe('a');
      expect(s.title).toBe('Xin chào');
      expect(listSessions()).toHaveLength(1);
      expect(getSession('a')?.messages).toHaveLength(1);
    });

    it('orders newest first on save', () => {
      saveSession('a', [makeMsg('1', 'user', 'A')]);
      // Small delay so updatedAt differs
      const t = Date.now() + 100;
      jest.spyOn(Date, 'now').mockReturnValue(t);
      saveSession('b', [makeMsg('1', 'user', 'B')]);
      (Date.now as any).mockRestore?.();
      const list = listSessions();
      expect(list[0].id).toBe('b');
      expect(list[1].id).toBe('a');
    });
  });

  describe('saveSession', () => {
    it('preserves existing title when re-saving', () => {
      saveSession('a', [makeMsg('1', 'user', 'Original')], 'Custom Title');
      const updated = saveSession('a', [makeMsg('1', 'user', 'Original'), makeMsg('2', 'assistant', 'Reply')]);
      expect(updated.title).toBe('Custom Title');
    });

    it('preserves createdAt across saves', () => {
      const first = saveSession('a', [makeMsg('1', 'user', 'A')]);
      const second = saveSession('a', [makeMsg('1', 'user', 'A'), makeMsg('2', 'assistant', 'Reply')]);
      expect(second.createdAt).toBe(first.createdAt);
      expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt);
    });
  });

  describe('deleteSession', () => {
    it('removes the session from storage', () => {
      saveSession('a', [makeMsg('1', 'user', 'A')]);
      saveSession('b', [makeMsg('1', 'user', 'B')]);
      deleteSession('a');
      expect(listSessions()).toHaveLength(1);
      expect(listSessions()[0].id).toBe('b');
    });
  });

  describe('clearAllSessions', () => {
    it('removes all sessions', () => {
      saveSession('a', [makeMsg('1', 'user', 'A')]);
      saveSession('b', [makeMsg('1', 'user', 'B')]);
      clearAllSessions();
      expect(listSessions()).toEqual([]);
    });
  });

  describe('localStorage corruption', () => {
    it('returns empty index when storage has invalid JSON', () => {
      localStorage.setItem('vitale_chat_sessions_v1', 'not-json{');
      expect(listSessions()).toEqual([]);
    });

    it('returns empty index when storage has wrong shape', () => {
      localStorage.setItem('vitale_chat_sessions_v1', JSON.stringify({ wrong: 'shape' }));
      expect(listSessions()).toEqual([]);
    });
  });
});