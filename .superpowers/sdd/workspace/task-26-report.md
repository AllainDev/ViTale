# Tasks 26-27 Report: ChatPanel Integration

## Status

Both tasks completed successfully.

- **Task 26 (Wire ChatPanel into Canvas.tsx)** — Done
- **Task 27 (Wrap ChatProvider in layout.tsx)** — Done

## Commit SHAs

- Task 26: `2a433f6` — `feat: replace inline chat UI with ChatPanel in Canvas assistant screen`
- Task 27: `a51223a` — `feat: wrap app with ChatProvider`

Diff stats:
- Task 26: `frontend/src/components/Canvas.tsx` — 16 insertions, 86 deletions
- Task 27: `frontend/src/app/layout.tsx` — 4 insertions, 1 deletion

## Implementation summary

### Task 26 — `frontend/src/components/Canvas.tsx`

- Added `import { ChatPanel } from "./Chat/ChatPanel";`
- Replaced the right-side chat UI block (messages scroll, typing indicator, send form) inside the `activeScreen === "assistant" && user && !chatBlocked` branch with `<ChatPanel />`.
- Left half (`AvatarRenderer` with `animationTag={animTag}`) is preserved exactly. Top status pill (`Nàng Tô Nữ · AI Heritage Guide`) also kept.
- Outer flex container keeps `flex flex-col md:flex-row`; right side uses `md:w-1/2 h-1/2 md:h-full border-l border-stone-200 bg-white` so the panel sits flush on desktop and stacks below the avatar on mobile.
- Per the brief's "minimal scope" guidance, the now-orphaned chat state and handlers in Canvas (`chatHistory`, `chatInput`, `isTyping`, `chatBottomRef`, `handleSendChatMessage`, `triggerSuggestion`, `sessionId`, `lang`, `setLang`, `animTag`, `setAnimTag`, `avatarLoaded`, `setAvatarLoaded`, `audioRef`, `playAudio`) were left in place. `tsc` passes with 0 errors because `noUnusedLocals` is not enabled. These are harmless and the brief explicitly said "DON'T break existing functionality."

### Task 27 — `frontend/src/app/layout.tsx`

- Added `import { ChatProvider } from '../context/ChatContext';`
- Wrapped `{children}` with `<ChatProvider>` inside `<AuthProvider>`:

```tsx
<LanguageProvider>
  <AuthProvider>
    <ChatProvider>
      {children}
    </ChatProvider>
  </AuthProvider>
</LanguageProvider>
```

## tsc output

```
$ cd frontend && npx tsc --noEmit
EXIT=0
```

Zero TypeScript errors after both commits.

## Browser / dev-server observations

Playwright was unavailable (Chrome install failed without admin privileges). Verified via curl smoke test:

- `GET /` → HTTP 200
- `GET /?screen=collections` → HTTP 200
- `GET /?screen=passport` → HTTP 200
- `GET /?screen=assistant&dev=1` → HTTP 200 (~35 KB body)

Page content does NOT contain error markers such as "Module not found", "Failed to compile", or "SyntaxError". Server-side render still gates the ChatPanel behind auth + non-blocked state (it lives inside the existing `activeScreen === "assistant" && user && !chatBlocked` branch), so an anonymous visit lands on the existing "Đăng nhập ngay" prompt — the integration cannot be visually exercised without a logged-in session and a `dev=1` bypass.

The assistant screen requires either:
1. A real JWT cookie (login + already-owned doll), or
2. The `?dev=1` query flag (which sets `chatBlocked = false`), plus a logged-in user.

This gating is pre-existing in Canvas.tsx and is unaffected by these tasks.

## Concerns

1. **Playwright/Chrome not available** in this environment, so end-to-end visual verification (typing into the new ChatPanel, language toggle, send/receive) could not be exercised live. The TypeScript compile passes and the dev server serves all routes, so HMR picked up both edits without complaint.

2. **Dead chat state in Canvas.tsx**: `chatHistory`, `chatInput`, `isTyping`, `chatBottomRef`, `handleSendChatMessage`, `triggerSuggestion`, `sessionId`, `lang`, `animTag`, `avatarLoaded`, `audioRef`, `playAudio`, and the `useEffect`s that reference them, are now unreferenced. They produce no errors today, but they should be cleaned up in a follow-up PR (Task 28 code review or a small refactor task) to avoid drift between two chat systems.

3. **Auth + chat gating still uses Canvas.tsx**: the assistant screen still hides ChatPanel behind the auth/`chatBlocked` check that exists in Canvas.tsx. That logic is now redundant with the new ChatProvider (which would render on any page) but it remains necessary today because the surrounding page is still gated. A future task could move the gated redirect into the page wrapper so ChatPanel can be reused elsewhere (e.g., a floating widget).

4. **No regressions detected** in the home, collections, or passport screens — all still return 200.