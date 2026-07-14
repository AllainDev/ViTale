'use client';
import type { ChatMessage } from '@/types/chat';
import { useChat } from '@/context/ChatContext';

const TAG_EMOJI: Record<string, string> = {
  WAVE: '👋', SMILE: '😊', NOD: '👍', POINT: '👉', BOW: '🙇', DANCE: '💃',
};

export function ChatMessage({ message }: { message: ChatMessage }) {
  const { language } = useChat();
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const displayContent = message.content.replace(/\[(WAVE|SMILE|NOD|POINT|BOW|DANCE)\]/g, '');
  const tagsInContent = (message.content.match(/\[(WAVE|SMILE|NOD|POINT|BOW|DANCE)\]/g) || [])
    .map((t) => t.replace(/[\[\]]/g, ''));

  if (isSystem) {
    return (
      <div className="text-center text-xs text-red-600 bg-red-50 rounded-lg p-2">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser
        ? 'bg-emerald-700 text-white rounded-2xl rounded-tr-sm px-4 py-2'
        : 'bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-4 py-3'
      }`}>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{displayContent.trim()}</p>

        {!isUser && tagsInContent.length > 0 && (
          <div className="flex gap-1 mt-2 text-base">
            {tagsInContent.map((tag, i) => (
              <span key={i} title={tag}>{TAG_EMOJI[tag] || tag}</span>
            ))}
          </div>
        )}

        {!isUser && (message.toolCalls?.length || 0) > 0 && (
          <details className="mt-2 text-[10px] text-stone-400">
            <summary className="cursor-pointer hover:text-stone-600">
              {language === 'vi' ? 'Nguồn' : 'Sources'}
            </summary>
            <div className="mt-1 space-y-1">
              {message.toolCalls?.map((t, i) => <div key={i}>🔧 {t}</div>)}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}