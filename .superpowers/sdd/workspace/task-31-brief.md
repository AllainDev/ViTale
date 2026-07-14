# Task 31 Brief: MessageBubble component

**Plan:** docs/superpowers/plans/2026-07-14-mai-chat-redesign.md (Task 3)
**Spec:** docs/superpowers/specs/2026-07-14-mai-chat-redesign-design.md (Component 4 — MessageBubble)

## Goal

Create new `MessageBubble` component (silk ribbon bubble) for the Mai chat redesign. Replaces existing `frontend/src/components/Chat/ChatMessage.tsx` (which stays until Task 37 cleanup).

## Files

- **Create:** `frontend/src/components/chat/MessageBubble.tsx`
- **Create:** `frontend/src/components/chat/__tests__/MessageBubble.test.tsx`

## Interfaces

- **Consumes:** `useChat()` from `@/context/ChatContext` returns `{ language: 'vi' | 'en' }`; `ChatMessage` from `@/types/chat`
- **Produces:** `<MessageBubble message={m} />` — silk ribbon bubble:
  - User: right-aligned, `bg-[var(--color-mai-silk)]` solid, `text-[var(--color-mai-bone)]`, `rounded-2xl rounded-br-sm`
  - Assistant: left-aligned, `bg-[var(--color-mai-lotus)]/10` glass, `text-[var(--color-mai-bone)]`, `border border-[var(--color-mai-silk)]/30`, `rounded-2xl rounded-bl-sm`
  - Streaming assistant (empty content): add `animate-pulse-glow` class
  - System: centered, warning style with silk border + bg
  - Action tags `[WAVE]` etc.: stripped from display content, rendered as emoji chips below bubble
  - Tool calls: collapsible `<details>` element with "Nguồn"/"Sources" label

## Step-by-step

### Step 1: Write the failing test first

Create `frontend/src/components/chat/__tests__/MessageBubble.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';

jest.mock('@/context/ChatContext', () => ({
  useChat: () => ({ language: 'vi' }),
}));

const baseMsg = { id: '1', timestamp: Date.now() };

describe('MessageBubble', () => {
  it('renders user message right-aligned with silk background', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'user', content: 'Xin chào' }} />);
    const wrap = screen.getByText('Xin chào').closest('div.flex');
    expect(wrap).toHaveClass('justify-end');
  });

  it('renders assistant message left-aligned with lotus glass', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'assistant', content: 'Chào bạn' }} />);
    const wrap = screen.getByText('Chào bạn').closest('div.flex');
    expect(wrap).toHaveClass('justify-start');
  });

  it('strips action tags from display content and renders them as chips', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'assistant', content: 'Chào bạn! [WAVE] [SMILE]' }} />);
    expect(screen.getByText(/Chào bạn!/)).toBeInTheDocument();
    expect(screen.getByText('Chào bạn!').textContent).not.toContain('[WAVE]');
    expect(screen.getByTitle('WAVE')).toHaveTextContent('👋');
    expect(screen.getByTitle('SMILE')).toHaveTextContent('😊');
  });

  it('renders system message centered with warning style', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'system', content: 'Connection lost' }} />);
    expect(screen.getByText('Connection lost').closest('div')).toHaveClass('text-center');
  });

  it('renders collapsible tool calls when present', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'assistant', content: 'OK', toolCalls: ['get_nearby_partners'] }} />);
    expect(screen.getByText('Nguồn')).toBeInTheDocument();
  });
});
```

NOTE: This test file lives in NEW `frontend/src/components/chat/__tests__/` folder (lowercase chat). The folder structure is different from Task 30's `frontend/src/components/Chat/__tests__/` (capital C Chat).

### Step 2: Run test to verify it fails (TDD red)

```bash
cd frontend && npx jest src/components/chat/__tests__/MessageBubble.test.tsx
```

