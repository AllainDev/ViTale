'use client';
import { useChat } from '@/context/ChatContext';
import type { ChatMessage } from '@/types/chat';

const TAG_TOOL_TO_SUGGESTIONS: Record<string, { vi: string[]; en: string[] }> = {
  get_nearby_partners: {
    vi: ['Có quán nào rẻ hơn không?', 'Còn quán nào gần hơn?'],
    en: ['Any cheaper options?', 'Anything closer?'],
  },
  get_nearby_checkpoints: {
    vi: ['Cách đi đến đó?', 'Có gì hay ở đó?'],
    en: ['How to get there?', "What's special about it?"],
  },
  get_checkpoint_details: {
    vi: ['Gần đây có gì hay?', 'Kể thêm về lịch sử?'],
    en: ['What\'s nearby?', 'Tell me more history!'],
  },
  plan_simple_itinerary: {
    vi: ['Có thể thêm quán ăn?', 'Lịch trình buổi tối?'],
    en: ['Can you add restaurants?', 'Evening plan?'],
  },
};

function generateSuggestions(lastMsg: ChatMessage, lang: 'vi' | 'en'): string[] {
  const suggestions: string[] = [];
  for (const tool of lastMsg.toolCalls ?? []) {
    const s = TAG_TOOL_TO_SUGGESTIONS[tool];
    if (s) suggestions.push(...s[lang]);
  }
  suggestions.push(lang === 'vi' ? 'Kể thêm đi!' : 'Tell me more!');
  suggestions.push(lang === 'vi' ? 'Có chỗ nào khác không?' : 'Any other places?');
  return [...new Set(suggestions)].slice(0, 3);
}

export function SuggestionChips({ lastMsg }: { lastMsg: ChatMessage }) {
  const { sendMessage, language } = useChat();
  const suggestions = generateSuggestions(lastMsg, language);

  return (
    <div className="flex flex-wrap gap-2 mt-3 ml-1">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => sendMessage(s)}
          className="px-3 py-1.5 text-xs
                     bg-[var(--color-mai-silk)]/10 hover:bg-[var(--color-mai-silk)]/20
                     border border-[var(--color-mai-silk)]/30 hover:border-[var(--color-mai-silk)]/60
                     rounded-full text-[var(--color-mai-bone)]/90
                     transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  );
}