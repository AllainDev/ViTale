### Task 27: Wrap app with ChatProvider in layout.tsx

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Add ChatProvider**

In `layout.tsx`, after `<AuthProvider>`, wrap with `<ChatProvider>`:

```tsx
<LanguageProvider>
  <AuthProvider>
    <ChatProvider>
      {children}
    </ChatProvider>
  </AuthProvider>
</LanguageProvider>
```

Add import at top:

```tsx
import { ChatProvider } from '../context/ChatContext';
```

- [ ] **Step 2: Build check**

Verify HMR picks up changes; no errors in browser console.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat: wrap app with ChatProvider"
```

---

