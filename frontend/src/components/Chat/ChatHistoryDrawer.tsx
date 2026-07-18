'use client';
import { useEffect, useRef } from 'react';
import { Plus, Trash2, MessageSquare, X } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import type { StoredSession } from './chatHistory';

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTimestamp(ts: number, lang: 'vi' | 'en' = 'vi'): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  const time = d.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  if (diffMin < 1) return lang === 'vi' ? 'Vừa xong' : 'Just now';
  if (diffMin < 60) return lang === 'vi' ? `${diffMin} phút trước` : `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function ChatHistoryDrawer({ isOpen, onClose }: ChatHistoryDrawerProps) {
  const { language, sessions, loadSession, removeSessionById, startNewChat, sessionId } = useChat();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Focus close button when drawer opens (a11y)
  useEffect(() => {
    if (isOpen) {
      // Small delay so the slide-in animation has time to start
      const t = setTimeout(() => closeBtnRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSelect = (s: StoredSession) => {
    loadSession(s.id);
    onClose();
  };

  const handleNew = () => {
    startNewChat();
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeSessionById(id);
  };

  const newLabel = language === 'vi' ? 'Cuộc trò chuyện mới' : 'New chat';
  const emptyLabel = language === 'vi'
    ? 'Chưa có cuộc trò chuyện nào. Hãy bắt đầu!'
    : 'No conversations yet. Start one!';
  const titleLabel = language === 'vi' ? 'Lịch sử trò chuyện' : 'Chat history';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ' +
          (isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')
        }
      />

      {/* Drawer: w-full on mobile (max-w-sm), w-80 on desktop, slides from left */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-label={titleLabel}
        aria-modal="true"
        className={
          'fixed top-0 left-0 z-50 h-full w-full sm:w-80 sm:max-w-[85vw] ' +
          'bg-stone-50 dark:bg-stone-900 ' +
          'border-r border-stone-200 dark:border-stone-700 ' +
          'shadow-2xl ' +
          'transition-transform duration-300 ease-out ' +
          'flex flex-col ' +
          (isOpen ? 'translate-x-0' : '-translate-x-full')
        }
      >
        {/* Header */}
        <header className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-stone-700">
          <h2 className="font-serif text-base sm:text-lg font-bold text-stone-800 dark:text-gray-100">
            {titleLabel}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label={language === 'vi' ? 'Đóng' : 'Close'}
            className="w-9 h-9 rounded-full flex items-center justify-center
                       text-stone-600 dark:text-gray-300
                       hover:bg-stone-200 dark:hover:bg-stone-800
                       transition-colors touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* New chat button */}
        <div className="p-3 border-b border-stone-200 dark:border-stone-700">
          <button
            onClick={handleNew}
            className="w-full flex items-center justify-center gap-2
                       py-2.5 px-4 rounded-xl
                       bg-[var(--color-mai-silk)] hover:bg-[var(--color-mai-silk)]/90
                       text-white font-medium text-sm
                       shadow-sm transition-all active:scale-[0.98] touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            {newLabel}
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-2">
              <MessageSquare className="w-10 h-10 text-stone-300 dark:text-stone-600" />
              <p className="text-sm text-stone-500 dark:text-gray-400">{emptyLabel}</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {sessions.map((s) => {
                const isActive = s.id === sessionId;
                return (
                  <li key={s.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelect(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(s);
                        }
                      }}
                      className={
                        'group w-full text-left p-3 rounded-xl cursor-pointer ' +
                        'transition-colors touch-manipulation focus:outline-none ' +
                        'focus:ring-2 focus:ring-[var(--color-mai-silk)]/40 ' +
                        (isActive
                          ? 'bg-[var(--color-mai-silk)]/15 border border-[var(--color-mai-silk)]/40'
                          : 'hover:bg-stone-200/60 dark:hover:bg-stone-800/60 border border-transparent')
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={
                            'font-medium text-sm truncate ' +
                            (isActive
                              ? 'text-[var(--color-mai-silk)]'
                              : 'text-stone-800 dark:text-gray-100')
                          }>
                            {s.title}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                            {s.messages.length} {language === 'vi' ? 'tin nhắn' : 'msgs'} · {formatTimestamp(s.updatedAt, language)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, s.id)}
                          aria-label={language === 'vi' ? 'Xoá' : 'Delete'}
                          className="opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100
                                     w-7 h-7 rounded-full flex items-center justify-center
                                     text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                                     transition-all touch-manipulation shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}