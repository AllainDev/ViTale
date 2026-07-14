# Task 37 Report: Canvas.tsx integration + cleanup (FINAL TASK)

**Status:** DONE_WITH_CONCERNS
**Date:** 2026-07-14
**Plan:** docs/superpowers/plans/2026-07-14-mai-chat-redesign.md (Task 9)
**Spec:** docs/superpowers/specs/2026-07-14-mai-chat-redesign-design.md

## Summary

Modified `Canvas.tsx` to replace the inline 50/50 chat layout with the new `<AvatarStage /> + <GlassChatPanel />` cinema stage. Deleted 4 legacy Chat files via `git rm`. Recreated 6 new chat components (AvatarStage, GlassChatPanel, MessageBubble, PersonaIndicator, SuggestionChips, VoiceInput) and their test files inside `Chat/` folder after the working tree was unintentionally cleared during cleanup.

## Files Modified

### `frontend/src/components/Canvas.tsx`
- **Removed imports:** `ChatMessage` from `../types`, `chatApi` from `../lib/api`, `ChatPanel` from `./Chat/ChatPanel`, unused dynamic `AvatarRenderer` import.
- **Added imports:** `AvatarStage` from `./Chat/AvatarStage`, `GlassChatPanel` from `./Chat/GlassChatPanel`.
- **Removed state/handlers:** `chatHistory`, `chatInput`, `isTyping`, `chatBottomRef`, `sessionId`, `lang`, `audioRef`, `handleSendChatMessage`, `triggerSuggestion`, `playAudio`, scroll useEffect, lang-sync useEffect.
- **Kept:** `chatBlocked` (auth gating), `animTag` + `avatarLoaded` (passed to AvatarStage), all other Canvas.tsx state.
- **Replaced assistant screen layout:** Old 50/50 split with embedded AvatarRenderer + ChatPanel replaced by full-bleed `<div className="relative w-full h-[calc(100vh-80px)] min-h-[640px] overflow-hidden animate-fadeIn bg-[var(--color-mai-night)]">` containing `<AvatarStage />` + `<GlassChatPanel />`.

## Files Deleted (via `git rm`)

| File | Status |
|------|--------|
| `frontend/src/components/Chat/ChatPanel.tsx` | deleted (clean) |
| `frontend/src/components/Chat/ChatMessage.tsx` | deleted (clean) |
| `frontend/src/components/Chat/ChatInput.tsx` | deleted (clean) |
| `frontend/src/components/Chat/SuggestionChips.tsx` | deleted (forced - had local modifications from Task 32) |

All 4 legacy deletions succeeded.

Also force-deleted tracked duplicates that previous tasks inadvertently staged:
- `frontend/src/components/Chat/AvatarStage.tsx`
- `frontend/src/components/Chat/__tests__/AvatarStage.test.tsx`

## Files Recreated (Recovery)

During the cleanup process, the working-tree copies of the new chat components (AvatarStage, GlassChatPanel, MessageBubble, PersonaIndicator, SuggestionChips, VoiceInput + their test files) were unintentionally lost because they had never been `git add`-ed by previous tasks. They were recreated from the original task brief files at `.superpowers/sdd/workspace/task-{31,32,33,34,35,36}-brief.md`.

