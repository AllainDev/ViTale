### Task 26: Wire ChatPanel into Canvas.tsx

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`

- [ ] **Step 1: Import ChatPanel and replace inline chat**

Open `Canvas.tsx`. Find the assistant screen render block (the `activeScreen === "assistant" && user && !chatBlocked && (` section around line 1081). Replace its right half (chat input/form area) with `<ChatPanel />`.

For minimal scope: keep AvatarRenderer on left, ChatPanel on right. The existing 3D avatar rendering stays untouched.

In the assistant screen block, the structure should become roughly:

```tsx
{activeScreen === "assistant" && user && !chatBlocked && (
  <div className="w-full h-[75vh] ... flex flex-col md:flex-row" style={{...}}>
    {/* Left: Avatar (keep existing AvatarRenderer logic) */}
    <div className="md:w-1/2 h-1/2 md:h-full">
      <AvatarRenderer ... />
    </div>
    {/* Right: New ChatPanel */}
    <div className="md:w-1/2 h-1/2 md:h-full border-l border-stone-200">
      <ChatPanel />
    </div>
  </div>
)}
```

Add at top of `Canvas.tsx`:

```tsx
import { ChatPanel } from './Chat/ChatPanel';
```

- [ ] **Step 2: Build via Next.js HMR**

The dev server should pick up changes. Verify no compile errors in browser console.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Canvas.tsx
git commit -m "feat: replace inline chat UI with ChatPanel in Canvas assistant screen"
```

---

