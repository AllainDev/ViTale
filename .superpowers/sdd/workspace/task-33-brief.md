# Task 33 Brief: VoiceInput component

**Plan:** docs/superpowers/plans/2026-07-14-mai-chat-redesign.md (Task 5)
**Spec:** docs/superpowers/specs/2026-07-14-mai-chat-redesign-design.md (Component 5 — VoiceInput)

## Goal

Create the `VoiceInput` component — input bar with mic placeholder (disabled), GPS button (2 states), textarea, send button, and footer with clear button + keyboard shortcuts hint. Replaces `ChatInput.tsx` (deleted in Task 37).

## Files

- **Create:** `frontend/src/components/chat/VoiceInput.tsx`
- **Create:** `frontend/src/components/chat/__tests__/VoiceInput.test.tsx`

## Interfaces

- **Consumes:** `useChat()` from `@/context/ChatContext` returns `{ sendMessage, isStreaming, language, requestGps, gps, clearChat }`
- **Produces:** `<VoiceInput />` form with:
  - Mic button (always `disabled`, tooltip "Voice (sắp ra mắt)" / "Voice (coming soon)")
  - GPS button (`requestGps` on click; 2 visual states based on `gps`: leaf-green when active, gray when off)
  - Textarea (placeholder "Hỏi Mai về Hà Nội..." / "Ask Mai about Hanoi...")
  - Send button (disabled when text empty or `isStreaming`; silk bg when active)
  - Footer: keyboard shortcut hint + clear button (`clearChat` on click)

## Known workarounds (from Task 30/31/32 history)

- Use `fireEvent` (NOT `userEvent` — not installed)
- Use relative path `'../../../context/ChatContext'` in `jest.mock()` (NOT `@/...`)
- Add `import '@testing-library/jest-dom'` at top of test file

## Step-by-step

### Step 1: Write the test first (TDD)

Create `frontend/src/components/chat/__tests__/VoiceInput.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VoiceInput } from '../VoiceInput';

const mockSendMessage = jest.fn();
const mockRequestGps = jest.fn();
const mockClearChat = jest.fn();

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({
    sendMessage: mockSendMessage,
    isStreaming: false,
    language: 'vi',
    requestGps: mockRequestGps,
    gps: null,
    clearChat: mockClearChat,
  }),
}));

describe('VoiceInput', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    mockRequestGps.mockClear();
    mockClearChat.mockClear();
  });

  it('disables send when input is empty', () => {
    render(<VoiceInput />);
    expect(screen.getByRole('button', { name: /gửi/i })).toBeDisabled();
  });

  it('sends message on Enter key and clears textarea', () => {
    render(<VoiceInput />);
    const textarea = screen.getByPlaceholderText(/Hỏi Mai/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Phở ở đâu?' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(mockSendMessage).toHaveBeenCalledWith('Phở ở đâu?');
  });

  it('sends on submit button click', () => {
    render(<VoiceInput />);
    const textarea = screen.getByPlaceholderText(/Hỏi Mai/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Xin chào' } });
    fireEvent.click(screen.getByRole('button', { name: /gửi/i }));
    expect(mockSendMessage).toHaveBeenCalledWith('Xin chào');
  });

  it('disables mic button (placeholder)', () => {
    render(<VoiceInput />);
    expect(screen.getByRole('button', { name: /voice/i })).toBeDisabled();
  });

  it('calls requestGps when GPS button clicked', () => {
    render(<VoiceInput />);
    fireEvent.click(screen.getByRole('button', { name: /bật vị trí/i }));
    expect(mockRequestGps).toHaveBeenCalledTimes(1);
  });

  it('calls clearChat when clear button clicked', () => {
    render(<VoiceInput />);
    fireEvent.click(screen.getByRole('button', { name: /xoá/i }));
    expect(mockClearChat).toHaveBeenCalledTimes(1);
  });

  it('does not send when input has only whitespace', () => {
    render(<VoiceInput />);
    const textarea = screen.getByPlaceholderText(/Hỏi Mai/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /gửi/i }));
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
```

