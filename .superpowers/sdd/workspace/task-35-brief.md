# Task 35 Brief: GlassChatPanel component (root overlay)

**Plan:** docs/superpowers/plans/2026-07-14-mai-chat-redesign.md (Task 7)
**Spec:** docs/superpowers/specs/2026-07-14-mai-chat-redesign-design.md (Component 3 — GlassChatPanel)

## Goal

Create the `GlassChatPanel` component — root overlay container anchored at the bottom of the avatar stage. Composes `<MessageBubble>`, `<SuggestionChips>`, `<VoiceInput>`. Auto-scrolls to bottom on new message or streaming state.

## Files

- **Create:** `frontend/src/components/chat/GlassChatPanel.tsx`
- **Create:** `frontend/src/components/chat/__tests__/GlassChatPanel.test.tsx`

## Interfaces

- **Consumes:** `useChat()` for `{ messages, isStreaming, language }`; renders `<MessageBubble>`, `<SuggestionChips>`, `<VoiceInput>` (all in same `chat/` folder from prior tasks)
- **Produces:** `<GlassChatPanel />` bottom-anchored glass overlay with:
  - Auto-scroll to bottom on `messages.length` change or `isStreaming` change
  - Welcome state (when `messages.length === 0`): centered text "Xin chào! Mình là Mai..." / "Hi! I'm Mai..."
  - Messages state: scrollable list of `<MessageBubble>` + last assistant gets `<SuggestionChips>`
  - Streaming state: 3-dot bounce indicator "Mai đang suy nghĩ..." / "Mai is thinking..."
  - `<VoiceInput />` at bottom
  - Footer disclaimer: "AI có thể sai..." / "AI may be inaccurate..."

## Known workarounds

- `jest.mock` uses relative path `'../../../context/ChatContext'` (not `@/...`)
- `import '@testing-library/jest-dom'` at top of test file

## Step-by-step

### Step 1: Write test first

Create `frontend/src/components/chat/__tests__/GlassChatPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GlassChatPanel } from '../GlassChatPanel';

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({ messages: [], isStreaming: false, language: 'vi' }),
}));

describe('GlassChatPanel', () => {
  it('renders welcome message when empty (VI)', () => {
    render(<GlassChatPanel />);
    expect(screen.getByText(/Xin chào! Mình là Mai/i)).toBeInTheDocument();
  });

  it('renders footer disclaimer', () => {
    render(<GlassChatPanel />);
    expect(screen.getByText(/AI có thể sai/i)).toBeInTheDocument();
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd frontend && npx jest src/components/chat/__tests__/GlassChatPanel.test.tsx
```

Expected: FAIL — module not found.

### Step 3: Implement GlassChatPanel

Create `frontend/src/components/chat/GlassChatPanel.tsx`:

```tsx
'use client';
import { useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { MessageBubble } from './MessageBubble';
import { SuggestionChips } from './SuggestionChips';
import { VoiceInput } from './VoiceInput';

export function GlassChatPanel() {
  const { messages, isStreaming, language } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  const welcomeMsg = language === 'vi'
    ? 'Xin chào! Mình là Mai — hướng dẫn viên Hà Nội của bạn. Hỏi mình bất cứ điều gì về thủ đô nhé! [WAVE]'
    : "Hi! I'm Mai — your Hanoi local friend. Ask me anything about the city! [WAVE]";

  return (
    <div className="absolute bottom-0 inset-x-0 z-10
                    bg-gradient-to-t from-[var(--color-mai-night)] via-[var(--color-mai-night)]/95 to-transparent
                    backdrop-blur-md border-t border-[var(--color-mai-silk)]/20
                    shadow-[0_-32px_64px_rgba(14,14,39,0.6)]">

      <div ref={scrollRef} className="overflow-y-auto px-4 md:px-6 py-4 max-h-[40vh] min-h-[180px]">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-mai-bone)]/80 mt-6">
            {welcomeMsg}
          </p>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {messages.map((m) => (
              <div key={m.id}>
                <MessageBubble message={m} />
                {m.role === 'assistant' && m === messages[messages.length - 1] && !isStreaming && (
                  <SuggestionChips lastMsg={m} />
                )}
              </div>
            ))}
            {isStreaming && (
              <div className="flex items-center gap-2 text-[var(--color-mai-bone)]/40 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[var(--color-mai-silk)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[var(--color-mai-silk)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[var(--color-mai-silk)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                {language === 'vi' ? 'Mai đang suy nghĩ...' : 'Mai is thinking...'}
              </div>
            )}
          </div>
        )}
      </div>

      <VoiceInput />

      <p className="text-center text-[10px] text-[var(--color-mai-bone)]/40 pb-2">
        {language === 'vi'
          ? 'AI có thể sai. Kiểm tra thông tin quan trọng trước khi đi.'
          : 'AI may be inaccurate. Verify important info before traveling.'}
      </p>
    </div>
  );
}
```

### Step 4: Run test to verify it passes

```bash
cd frontend && npx jest src/components/chat/__tests__/GlassChatPanel.test.tsx
```

Expected: PASS, 2 tests.

### Step 5: Type-check

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit 0.

### Step 6: Stage and report

```bash
cd "D:/Project/ViTale" && git add frontend/src/components/chat/GlassChatPanel.tsx frontend/src/components/chat/__tests__/GlassChatPanel.test.tsx
git diff --staged --stat
```

## Suggested commit message

```
feat(chat): add GlassChatPanel root overlay with auto-scroll + welcome
```

## Acceptance criteria

- [ ] 2 Jest tests pass
- [ ] Component at `frontend/src/components/chat/GlassChatPanel.tsx`
- [ ] Test at `frontend/src/components/chat/__tests__/GlassChatPanel.test.tsx`
- [ ] Uses `var(--color-mai-night)`, `var(--color-mai-silk)`, `var(--color-mai-bone)` tokens
- [ ] Imports `<MessageBubble>`, `<SuggestionChips>`, `<VoiceInput>` from `./` (sibling files)
- [ ] Renders "Xin chào! Mình là Mai" in VI when empty
- [ ] Renders footer disclaimer "AI có thể sai"
- [ ] Auto-scrolls on messages.length or isStreaming change
- [ ] tsc --noEmit exits 0
- [ ] Only 2 files created