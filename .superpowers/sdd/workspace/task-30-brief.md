# Task 30 Brief: LanguageToggle v2 (dark glass style)

**Plan:** docs/superpowers/plans/2026-07-14-mai-chat-redesign.md (Task 2)
**Spec:** docs/superpowers/specs/2026-07-14-mai-chat-redesign-design.md (PersonaIndicator section)

## Goal

Restyle the existing `LanguageToggle` component for the dark glass theme. Add `aria-pressed` for accessibility. Keep file path (`frontend/src/components/Chat/LanguageToggle.tsx`) and `useChat()` interface.

## Files

- **Modify:** `frontend/src/components/Chat/LanguageToggle.tsx` (full rewrite — replace contents)
- **Create:** `frontend/src/components/Chat/__tests__/LanguageToggle.test.tsx`

## Interfaces

- **Consumes:** `useChat()` from `@/context/ChatContext` returns `{ language: 'vi' | 'en', setLanguage: (lang) => void }`
- **Produces:** dark glass pill toggle, silk accent when active, bone text color, `aria-pressed` on both buttons

## Step-by-step

### Step 1: Write the failing test first

Create `frontend/src/components/Chat/__tests__/LanguageToggle.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageToggle } from '../LanguageToggle';

const mockSetLanguage = jest.fn();
jest.mock('@/context/ChatContext', () => ({
  useChat: () => ({ language: 'vi', setLanguage: mockSetLanguage }),
}));

describe('LanguageToggle', () => {
  beforeEach(() => mockSetLanguage.mockClear());

  it('renders VI and EN buttons', () => {
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'VI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
  });

  it('marks current language as pressed', () => {
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'VI' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls setLanguage when EN clicked', async () => {
    render(<LanguageToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(mockSetLanguage).toHaveBeenCalledWith('en');
  });
});
```

### Step 2: Run test to verify it fails (TDD red)

```bash
cd frontend && npx jest src/components/Chat/__tests__/LanguageToggle.test.tsx
```

Expected: FAIL — old `LanguageToggle` lacks `aria-pressed`, so first assertion that checks `toHaveAttribute('aria-pressed', 'true')` fails.

### Step 3: Rewrite LanguageToggle.tsx with new dark glass style

Replace full contents of `frontend/src/components/Chat/LanguageToggle.tsx` with:

```tsx
'use client';
import { useChat } from '@/context/ChatContext';

export function LanguageToggle() {
  const { language, setLanguage } = useChat();
  const baseBtn = 'px-2.5 py-0.5 text-[10px] font-bold tracking-wider transition-colors';
  return (
    <div
      className="inline-flex rounded-full overflow-hidden border border-white/20"
      role="group"
      aria-label="Language toggle"
    >
      <button
        onClick={() => setLanguage('vi')}
        className={`${baseBtn} ${
          language === 'vi'
            ? 'bg-[var(--color-mai-silk)] text-[var(--color-mai-bone)]'
            : 'text-[var(--color-mai-bone)]/60 hover:text-[var(--color-mai-bone)] hover:bg-white/5'
        }`}
        aria-pressed={language === 'vi'}
      >
        VI
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`${baseBtn} ${
          language === 'en'
            ? 'bg-[var(--color-mai-silk)] text-[var(--color-mai-bone)]'
            : 'text-[var(--color-mai-bone)]/60 hover:text-[var(--color-mai-bone)] hover:bg-white/5'
        }`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  );
}
```

### Step 4: Run test to verify it passes (TDD green)

```bash
cd frontend && npx jest src/components/Chat/__tests__/LanguageToggle.test.tsx
```

Expected: PASS, 3 tests.

### Step 5: Type-check

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit 0.

### Step 6: Stage and report (DO NOT commit)

```bash
cd "D:/Project/ViTale" && git add frontend/src/components/Chat/LanguageToggle.tsx frontend/src/components/Chat/__tests__/LanguageToggle.test.tsx
git diff --staged --stat
```

Report staged files + suggested commit message. **Do NOT commit.**

## Suggested commit message

```
feat(chat): restyle LanguageToggle for dark glass with aria-pressed
```

## Acceptance criteria

- [ ] 3 Jest tests pass (VI/EN render, aria-pressed true/false, setLanguage called on click)
- [ ] Component uses `bg-[var(--color-mai-silk)]` for active state
- [ ] Component uses `text-[var(--color-mai-bone)]` for text colors
- [ ] Both buttons have `aria-pressed` reflecting current language
- [ ] `tsc --noEmit` exits 0
- [ ] Only 2 files changed: `LanguageToggle.tsx` + new test file
