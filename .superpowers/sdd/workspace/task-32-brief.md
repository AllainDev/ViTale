# Task 32 Brief: SuggestionChips v2 (dark glass)

**Plan:** docs/superpowers/plans/2026-07-14-mai-chat-redesign.md (Task 4)
**Spec:** docs/superpowers/specs/2026-07-14-mai-chat-redesign-design.md (SuggestionChips design)

## Goal

Move existing `SuggestionChips` logic to the new `frontend/src/components/chat/` folder with dark glass styling. The OLD file at `frontend/src/components/Chat/SuggestionChips.tsx` will be deleted in Task 37 cleanup — both coexist temporarily.

## Files

- **Create:** `frontend/src/components/chat/SuggestionChips.tsx`
- **Create:** `frontend/src/components/chat/__tests__/SuggestionChips.test.tsx`
- **DO NOT touch:** `frontend/src/components/Chat/SuggestionChips.tsx` (legacy — deleted in Task 37)

## Interfaces

- **Consumes:** `useChat()` from `@/context/ChatContext` returns `{ sendMessage, language }`; `ChatMessage` prop
- **Produces:** dark glass chips that call `sendMessage(text)` on click

## Known workarounds (from Task 30 + 31 history)

- **Use `fireEvent.click`** instead of `userEvent.click` — `@testing-library/user-event` is NOT installed
- **Use relative path** `'../../../context/ChatContext'` in `jest.mock()` — Jest doesn't read `@/*` alias
- **Add `import '@testing-library/jest-dom'`** at top of test file — needed for tsc matcher types

## Step-by-step

### Step 1: Write the failing test first

Create `frontend/src/components/chat/__tests__/SuggestionChips.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SuggestionChips } from '../SuggestionChips';

const mockSendMessage = jest.fn();
jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({ sendMessage: mockSendMessage, language: 'vi' }),
}));

describe('SuggestionChips', () => {
  beforeEach(() => mockSendMessage.mockClear());

  it('renders fallback suggestions when no tool calls', () => {
    render(<SuggestionChips lastMsg={{ id: '1', role: 'assistant', content: 'Hi', timestamp: 0 }} />);
    expect(screen.getByText(/Kể thêm đi!/)).toBeInTheDocument();
  });

  it('renders tool-specific suggestions', () => {
    render(<SuggestionChips lastMsg={{ id: '1', role: 'assistant', content: 'Quán gần đây', toolCalls: ['get_nearby_partners'], timestamp: 0 }} />);
    expect(screen.getByText(/Có quán nào rẻ hơn/)).toBeInTheDocument();
  });

  it('calls sendMessage on chip click', () => {
    render(<SuggestionChips lastMsg={{ id: '1', role: 'assistant', content: 'Hi', timestamp: 0 }} />);
    fireEvent.click(screen.getByText(/Kể thêm đi!/));
    expect(mockSendMessage).toHaveBeenCalledWith('Kể thêm đi!');
  });
});
```

NOTE: brief in plan used `userEvent.click` but user-event isn't installed; use `fireEvent.click` (no `async` needed).

### Step 2: Run test to verify it fails (TDD red)

```bash
cd frontend && npx jest src/components/chat/__tests__/SuggestionChips.test.tsx
```

Expected: FAIL — module not found.

### Step 3: Implement SuggestionChips with dark glass style

Create `frontend/src/components/chat/SuggestionChips.tsx`:

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
```

### Step 4: Run test to verify it passes (TDD green)

```bash
cd frontend && npx jest src/components/chat/__tests__/SuggestionChips.test.tsx
```

Expected: PASS, 3 tests.

### Step 5: Type-check

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit 0.

### Step 6: Stage and report (DO NOT commit)

```bash
cd "D:/Project/ViTale" && git add frontend/src/components/chat/SuggestionChips.tsx frontend/src/components/chat/__tests__/SuggestionChips.test.tsx
git diff --staged --stat
```

## Suggested commit message

```
feat(chat): add SuggestionChips with dark glass style
```

## Acceptance criteria

- [ ] 3 Jest tests pass
- [ ] Component at `frontend/src/components/chat/SuggestionChips.tsx`
- [ ] Test at `frontend/src/components/chat/__tests__/SuggestionChips.test.tsx`
- [ ] Uses `var(--color-mai-silk)` + `var(--color-mai-bone)` tokens
- [ ] Logic identical to legacy version (same tool→suggestions map)
- [ ] tsc --noEmit exits 0
- [ ] Only 2 files created
- [ ] Legacy file at `frontend/src/components/Chat/SuggestionChips.tsx` untouched (Task 37 will delete)