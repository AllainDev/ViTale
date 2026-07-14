'use client';
import { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { Mic, Send, MapPin } from 'lucide-react';

export function VoiceInput() {
  const { sendMessage, isStreaming, language, requestGps, gps, clearChat } = useChat();
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isStreaming) return;
    sendMessage(text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 md:px-6 pb-3 pt-2">
      <div className="max-w-3xl mx-auto">
        {/* Light glass input bar — white translucent, vertical-centered content */}
        <div className="flex items-center gap-1.5 p-2
                        bg-white/85 dark:bg-white/10
                        backdrop-blur-xl
                        border border-stone-200 dark:border-white/15
                        rounded-3xl
                        shadow-[0_4px_24px_rgba(0,0,0,0.08)]
                        dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]
                        focus-within:border-[var(--color-mai-silk)]/60
                        focus-within:shadow-[0_4px_32px_rgba(215,95,78,0.15)]
                        transition-all min-h-[56px]">

          <button
            type="button"
            onClick={requestGps}
            aria-label={language === 'vi' ? 'Bật vị trí' : 'Enable location'}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              gps
                ? 'bg-[var(--color-mai-leaf)]/20 text-[var(--color-mai-leaf)]'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
            }`}
          >
            <MapPin className="w-5 h-5" />
          </button>

          <button
            type="button"
            disabled
            aria-label={language === 'vi' ? 'Voice (sắp ra mắt)' : 'Voice (coming soon)'}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                       text-stone-300 dark:text-stone-600
                       cursor-not-allowed hover:bg-stone-50 dark:hover:bg-white/5"
          >
            <Mic className="w-5 h-5" />
          </button>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={language === 'vi' ? 'Hỏi Mai về Hà Nội...' : 'Ask Mai about Hanoi...'}
            rows={1}
            className="flex-1 resize-none bg-transparent border-0 outline-none
                       text-base text-stone-800 dark:text-gray-100
                       placeholder:text-stone-400 dark:placeholder:text-stone-500
                       leading-[1.5] max-h-32 px-2 self-center w-full"
            disabled={isStreaming}
            style={{ height: '40px', lineHeight: '40px' }}
          />

          <button
            type="submit"
            disabled={!text.trim() || isStreaming}
            aria-label={language === 'vi' ? 'Gửi' : 'Send'}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                       bg-[var(--color-mai-silk)] text-white
                       hover:bg-[var(--color-mai-silk)]/90
                       disabled:bg-stone-200 dark:disabled:bg-white/10
                       disabled:text-stone-400 dark:disabled:text-stone-500
                       disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-2 flex justify-between items-center text-[10px]
                        text-stone-400 dark:text-stone-500 transition-colors">
          <span>
            {language === 'vi' ? 'Enter gửi · Shift+Enter xuống dòng' : 'Enter to send · Shift+Enter newline'}
          </span>
          <button
            type="button"
            onClick={clearChat}
            className="hover:text-[var(--color-mai-silk)] underline"
          >
            {language === 'vi' ? '🗑 Xoá' : '🗑 Clear'}
          </button>
        </div>
      </div>
    </form>
  );
}