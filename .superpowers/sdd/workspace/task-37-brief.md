# Task 37 Brief: Canvas.tsx integration + cleanup (FINAL TASK)

**Plan:** docs/superpowers/plans/2026-07-14-mai-chat-redesign.md (Task 9)
**Spec:** docs/superpowers/specs/2026-07-14-mai-chat-redesign-design.md

## Goal

The final integration task. Modify `Canvas.tsx` to replace the inline 50/50 chat layout with the new `<AvatarStage /> + <GlassChatPanel />` cinema stage. Delete 4 legacy chat files. This is the biggest single change — Canvas.tsx is ~1570 lines.

## Files

### Modify
- `frontend/src/components/Canvas.tsx` — surgical edits in 2 areas + import update

### Delete (via `git rm`)
- `frontend/src/components/Chat/ChatPanel.tsx`
- `frontend/src/components/Chat/ChatMessage.tsx`
- `frontend/src/components/Chat/ChatInput.tsx`
- `frontend/src/components/Chat/SuggestionChips.tsx` (Task 32 already overwrote this with v2 content; deleting it just removes the tracked legacy file)

### Do NOT touch
- `frontend/src/components/Chat/LanguageToggle.tsx` (kept + modified in Task 30)
- Any other Canvas.tsx content

## Step-by-step

### Step 1: Remove old Chat import from Canvas.tsx

Open `frontend/src/components/Canvas.tsx`. Find line ~48:

```tsx
import { ChatPanel } from "./Chat/ChatPanel";
```

Delete this line entirely.

### Step 2: Remove inline chat state and handlers

Find and DELETE these declarations (Canvas.tsx is ~1570 lines — line numbers may have shifted):

```tsx
// Around line 338-345
const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
  {
    id: "1",
    role: "assistant",
    text: "Xin chào quý khách! ...",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
]);

// Around line 346-347
const [chatInput, setChatInput] = useState("");
const [isTyping, setIsTyping] = useState(false);

// Around line 349
const chatBottomRef = useRef<HTMLDivElement>(null);

// Around line 380-382 (the useEffect that uses chatBottomRef)
useEffect(() => {
  chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [chatHistory, isTyping]);

// Around line 404-449 (handleSendChatMessage)
// Around line 452-457 (triggerSuggestion)
```

**KEEP these:**
- `const [chatBlocked, setChatBlocked] = useState(false);` (line ~348) — still needed for auth gating
- `const { language: currentLanguage, setLanguage: setCurrentLanguage } = useLanguage();` (line ~328) — page-level i18n, not chat-specific
- All other state, handlers, and Canvas.tsx functionality

Also: 
- If `ChatMessage` is no longer used in Canvas.tsx (since chat state is gone), remove the import: `import { ActiveScreen, ViewMode, HeritageNode, HeritageEdge, ChatMessage } from "../types";` → remove `ChatMessage` from this import.
- If `chatApi` is no longer used in Canvas.tsx (since `handleSendChatMessage` is gone), remove the import.

**Important:** Use `Read` first to confirm exact content before deleting. Use Edit tool with `replace_all: false` and unique strings as anchors.

### Step 3: Replace assistant screen layout

Find the assistant screen block (originally around lines 1089-1118, may have shifted). It currently looks like:

