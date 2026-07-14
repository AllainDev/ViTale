'use client';
import { useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { MessageBubble } from './MessageBubble';
import { SuggestionChips } from './SuggestionChips';
import { VoiceInput } from './VoiceInput';
import { AnimatedBackground } from './AnimatedBackground';
import { PersonaIndicator } from './PersonaIndicator';
import { Sparkles } from 'lucide-react';

export function GlassChatPanel() {
  const { messages, isStreaming, language, sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && typeof scrollRef.current.scrollTo === 'function') {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const welcomeMsg = language === 'vi'
    ? 'Xin chào! Mình là Mai — hướng dẫn viên Hà Nội của bạn. Hỏi mình bất cứ điều gì về thủ đô nhé!'
    : "Hi! I'm Mai — your Hanoi local friend. Ask me anything about the city!";

  const suggestions = language === 'vi'
    ? ['Phở nào ngon ở Hà Nội?', 'Lên lịch 1 ngày ở phố cổ', 'Hồ Gươm có gì hay?', 'Cách đi từ sân bay về trung tâm?']
    : ['Best pho in Hanoi?', 'Plan a day in Old Quarter', "What's special about Hoan Kiem Lake?", 'How to get from airport to city?'];

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Animated background — light theme with floating color blobs */}
      <AnimatedBackground />

      {/* GPT-style chat container — centered column */}
      <div className="relative h-full flex flex-col">
        {/* Persona badge — top center, glassmorphic */}
        <div className="flex justify-center pt-6 z-20">
          <PersonaIndicator />
        </div>

        {/* Chat scroll area — large, centered, max-w-3xl */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-8
                     [&::-webkit-scrollbar]:w-1.5
                     [&::-webkit-scrollbar-track]:bg-transparent
                     [&::-webkit-scrollbar-thumb]:bg-stone-300
                     [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="text-center pt-12">
                {/* Sparkle icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full
                                bg-gradient-to-br from-mai-silk to-mai-lotus
                                shadow-lg shadow-mai-silk/30 mb-6">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-800 dark:text-gray-100 leading-snug max-w-xl mx-auto transition-colors">
                  {welcomeMsg}
                </h1>
                <p className="mt-3 text-sm text-stone-500 dark:text-gray-400 transition-colors">
                  {language === 'vi' ? 'Mình có thể kể chuyện lịch sử, gợi ý quán ăn, lên lịch trình...' : 'I can share history, recommend food, plan itineraries...'}
                </p>

                {/* Suggestion chips grid */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {suggestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="px-4 py-3 text-left text-sm
                                 text-stone-700 dark:text-gray-200
                                 bg-white/70 dark:bg-white/10
                                 backdrop-blur
                                 border border-stone-200 dark:border-white/15
                                 rounded-2xl
                                 hover:border-[var(--color-mai-silk)]
                                 hover:bg-white dark:hover:bg-white/20
                                 hover:shadow-md transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-32">
                {messages.map((m) => (
                  <div key={m.id}>
                    <MessageBubble message={m} />
                    {m.role === 'assistant' && m === messages[messages.length - 1] && !isStreaming && (
                      <SuggestionChips lastMsg={m} />
                    )}
                  </div>
                ))}
                {isStreaming && (
                  <div className="flex items-center gap-2 text-stone-500 dark:text-gray-400 text-sm pl-1 transition-colors">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-mai-silk rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-mai-silk rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-mai-silk rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    {language === 'vi' ? 'Mai đang suy nghĩ...' : 'Mai is thinking...'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input bar — GPT-style wide rounded at bottom */}
        <div className="px-4 md:px-6 pb-6 pt-2 z-20">
          <div className="max-w-3xl mx-auto">
            <VoiceInput />
            <p className="text-center text-[11px] text-stone-400 mt-2">
              {language === 'vi'
                ? 'AI có thể sai. Kiểm tra giờ mở cửa/giá vé trên trang chính thức.'
                : 'AI may be inaccurate. Verify hours/prices on official sites.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}