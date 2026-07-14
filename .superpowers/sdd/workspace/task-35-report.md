# Task 35 Report: GlassChatPanel component

**Status:** DONE_WITH_CONCERNS
**Date:** 2026-07-14
**Plan:** docs/superpowers/plans/2026-07-14-mai-chat-redesign.md (Task 7)

## Summary

Implemented `GlassChatPanel` — the root glass overlay container that composes `MessageBubble`, `SuggestionChips`, and `VoiceInput`. Auto-scrolls to bottom on `messages.length` or `isStreaming` change. Renders welcome state (VI/EN), messages list, streaming indicator, voice input, and footer disclaimer.

## Files

- **Created:** `frontend/src/components/Chat/GlassChatPanel.tsx` (65 lines)
- **Created:** `frontend/src/components/Chat/__tests__/GlassChatPanel.test.tsx` (19 lines)

## TDD Evidence

### RED — test fails before implementation

Command: `cd "D:/Project/ViTale/frontend" && npx jest src/components/chat/__tests__/GlassChatPanel.test.tsx`

Output:
```
FAIL src/components/Chat/__tests__/GlassChatPanel.test.tsx
  ● Test suite failed to run
    Cannot find module '../GlassChatPanel' from 'src/components/Chat/__tests__/GlassChatPanel.test.tsx'
Test Suites: 1 failed, 1 total
Tests:       0 total
```

### GREEN — test passes after implementation

Command: `cd "D:/Project/ViTale/frontend" && npx jest src/components/chat/__tests__/GlassChatPanel.test.tsx`

Output:
```
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        0.558 s
```

### Intermediate failure + fix

Implementing the brief verbatim (`scrollRef.current?.scrollTo(...)`) failed under jsdom:
```
TypeError: scrollRef.current?.scrollTo is not a function
```

Optional chaining `?.` only guards null/undefined — when the property exists but throws, it does not short-circuit. jsdom does not implement `Element.prototype.scrollTo`.

**Fix applied:** explicit `typeof === 'function'` guard around the call.

### Type-check

Command: `cd "D:/Project/ViTale/frontend" && npx tsc --noEmit; echo "EXIT=$?"`

Output: `EXIT=0`

## Staged files

```
frontend/src/components/Chat/GlassChatPanel.tsx                   | 65 ++++++++++++++++++++++
frontend/src/components/Chat/__tests__/GlassChatPanel.test.tsx   | 19 +++++++
2 files changed, 84 insertions(+)
```

## Acceptance criteria

- [x] 2 Jest tests pass
- [x] Component at `frontend/src/components/Chat/GlassChatPanel.tsx`
- [x] Test at `frontend/src/components/Chat/__tests__/GlassChatPanel.test.tsx`
- [x] Uses `var(--color-mai-night)`, `var(--color-mai-silk)`, `var(--color-mai-bone)` tokens
- [x] Imports `<MessageBubble>`, `<SuggestionChips>`, `<VoiceInput>` from `./` (sibling files)
- [x] Renders "Xin chào! Mình là Mai" in VI when empty
- [x] Renders footer disclaimer "AI có thể sai"
- [x] Auto-scrolls on `messages.length` or `isStreaming` change
- [x] `tsc --noEmit` exits 0
- [x] Only 2 files created

## Concerns

1. **Brief divergence on `scrollTo` guard.** The brief used `scrollRef.current?.scrollTo(...)` which crashes in jsdom. I added a `typeof === 'function'` guard. This is functionally identical in real browsers but slightly diverges from the literal brief code. Alternative: polyfill `Element.prototype.scrollTo` in `jest.setup.js`.
2. **Folder case.** Brief references `chat/` (lowercase) but actual filesystem path is `Chat/` (capital C). No functional impact — tests passed under `Chat/`.
3. **No `git commit` performed** per user rule. Files staged only.

## Suggested commit message

```
feat(chat): add GlassChatPanel root overlay with auto-scroll + welcome
```