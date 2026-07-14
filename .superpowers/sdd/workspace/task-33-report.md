# Task 33 Report: VoiceInput component

**Status:** DONE

## What was implemented

Created `VoiceInput` component — input bar with:
- Mic button (always `disabled`, aria-label "Voice (sắp ra mắt)")
- GPS button (2 visual states: leaf-green when `gps` active, gray when off; calls `requestGps`)
- Textarea (placeholder "Hỏi Mai về Hà Nội...", Enter to submit, Shift+Enter newline)
- Send button (disabled when text empty or `isStreaming`, silk bg when active)
- Footer: keyboard shortcut hint (left) + clear button (right, calls `clearChat`)

Uses `var(--color-mai-silk)`, `var(--color-mai-bone)`, `var(--color-mai-leaf)` design tokens. Reads `useChat()` context.

## Test results

**Jest:** 7/7 tests pass
```
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

**TypeScript:** `npx tsc --noEmit` exits 0

## TDD Evidence

### RED (before implementation)

Command:
```
cd "D:/Project/ViTale/frontend" && npx jest src/components/chat/__tests__/VoiceInput.test.tsx
```

Output:
```
FAIL src/components/Chat/__tests__/VoiceInput.test.tsx
  ● Test suite failed to run
    Cannot find module '../VoiceInput' from 'src/components/Chat/__tests__/VoiceInput.test.tsx'
Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
```

### GREEN (after implementation)

Command:
```
cd "D:/Project/ViTale/frontend" && npx jest src/components/chat/__tests__/VoiceInput.test.tsx
```

Output:
```
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        0.602 s
```

### Type-check

Command: `cd "D:/Project/ViTale/frontend" && npx tsc --noEmit`
Result: `EXIT_CODE=0`

## Files changed

Created (this task only):
- `D:/Project/ViTale/frontend/src/components/chat/VoiceInput.tsx` (97 lines)
- `D:/Project/ViTale/frontend/src/components/chat/__tests__/VoiceInput.test.tsx` (72 lines)

`git diff --staged --stat`:
```
 frontend/src/components/Chat/MessageBubble.tsx     | 68 +++++++++++++++
 frontend/src/components/Chat/SuggestionChips.tsx   | 22 ++---
 frontend/src/components/Chat/VoiceInput.tsx        | 97 ++++++++++++++++++++++
 .../Chat/__tests__/MessageBubble.test.tsx          | 49 +++++++++++
 .../Chat/__tests__/SuggestionChips.test.tsx        | 28 +++++++
 .../components/Chat/__tests__/VoiceInput.test.tsx  | 72 ++++++++++++++++
 6 files changed, 321 insertions(+), 15 deletions(-)
```
(Other entries from prior tasks 31/32 still staged.)

## Self-review findings

- [x] Test written BEFORE implementation (RED captured first)
- [x] All 7 tests passing
- [x] Uses `var(--color-mai-silk)`, `var(--color-mai-bone)`, `var(--color-mai-leaf)` tokens (no hardcoded colors except shadow alpha values)
- [x] Mic button disabled (hardcoded `disabled` attribute + `cursor-not-allowed`)
- [x] GPS 2 visual states (conditional className based on `gps` truthiness)
- [x] Send disabled when empty (text.trim() === '' check) or `isStreaming`
- [x] tsc --noEmit exits 0
- [x] Only 2 files created this task
- [x] Legacy `Chat/ChatInput.tsx` untouched

## Concerns / blockers

None. All 6 steps completed successfully. Workarounds applied:
- `fireEvent` (not `userEvent`)
- Relative path in `jest.mock`: `'../../../context/ChatContext'`
- `import '@testing-library/jest-dom'` at top of test file

## Suggested commit message

```
feat(chat): add VoiceInput with inline mic placeholder, GPS, send
```