```tsx
{activeScreen === "assistant" && user && !chatBlocked && (
  <div className="w-full h-[75vh] min-h-[600px] max-h-[900px] relative overflow-hidden animate-fadeIn flex flex-col md:flex-row" style={{ background: `linear-gradient(135deg, ${brandTheme.primaryColor} 0%, #1c2a1e 100%)` }}>
    {/* Top Status Bar */}
    <div className="absolute top-0 left-0 z-20 p-6 pointer-events-none">
      ...
    </div>

    {/* Left Side: 3D Avatar */}
    <div className="md:w-1/2 h-1/2 md:h-full relative z-0">
      ...
      <AvatarRenderer ... />
      ...
    </div>

    {/* Right Side: New ChatPanel */}
    <div className="md:w-1/2 h-1/2 md:h-full border-l border-stone-200 bg-white">
      <ChatPanel />
    </div>
  </div>
)}
```

REPLACE the entire `<div ...>` and its inner content with:

```tsx
{activeScreen === "assistant" && user && !chatBlocked && (
  <div className="relative w-full h-[calc(100vh-80px)] min-h-[640px] overflow-hidden animate-fadeIn bg-[var(--color-mai-night)]">

    <AvatarStage animTag={animTag} onAvatarLoaded={() => setAvatarLoaded(true)} />

    <GlassChatPanel />

  </div>
)}
```

### Step 4: Add new imports

Find a good place in the imports section (after the existing `import { ChatPanel }` line was, or grouped with other component imports). Add:

```tsx
import { AvatarStage } from "./chat/AvatarStage";
import { GlassChatPanel } from "./chat/GlassChatPanel";
```

### Step 5: Verify Canvas builds

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors. If errors mention `chatHistory`, `chatInput`, `isTyping`, `chatBottomRef`, `handleSendChatMessage`, `triggerSuggestion`, or `ChatPanel` — Step 1-3 weren't complete. Find and remove remaining references.

### Step 6: Verify dev server (optional — may already be running)

If `npm run dev` is not already running:
```bash
cd frontend && npm run dev &
sleep 10
curl -sf "http://localhost:3000/?screen=assistant&dev=1" -o /dev/null && echo "OK: dev server responds"
```

Expected: "OK: dev server responds". If port 3000 busy, skip — Next.js will tell you.

### Step 7: Run all chat tests

```bash
cd frontend && npx jest src/components/chat/
```

Expected: All 25 tests pass (LanguageToggle 3, MessageBubble 6, SuggestionChips 3, VoiceInput 7, PersonaIndicator 2, GlassChatPanel 2, AvatarStage 2).

### Step 8: Visual smoke test request

Tell the user (in your report) that manual visual check is needed. Don't attempt to run dev server in browser — the user must verify visually:

> Manual visual check needed at http://localhost:3000/?screen=assistant&dev=1. Verify:
> - Avatar full-bleed (no margin/border)
> - GlassChatPanel anchored bottom, glass blur visible
> - PersonaIndicator floating pill top center
> - Send a message → bubble appears with silk ribbon style
> - Toggle VI/EN → Mai label updates
> - Toggle GPS → button turns green
> - prefers-reduced-motion enabled in DevTools → animations stop

This is a manual gate — the controller will relay to user. You don't need to wait.

### Step 9: Delete old files

```bash
cd "D:/Project/ViTale" && git rm frontend/src/components/Chat/ChatPanel.tsx frontend/src/components/Chat/ChatMessage.tsx frontend/src/components/Chat/ChatInput.tsx frontend/src/components/Chat/SuggestionChips.tsx
```

Expected: 4 files removed from tracking.

NOTE: If any of the 4 files no longer exist (e.g., SuggestionChips.tsx was already overwritten in Task 32), `git rm` may fail for that file. That's OK — note it in your report and continue.

### Step 10: Final type-check + full test run

```bash
cd frontend && npx tsc --noEmit && npx jest
```

Expected: 0 type errors, all tests pass.

### Step 11: Stage and report

```bash
cd "D:/Project/ViTale" && git add frontend/src/components/Canvas.tsx
git add -u frontend/src/components/Chat/
git status
git diff --staged --stat
```

Report staged files + suggested commit message. **DO NOT commit.**

## Suggested commit message

```
feat(chat): integrate AvatarStage + GlassChatPanel into Canvas assistant screen; remove legacy chat components
```

## Acceptance criteria

- [ ] Canvas.tsx has no references to `chatHistory`, `chatInput`, `isTyping`, `chatBottomRef`, `handleSendChatMessage`, `triggerSuggestion`, or `ChatPanel`
- [ ] Canvas.tsx imports `<AvatarStage>` and `<GlassChatPanel>`
- [ ] Assistant screen layout is now full-bleed stage + glass overlay (not 50/50 split)
- [ ] `npx tsc --noEmit` exits 0
- [ ] All 25+ chat tests pass
- [ ] 4 legacy files deleted from tracking
- [ ] No other Canvas.tsx functionality broken (other screens still work)
- [ ] User will do manual visual check after task complete

## Risk warnings

- Canvas.tsx is ~1570 lines. Use Read first to confirm exact content before editing. Use Edit with unique anchors to avoid accidental replacements.
- If tsc fails after edits, the error message will name the missing symbols — search and fix.
- `git rm` may fail for `SuggestionChips.tsx` if it was already overwritten (Task 32) and the working tree version is what's tracked. That's OK.

## Important user rules

- **DO NOT commit.** Stage files only.
- **DO NOT push.** That's a separate user action.

## Note

This is the final task in the 9-task plan. After this, the controller will do final whole-branch review + ask user about batch commit.