# Task 36 Brief: AvatarStage component (full-bleed backdrop)

**Plan:** docs/superpowers/plans/2026-07-14-mai-chat-redesign.md (Task 8)
**Spec:** docs/superpowers/specs/2026-07-14-mai-chat-redesign-design.md (Component 1 — AvatarStage)

## Goal

Create the `AvatarStage` component — full-bleed backdrop with aurora gradient + 3D avatar centered + PersonaIndicator overlay. Uses dynamic import for AvatarRenderer (SSR off, lazy).

## Files

- **Create:** `frontend/src/components/chat/AvatarStage.tsx`
- **Create:** `frontend/src/components/chat/__tests__/AvatarStage.test.tsx`

## Interfaces

- **Consumes:** dynamic import `@/components/AvatarRenderer` (existing component, no changes); embeds `<PersonaIndicator />` (from Task 34)
- **Produces:** `<AvatarStage animTag="idle" | "talking" onAvatarLoaded={() => void} />`:
  - Full-bleed stage (`absolute inset-0`)
  - Aurora gradient overlay (radial from leaf to transparent)
  - Bottom darkening gradient (from night to transparent)
  - Centered AvatarRenderer (top 8%, height 55vh, max 480px)
  - PersonaIndicator overlay (top center)

## Known workarounds + plan notes

- `jest.mock` uses relative path `'../../../context/ChatContext'`
- `import '@testing-library/jest-dom'` at top of test file
- **Plan explicitly notes**: "Mocking `next/dynamic` for tests is tricky. If the test setup fights us, fallback to a manual smoke test that just imports the file"
- Brief suggests using fallback smoke test if dynamic mock fails: just `expect(...).not.toThrow()` with one test

## Step-by-step

### Step 1: Write smoke test (try the full version first, fallback if needed)

Create `frontend/src/components/chat/__tests__/AvatarStage.test.tsx` — try the full version first:

```tsx
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../../components/AvatarRenderer', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-avatar">Avatar</div>,
}));

jest.mock('next/dynamic', () => () => {
  const Component = (_props: any) => <div data-testid="dynamic-avatar" />;
  Component.displayName = 'DynamicAvatar';
  return Component;
});

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({ language: 'vi' }),
}));

import { AvatarStage } from '../AvatarStage';

describe('AvatarStage', () => {
  it('renders the stage container', () => {
    const { container } = render(<AvatarStage animTag="idle" onAvatarLoaded={() => {}} />);
    expect(container.querySelector('.absolute.inset-0')).toBeInTheDocument();
  });

  it('renders the persona indicator overlay', () => {
    render(<AvatarStage animTag="idle" onAvatarLoaded={() => {}} />);
    expect(screen.getByText(/Trợ lý Di sản/i)).toBeInTheDocument();
  });
});
```

NOTE: The brief in plan used `@/` aliases in jest.mock — but per Task 30/31/32 history, jest doesn't read the alias. Use relative paths (`../../../components/AvatarRenderer`, `../../../context/ChatContext`, `next/dynamic`).

### Step 2: Run test

```bash
cd frontend && npx jest src/components/chat/__tests__/AvatarStage.test.tsx
```

**If the test passes**: continue to Step 3.

**If the test fails** (likely due to next/dynamic mock incompatibility): REPLACE the test file with the fallback smoke test:

```tsx
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AvatarStage } from '../AvatarStage';

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({ language: 'vi' }),
}));

test('AvatarStage renders without throwing', () => {
  expect(() => render(<AvatarStage animTag="idle" onAvatarLoaded={() => {}} />)).not.toThrow();
});
```

Then re-run and confirm it passes.

### Step 3: Implement AvatarStage

Create `frontend/src/components/chat/AvatarStage.tsx`:

```tsx
'use client';
import dynamic from 'next/dynamic';
import { PersonaIndicator } from './PersonaIndicator';

const AvatarRenderer = dynamic(
  () => import('../../../components/AvatarRenderer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--color-mai-silk)]/30 border-t-[var(--color-mai-silk)] animate-spin" />
      </div>
    ),
  }
);

interface AvatarStageProps {
  animTag: 'idle' | 'talking';
  onAvatarLoaded: () => void;
}

export function AvatarStage({ animTag, onAvatarLoaded }: AvatarStageProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--color-mai-night)]">
      <div className="absolute inset-0 bg-gradient-radial from-[var(--color-mai-leaf)]/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-mai-night)] via-transparent to-transparent" />

      <div className="absolute inset-x-0 top-[8%] mx-auto h-[55vh] max-h-[480px]">
        <AvatarRenderer
          lipsSyncEngine={null}
          animationTag={animTag}
          onAvatarLoaded={onAvatarLoaded}
        />
      </div>

      <PersonaIndicator />
    </div>
  );
}
```

NOTE: Changed import from `@/components/AvatarRenderer` to relative path `../../../components/AvatarRenderer` because Next.js `dynamic()` doesn't always resolve `@/` alias at runtime (similar to the Jest alias issue from Task 30). This is a known workaround — the import works in both build and runtime.

### Step 4: Run test

```bash
cd frontend && npx jest src/components/chat/__tests__/AvatarStage.test.tsx
```

Expected: PASS (1-2 tests).

### Step 5: Type-check

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit 0.

### Step 6: Stage and report

```bash
cd "D:/Project/ViTale" && git add frontend/src/components/chat/AvatarStage.tsx frontend/src/components/chat/__tests__/AvatarStage.test.tsx
git diff --staged --stat
```

## Suggested commit message

```
feat(chat): add AvatarStage full-bleed backdrop with dynamic 3D import
```

## Acceptance criteria

- [ ] Jest test passes (1 or 2 tests depending on which version of test file used)
- [ ] Component at `frontend/src/components/chat/AvatarStage.tsx`
- [ ] Test at `frontend/src/components/chat/__tests__/AvatarStage.test.tsx`
- [ ] Uses `var(--color-mai-night)`, `var(--color-mai-silk)`, `var(--color-mai-leaf)` tokens
- [ ] Uses `next/dynamic` for AvatarRenderer import (ssr: false)
- [ ] Embeds `<PersonaIndicator />` from `./`
- [ ] Includes loading spinner with silk color
- [ ] Full-bleed stage (`absolute inset-0`)
- [ ] tsc --noEmit exits 0
- [ ] Only 2 files created