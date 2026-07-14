### Task 24: SuggestionChips component

**Files:**
- Create: `frontend/src/components/Chat/SuggestionChips.tsx`

- [ ] **Step 1: Create component**

Create `frontend/src/components/Chat/SuggestionChips.tsx`:

```tsx
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
    en: ['How to get there?', ['What\'s special about it?']],
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

const CATEGORY_SUGGESTIONS: Record<string, { vi: string[]; en: string[] }> = {
  food: { vi: ['Nên ăn vào giờ nào?', 'Có quán nào view đẹp?'], en: ['Best time to eat?', 'Any with nice views?'] },
  history: { vi: ['Gần đây có gì hay?', 'Cách đi đến đó?'], en: ['What\'s nearby?', 'How to get there?'] },
  practical_tips: { vi: ['Có tips gì khác?', 'Nên tránh gì?'], en: ['Any other tips?', 'What to avoid?'] },
};

function generateSuggestions(lastMsg: ChatMessage, lang: 'vi' | 'en'): string[] {
  const suggestions: string[] = [];

  // Tool-based suggestions
  for (const tool of lastMsg.toolCalls ?? []) {
    const s = TAG_TOOL_TO_SUGGESTIONS[tool];
    if (s) suggestions.push(...s[lang]);
  }

  // Always add 1-2 generic fallbacks
  suggestions.push(lang === 'vi' ? 'Kể thêm đi!' : 'Tell me more!');
  suggestions.push(lang === 'vi' ? 'Có chỗ nào khác không?' : 'Any other places?');

  // Dedupe + limit 3
  return [...new Set(suggestions)].slice(0, 3);
}

export function SuggestionChips({ lastMsg }: { lastMsg: ChatMessage }) {
  const { sendMessage, language } = useChat();
  const suggestions = generateSuggestions(lastMsg, language);

  return (
    <div className="flex flex-wrap gap-2 mt-2 ml-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => sendMessage(s)}
          className="px-3 py-1.5 text-xs bg-stone-100 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-full text-stone-700 transition"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Chat/SuggestionChips.tsx
git commit -m "feat: SuggestionChips for quick reply based on tool calls"
```

---