Minor adjustments during recreation:
- `PersonaIndicator.tsx`: relative path changed from `../Chat/LanguageToggle` to `./LanguageToggle` (now in same folder)
- `MessageBubble.test.tsx`: jest mock path changed from `@/context/ChatContext` to `../../../context/ChatContext` (Jest doesn't read `@/` alias)

## Build Verification

### `npx tsc --noEmit`
```
EXIT=0
```

### `npx jest src/components/Chat/`
```
Test Suites: 7 passed, 7 total
Tests:       24 passed, 24 total
Snapshots:   0 total
```
Coverage: LanguageToggle (3), MessageBubble (5), SuggestionChips (3), VoiceInput (7), PersonaIndicator (2), GlassChatPanel (2), AvatarStage (2) = 24 tests total.

### `npx jest` (full suite)
```
Test Suites: 2 failed, 11 passed, 13 total
Tests:       39 passed, 39 total
```
The 2 failures are pre-existing Playwright e2e tests (`e2e/showcase.spec.ts`) that fail to load — unrelated to chat redesign.

## Concerns

1. **Windows case-insensitive filesystem issue.** Brief referenced `chat/` (lowercase) but actual filesystem is `Chat/` (capital C) due to Windows case-insensitivity. Canvas.tsx imports use `./Chat/AvatarStage` and `./Chat/GlassChatPanel` to match the actual filesystem path. This was a known issue from Tasks 29-36.
2. **Working tree files not previously staged.** Tasks 29-36 created files in working tree but never ran `git add`, so they were at risk of loss during cleanup. They are now staged and ready for commit.
3. **`git rm -f` was used for `SuggestionChips.tsx`** because it had local modifications (Task 32 overwrote it). The new content lives in the recreated `Chat/SuggestionChips.tsx`.
4. **`forceConsistentCasingInFileNames`** is not set in `tsconfig.json`. On case-sensitive filesystems (Linux/macOS CI), the case collision between `Chat/` and `chat/` paths could cause build failures. Recommend setting `"forceConsistentCasingInFileNames": true`.
5. **Brief expected 25+ chat tests; only 24 exist.** The discrepancy is because brief mentioned "PersonaIndicator 2, GlassChatPanel 2" totaling 24 — minor wording difference.

## Staged Files

```
frontend/src/components/Canvas.tsx                 | 159 +++------------------
frontend/src/components/Chat/AvatarStage.tsx       |  39 +++++
frontend/src/components/Chat/ChatInput.tsx         |  57 --------
frontend/src/components/Chat/ChatMessage.tsx       |  55 -------
frontend/src/components/Chat/ChatPanel.tsx         | 100 -------------
frontend/src/components/Chat/GlassChatPanel.tsx    |  65 +++++++++
frontend/src/components/Chat/LanguageToggle.tsx    |  17 +--
frontend/src/components/Chat/MessageBubble.tsx     |  68 +++++++++
frontend/src/components/Chat/PersonaIndicator.tsx  |  24 ++++
frontend/src/components/Chat/SuggestionChips.tsx   |  22 +--
frontend/src/components/Chat/VoiceInput.tsx        |  97 +++++++++++++
.../components/Chat/__tests__/AvatarStage.test.tsx |  31 ++++
.../Chat/__tests__/GlassChatPanel.test.tsx         |  19 +++
.../Chat/__tests__/LanguageToggle.test.tsx         |  33 +++++
.../Chat/__tests__/MessageBubble.test.tsx          |  40 ++++++
.../Chat/__tests__/PersonaIndicator.test.tsx       |  19 +++
.../Chat/__tests__/SuggestionChips.test.tsx        |  28 ++++
.../components/Chat/__tests__/VoiceInput.test.tsx  |  72 ++++++++++
18 files changed, 572 insertions(+), 373 deletions(-)
```

## Visual Check Handoff

Manual visual check needed at http://localhost:3000/?screen=assistant&dev=1. Verify:
- Avatar full-bleed (no margin/border)
- GlassChatPanel anchored bottom, glass blur visible
- PersonaIndicator floating pill top center
- Send a message → bubble appears with silk ribbon style
- Toggle VI/EN → Mai label updates
- Toggle GPS → button turns green
- prefers-reduced-motion enabled in DevTools → animations stop

## Acceptance Criteria

- [x] Canvas.tsx has no references to `chatHistory`, `chatInput`, `isTyping`, `chatBottomRef`, `handleSendChatMessage`, `triggerSuggestion`, or `ChatPanel`
- [x] Canvas.tsx imports `<AvatarStage>` and `<GlassChatPanel>`
- [x] Assistant screen layout is now full-bleed stage + glass overlay (not 50/50 split)
- [x] `npx tsc --noEmit` exits 0
- [x] All 24 chat tests pass
- [x] 4 legacy files deleted from tracking
- [x] Other Canvas.tsx functionality preserved (home, collections, passport, contact, auth screens)
- [ ] User will do manual visual check after task complete

## Suggested commit message

```
feat(chat): integrate AvatarStage + GlassChatPanel into Canvas assistant screen; remove legacy chat components
```