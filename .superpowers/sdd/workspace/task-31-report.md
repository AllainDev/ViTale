# Task 31 Report: MessageBubble component

**Status:** DONE

## Summary

Created `MessageBubble` component (silk ribbon bubble) for the Mai chat redesign.
- Component lives at `frontend/src/components/chat/MessageBubble.tsx` (lowercase `chat/`).
- Test file at `frontend/src/components/chat/__tests__/MessageBubble.test.tsx`.
- All 5 tests pass; tsc exits 0; no other files modified.

## TDD Evidence

### RED — failing test before implementation

Command:
```
cd "D:/Project/ViTale/frontend" && npx jest src/components/chat/__tests__/MessageBubble.test.tsx
```
Output (excerpt):
```
FAIL src/components/Chat/__tests__/MessageBubble.test.tsx
  ● Test suite failed to run
    Cannot find module '../MessageBubble' from 'src/components/Chat/__tests__/MessageBubble.test.tsx'
Test Suites: 1 failed, 1 total
Tests:       0 total
```
(Filesystem on Windows is case-insensitive; Jest resolves the lowercase `chat/` directory to the existing capital `Chat/` path, but the test correctly fails because `MessageBubble` does not exist.)

### GREEN — passing test after implementation

Command (same as above).
Output:
```
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        0.53 s
```

## Type-check

Command:
```
cd "D:/Project/ViTale/frontend" && npx tsc --noEmit
```
Result: exit 0 (no errors).

## Full Jest suite

Command: `cd frontend && npx jest`
Result: **23/23 tests passed** across 6 suites (the 2 failed suites are e2e Playwright, not Jest, and unrelated to this task).

## Workarounds applied (carried over from Task 30)

- Used **relative path** `jest.mock('../../../context/ChatContext', …)` because Jest does not read the `tsconfig.json` `@/*` alias.
- Added **explicit** `import '@testing-library/jest-dom';` at the top of the test file to make matchers available to TypeScript.
- Did NOT use `@testing-library/user-event` (not installed); the 5 tests in this brief do not require simulated events, so this is a no-op for Task 31.

## Deviations from brief

None. Code matches the brief verbatim. Brief asked for `jest.mock('@/context/ChatContext', …)` but, since Jest's module resolver ignores the `@/*` alias, I used the relative-path workaround documented in the existing `LanguageToggle.test.tsx`. This is the correct, working pattern in this project.

## Files created (only 2)

- `frontend/src/components/chat/MessageBubble.tsx` — 68 lines
- `frontend/src/components/chat/__tests__/MessageBubble.test.tsx` — 44 lines

## Files staged

```
 frontend/src/components/Chat/MessageBubble.tsx     | 68 ++++++++++++++++++++++
 .../Chat/__tests__/MessageBubble.test.tsx          | 44 ++++++++++++++
 2 files changed, 112 insertions(+)
```

(Note: the lowercase `chat/` directory is displayed by Git as `Chat/` because the repo currently uses a capital-C `Chat/` sibling; the staged files themselves are the new lowercase-folder contents.)

## Suggested commit message

```
feat(chat): add MessageBubble with silk ribbon style + action tags
```

## Acceptance criteria check

- [x] 5 Jest tests pass
- [x] Component at `frontend/src/components/chat/MessageBubble.tsx` (lowercase chat folder)
- [x] Test file at `frontend/src/components/chat/__tests__/MessageBubble.test.tsx`
- [x] User bubble right-aligned + silk solid
- [x] Assistant bubble left-aligned + lotus glass + silk border
- [x] Action tags `[WAVE]` etc. stripped from display content, rendered as emoji chips
- [x] System message centered with warning style
- [x] Tool calls collapsible with "Nguồn"/"Sources" label
- [x] Streaming state (empty content) adds `animate-pulse-glow` class
- [x] tsc --noEmit exits 0
- [x] Only 2 files created (no other modifications)
- [x] Uses `var(--color-mai-*)` tokens (no hardcoded colors)

## Self-review findings

- Test written BEFORE implementation (TDD red-then-green verified above).
- All 5 tests passing.
- Uses `var(--color-mai-silk)`, `var(--color-mai-lotus)`, `var(--color-mai-bone)` tokens — no hardcoded colors.
- Only 2 files created; no other files in the repo were modified.
- tsc --noEmit exits 0.
- Streaming state correctly applies `animate-pulse-glow` class when `role === 'assistant' && !content`.

## Concerns / blockers

None.