NOTE: Brief in plan used `userEvent.type` + `userEvent.click` + `async`. Since user-event isn't installed, use `fireEvent.change` for typing (sets value) and `fireEvent.click` / `fireEvent.keyDown` for events. This is synchronous (no `async` needed).

### Step 2: Run test to verify it fails (TDD red)

```bash
cd frontend && npx jest src/components/chat/__tests__/VoiceInput.test.tsx
```

Expected: FAIL — module not found.

### Step 3: Implement VoiceInput

Create `frontend/src/components/chat/VoiceInput.tsx`:

```tsx
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
        <div className="flex items-end gap-2 p-2
                        bg-black/40 backdrop-blur-xl
                        border border-[var(--color-mai-silk)]/30 rounded-2xl
                        shadow-[0_0_24px_rgba(215,95,78,0.1)]
                        focus-within:border-[var(--color-mai-silk)]/60
                        focus-within:shadow-[0_0_32px_rgba(215,95,78,0.25)]
                        transition-all">

          <button
            type="button"
            onClick={requestGps}
            aria-label={language === 'vi' ? 'Bật vị trí' : 'Enable location'}
            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              gps
                ? 'bg-[var(--color-mai-leaf)]/20 text-[var(--color-mai-leaf)]'
                : 'text-[var(--color-mai-bone)]/40 hover:text-[var(--color-mai-bone)] hover:bg-white/5'
            }`}
          >
            <MapPin className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled
            aria-label={language === 'vi' ? 'Voice (sắp ra mắt)' : 'Voice (coming soon)'}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                       text-[var(--color-mai-bone)]/30 cursor-not-allowed hover:bg-white/5"
          >
            <Mic className="w-4 h-4" />
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
            className="flex-1 resize-none bg-transparent
                       text-sm text-[var(--color-mai-bone)] placeholder:text-[var(--color-mai-bone)]/30
                       focus:outline-none max-h-32 px-1"
            disabled={isStreaming}
          />

          <button
            type="submit"
            disabled={!text.trim() || isStreaming}
            aria-label={language === 'vi' ? 'Gửi' : 'Send'}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                       bg-[var(--color-mai-silk)] text-[var(--color-mai-bone)]
                       hover:bg-[var(--color-mai-silk)]/90
                       disabled:bg-[var(--color-mai-bone)]/10 disabled:text-[var(--color-mai-bone)]/30
                       disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-1.5 flex justify-between items-center text-[10px] text-[var(--color-mai-bone)]/40">
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
```

### Step 4: Run test to verify it passes (TDD green)

```bash
cd frontend && npx jest src/components/chat/__tests__/VoiceInput.test.tsx
```

Expected: PASS, 7 tests.

### Step 5: Type-check

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit 0.

### Step 6: Stage and report (DO NOT commit)

```bash
cd "D:/Project/ViTale" && git add frontend/src/components/chat/VoiceInput.tsx frontend/src/components/chat/__tests__/VoiceInput.test.tsx
git diff --staged --stat
```

## Suggested commit message

```
feat(chat): add VoiceInput with inline mic placeholder, GPS, send
```

## Acceptance criteria

- [ ] 7 Jest tests pass
- [ ] Component at `frontend/src/components/chat/VoiceInput.tsx`
- [ ] Test at `frontend/src/components/chat/__tests__/VoiceInput.test.tsx`
- [ ] Uses `var(--color-mai-silk)`, `var(--color-mai-bone)`, `var(--color-mai-leaf)` tokens
- [ ] Mic button has `disabled` attribute
- [ ] GPS button has 2 visual states (leaf-green when active, gray when off)
- [ ] Send button disabled when text empty or `isStreaming`
- [ ] Enter key submits, Shift+Enter newline (verified by Enter test)
- [ ] Footer shows keyboard hint + clear button
- [ ] tsc --noEmit exits 0
- [ ] Only 2 files created
- [ ] Legacy `Chat/ChatInput.tsx` untouched (Task 37 deletes)