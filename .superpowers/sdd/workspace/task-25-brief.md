### Task 25: ChatPanel component (composes everything)

**Files:**
- Create: `frontend/src/components/Chat/ChatPanel.tsx`

- [ ] **Step 1: Create component**

Create `frontend/src/components/Chat/ChatPanel.tsx`:

```tsx
'use client';
import { useChat } from '@/context/ChatContext';
import { LanguageToggle } from './LanguageToggle';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SuggestionChips } from './SuggestionChips';

const WELCOME_VI = 'Xin chào! Mình là Mai — hướng dẫn viên Hà Nội của bạn. Hỏi mình bất cứ điều gì về thủ đô nhé! [WAVE]';
const WELCOME_EN = "Hi! I'm Mai — your Hanoi local friend. Ask me anything about the city! [WAVE]";

const SUGGESTIONS_VI = [
  'Phở nào ngon ở Hà Nội?',
  'Lên lịch 1 ngày ở phố cổ',
  'Hồ Gươm có gì hay?',
  'Cách đi từ sân bay về trung tâm?',
];
const SUGGESTIONS_EN = [
  'Best pho in Hanoi?',
  'Plan a day in Old Quarter',
  "What's special about Hoan Kiem Lake?",
  'How to get from airport to city center?',
];

export function ChatPanel() {
  const { messages, language, requestGps, gps, isStreaming, sendMessage } = useChat();

  const welcomeMsg = language === 'vi' ? WELCOME_VI : WELCOME_EN;
  const suggestions = language === 'vi' ? SUGGESTIONS_VI : SUGGESTIONS_EN;

  // Find last assistant message for suggestion chips
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div className="flex flex-col h-full bg-stone-50">
      <header className="flex items-center justify-between p-4 border-b border-stone-200 bg-white">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            {language === 'vi' ? 'Trợ lý Hà Nội' : 'Hanoi Guide'}
          </h2>
          <p className="text-xs text-stone-500">Powered by ViTale AI</p>
        </div>
        <LanguageToggle />
      </header>

      <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs">
        {gps ? (
          <span className="text-emerald-700">
            📍 {language === 'vi' ? 'Đã bật vị trí' : 'Location enabled'}
          </span>
        ) : (
          <button
            onClick={requestGps}
            className="text-stone-600 hover:text-emerald-700 underline"
          >
            {language === 'vi' ? '📍 Bật vị trí để gợi ý gần đây' : '📍 Enable location for nearby suggestions'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-stone-500 mt-12 px-6">
            <p className="text-sm leading-relaxed">{welcomeMsg}</p>
            <div className="mt-8 grid grid-cols-1 gap-2 text-left">
              {suggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 hover:border-emerald-500 hover:bg-emerald-50 transition text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id}>
            <ChatMessage message={m} />
            {m.role === 'assistant' && m === lastAssistant && !isStreaming && (
              <SuggestionChips lastMsg={m} />
            )}
          </div>
        ))}
        {isStreaming && (
          <div className="flex items-center gap-2 text-stone-400 text-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            {language === 'vi' ? 'Mai đang suy nghĩ...' : 'Mai is thinking...'}
          </div>
        )}
      </div>

      <ChatInput />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Chat/ChatPanel.tsx
git commit -m "feat: ChatPanel composes LanguageToggle + ChatMessage + SuggestionChips + ChatInput"
```

---

