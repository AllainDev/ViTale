# Task 34 Brief: PersonaIndicator component

**Plan:** docs/superpowers/plans/2026-07-14-mai-chat-redesign.md (Task 6)
**Spec:** docs/superpowers/specs/2026-07-14-mai-chat-redesign-design.md (Component 2 — PersonaIndicator)

## Goal

Create the `PersonaIndicator` component — floating glass pill at top of avatar stage with status dot, Mai badge, Sparkles icon, divider, LanguageToggle. Composes existing `LanguageToggle` from `../Chat/LanguageToggle` (capital C).

## Files

- **Create:** `frontend/src/components/chat/PersonaIndicator.tsx`
- **Create:** `frontend/src/components/chat/__tests__/PersonaIndicator.test.tsx`

## Interfaces

- **Consumes:** `useChat()` for `language`; imports `<LanguageToggle />` from `../Chat/LanguageToggle` (capital C — same folder, modified in Task 30)
- **Produces:** `<PersonaIndicator />` floating glass pill containing:
  - Pulsing status dot (silk color)
  - "Mai · Trợ lý Di sản" / "Mai · Heritage Guide" text (serif font, bone color)
  - Sparkles icon (silk color)
  - Vertical divider (bone/20)
  - LanguageToggle

## Known workarounds

- Use `fireEvent` (NOT `userEvent` — not installed) — though this task doesn't need user interactions
- Use relative path `'../../../context/ChatContext'` in `jest.mock()`
- Add `import '@testing-library/jest-dom'` at top of test file

## Step-by-step

### Step 1: Write smoke test first

Create `frontend/src/components/chat/__tests__/PersonaIndicator.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PersonaIndicator } from '../PersonaIndicator';

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({ language: 'vi' }),
}));

describe('PersonaIndicator', () => {
  it('renders Mai persona badge in VI', () => {
    render(<PersonaIndicator />);
    expect(screen.getByText(/Trợ lý Di sản/i)).toBeInTheDocument();
  });

  it('renders language toggle', () => {
    render(<PersonaIndicator />);
    expect(screen.getByRole('group', { name: /language toggle/i })).toBeInTheDocument();
  });
});
```

NOTE: `<LanguageToggle />` itself is not mocked here — it gets the same `useChat` mock via the parent. This is fine because `LanguageToggle` only uses `useChat` internally.

### Step 2: Run test to verify it fails

```bash
cd frontend && npx jest src/components/chat/__tests__/PersonaIndicator.test.tsx
```

Expected: FAIL — module not found.

### Step 3: Implement PersonaIndicator

Create `frontend/src/components/chat/PersonaIndicator.tsx`:

```tsx
'use client';
import { useChat } from '@/context/ChatContext';
import { LanguageToggle } from '../Chat/LanguageToggle';
import { Sparkles } from 'lucide-react';

export function PersonaIndicator() {
  const { language } = useChat();
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full
                      bg-black/30 backdrop-blur-xl
                      border border-[var(--color-mai-silk)]/30
                      shadow-[0_0_32px_rgba(215,95,78,0.15)]">
        <span className="w-2 h-2 rounded-full bg-[var(--color-mai-silk)] animate-pulse" />
        <span className="font-serif text-sm font-bold text-[var(--color-mai-bone)] tracking-wide">
          Mai · {language === 'vi' ? 'Trợ lý Di sản' : 'Heritage Guide'}
        </span>
        <Sparkles className="w-3.5 h-3.5 text-[var(--color-mai-silk)]" />
        <div className="w-px h-4 bg-[var(--color-mai-bone)]/20" />
        <LanguageToggle />
      </div>
    </div>
  );
}
```

### Step 4: Run test to verify it passes

```bash
cd frontend && npx jest src/components/chat/__tests__/PersonaIndicator.test.tsx
```

Expected: PASS, 2 tests.

### Step 5: Type-check

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit 0.

### Step 6: Stage and report

```bash
cd "D:/Project/ViTale" && git add frontend/src/components/chat/PersonaIndicator.tsx frontend/src/components/chat/__tests__/PersonaIndicator.test.tsx
git diff --staged --stat
```

## Suggested commit message

```
feat(chat): add PersonaIndicator floating glass pill
```

## Acceptance criteria

- [ ] 2 Jest tests pass
- [ ] Component at `frontend/src/components/chat/PersonaIndicator.tsx`
- [ ] Test at `frontend/src/components/chat/__tests__/PersonaIndicator.test.tsx`
- [ ] Uses `var(--color-mai-silk)`, `var(--color-mai-bone)` tokens
- [ ] Imports `<LanguageToggle />` from `../Chat/LanguageToggle` (capital C — same folder)
- [ ] Renders "Trợ lý Di sản" in VI
- [ ] Renders `role="group"` aria-label "Language toggle"
- [ ] tsc --noEmit exits 0
- [ ] Only 2 files created