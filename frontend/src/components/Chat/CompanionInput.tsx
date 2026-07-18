'use client';
import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useChat } from '@/context/ChatContext';

interface CompanionInputProps {
  onSend: (text: string) => void;
  /** When provided, input auto-fills (used for voice transcript). */
  initialValue?: string;
}

export function CompanionInput({ onSend, initialValue = '' }: CompanionInputProps) {
  const { isStreaming, language } = useChat();
  const [text, setText] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value (e.g., voice transcript) into local state
  useEffect(() => {
    if (initialValue) {
      setText(initialValue);
      inputRef.current?.focus();
    }
  }, [initialValue]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholder = language === 'vi'
    ? 'Hỏi Mai về Hà Nội...'
    : 'Ask Mai about Hanoi...';
  const sendLabel = language === 'vi' ? 'Gửi' : 'Send';

  return (
    <div className="w-full px-3 sm:px-4 pb-3 pt-2 z-30
                    bg-black/20 dark:bg-white/5
                    backdrop-blur-xl
                    border-t border-white/10">
      <div className="flex items-center gap-2 max-w-3xl mx-auto">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isStreaming}
          aria-label="Chat input"
          className="flex-1 px-4 py-3 rounded-full
                     bg-white/10 dark:bg-white/5
                     border border-white/20
                     text-stone-800 dark:text-gray-100
                     placeholder:text-stone-400 dark:placeholder:text-gray-500
                     focus:outline-none focus:border-[var(--color-mai-silk)]/60
                     disabled:opacity-50 transition-colors text-sm"
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !text.trim()}
          aria-label={sendLabel}
          className="w-11 h-11 rounded-full
                     bg-[var(--color-mai-silk)] hover:bg-[var(--color-mai-silk)]/90
                     disabled:opacity-30 disabled:cursor-not-allowed
                     text-white flex items-center justify-center
                     shadow-md transition-all active:scale-95 touch-manipulation"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}