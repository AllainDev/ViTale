### Task 23: ChatInput component

**Files:**
- Create: `frontend/src/components/Chat/ChatInput.tsx`

- [ ] **Step 1: Create component**

Create `frontend/src/components/Chat/ChatInput.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useChat } from '@/context/ChatContext';

export function ChatInput() {
  const { sendMessage, isStreaming, language, clearChat } = useChat();
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isStreaming) return;
    sendMessage(text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-stone-200 p-4 bg-white">
      <div className="flex gap-2 items-end">
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
          className="flex-1 resize-none rounded-xl border border-stone-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-h-32"
          disabled={isStreaming}
        />
        <button
          type="submit"
          disabled={!text.trim() || isStreaming}
          className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm font-medium hover:bg-emerald-800 disabled:bg-stone-300 disabled:cursor-not-allowed transition"
        >
          {language === 'vi' ? 'Gửi' : 'Send'}
        </button>
      </div>
      <div className="mt-2 flex justify-between items-center text-[10px] text-stone-400">
        <span>
          {language === 'vi'
            ? 'AI có thể sai. Kiểm tra thông tin quan trọng trước khi đi.'
            : 'AI may be inaccurate. Verify important info before traveling.'}
        </span>
        <button
          type="button"
          onClick={clearChat}
          className="hover:text-red-600 underline"
        >
          {language === 'vi' ? '🗑 Xoá' : '🗑 Clear'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Chat/ChatInput.tsx
git commit -m "feat: ChatInput with disclaimer + clear button"
```

---