Expected: FAIL — module not found (file doesn't exist yet).

### Step 3: Implement MessageBubble

Create `frontend/src/components/chat/MessageBubble.tsx`:

```tsx
'use client';
import { useChat } from '@/context/ChatContext';
import type { ChatMessage } from '@/types/chat';

const TAG_EMOJI: Record<string, string> = {
  WAVE: '👋', SMILE: '😊', NOD: '👍', POINT: '👉', BOW: '🙇', DANCE: '💃',
};

export function MessageBubble({ message }: { message: ChatMessage }) {
  const { language } = useChat();
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isStreaming = message.role === 'assistant' && !message.content;

  const displayContent = message.content.replace(/\[(WAVE|SMILE|NOD|POINT|BOW|DANCE)\]/g, '');
  const tagsInContent = (message.content.match(/\[(WAVE|SMILE|NOD|POINT|BOW|DANCE)\]/g) || [])
    .map((t) => t.replace(/[\[\]]/g, ''));

  if (isSystem) {
    return (
      <div className="text-center text-xs text-[var(--color-mai-silk)]
                      bg-[var(--color-mai-silk)]/10 border border-[var(--color-mai-silk)]/30
                      rounded-lg px-3 py-2 mx-auto max-w-md">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] px-4 py-2.5 ${
        isUser
          ? 'bg-[var(--color-mai-silk)] text-[var(--color-mai-bone)] rounded-2xl rounded-br-sm'
          : `bg-[var(--color-mai-lotus)]/10 backdrop-blur-sm
             text-[var(--color-mai-bone)] border border-[var(--color-mai-silk)]/30
             rounded-2xl rounded-bl-sm
             ${isStreaming ? 'animate-pulse-glow' : ''}`
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {displayContent.trim()}
        </p>

        {!isUser && tagsInContent.length > 0 && (
          <div className="flex gap-1 mt-1.5 text-sm">
            {tagsInContent.map((tag, i) => (
              <span key={i} title={tag} className="opacity-80">
                {TAG_EMOJI[tag] || tag}
              </span>
            ))}
          </div>
        )}

        {!isUser && (message.toolCalls?.length || 0) > 0 && (
          <details className="mt-2 text-[10px] text-[var(--color-mai-bone)]/40">
            <summary className="cursor-pointer hover:text-[var(--color-mai-bone)]/70">
              {language === 'vi' ? 'Nguồn' : 'Sources'}
            </summary>
            <div className="mt-1 space-y-0.5">
              {message.toolCalls?.map((t, i) => (
                <div key={i}>🔧 {t}</div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
```

### Step 4: Run test to verify it passes (TDD green)

```bash
cd frontend && npx jest src/components/chat/__tests__/MessageBubble.test.tsx
```

Expected: PASS, 5 tests.

### Step 5: Type-check

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit 0.

### Step 6: Stage and report (DO NOT commit)

```bash
cd "D:/Project/ViTale" && git add frontend/src/components/chat/MessageBubble.tsx frontend/src/components/chat/__tests__/MessageBubble.test.tsx
git diff --staged --stat
```

Report staged files + suggested commit message. **Do NOT commit.**

## Suggested commit message

```
feat(chat): add MessageBubble with silk ribbon style + action tags
```

## Acceptance criteria

- [ ] 5 Jest tests pass
- [ ] Component file at `frontend/src/components/chat/MessageBubble.tsx` (lowercase chat folder)
- [ ] Test file at `frontend/src/components/chat/__tests__/MessageBubble.test.tsx`
- [ ] User bubble right-aligned + silk solid
- [ ] Assistant bubble left-aligned + lotus glass + silk border
- [ ] Action tags `[WAVE]` etc. stripped from display content, rendered as emoji chips
- [ ] System message centered with warning style
- [ ] Tool calls collapsible with "Nguồn"/"Sources" label
- [ ] Streaming state (empty content) adds `animate-pulse-glow` class
- [ ] tsc --noEmit exits 0
- [ ] Only 2 files created (no other modifications)
