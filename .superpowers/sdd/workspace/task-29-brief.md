# Task 29 Brief: Theme Tokens + CSS Animations

**Plan:** docs/superpowers/plans/2026-07-14-mai-chat-redesign.md (Task 1)
**Spec:** docs/superpowers/specs/2026-07-14-mai-chat-redesign-design.md (Visual Direction section)

## Goal

Add the "Đêm Hà Nội" palette (5 CSS custom properties) and 2 animation utilities (`animate-pulse-glow`, `animate-slide-up`) to `globals.css`. Plus `bg-gradient-radial` utility shim and `prefers-reduced-motion` overrides. No tests required (visual + CSS only).

## Files

- **Modify:** `frontend/src/app/globals.css` (lines 6-9 + after line 38)

## Interfaces

- **Consumes:** existing `--font-serif`, `--font-sans` from `@theme` block
- **Produces:** Tailwind 4 utility class generation for `bg-mai-silk`, `text-mai-bone`, etc.

## Step-by-step

### Step 1: Replace the `@theme` block (lines 6-9)

Replace this:
```css
@theme {
  --font-serif: "Noto Serif", var(--font-playfair), serif;
  --font-sans: var(--font-inter), sans-serif;
}
```

With:
```css
@theme {
  --font-serif: "Noto Serif", var(--font-playfair), serif;
  --font-sans: var(--font-inter), sans-serif;

  /* Mai chat redesign — "Đêm Hà Nội" palette */
  --color-mai-night: #0E0E27;
  --color-mai-silk: #D75F4E;
  --color-mai-lotus: #E8C4C4;
  --color-mai-leaf: #4A6B5D;
  --color-mai-bone: #F5EFE0;
}
```

### Step 2: Append animations after line 38

Find the `.stamp-entrance` line. After it, append:
```css
/* Mai chat redesign — silk ribbon pulse + slide-up */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 16px rgba(215, 95, 78, 0.2); }
  50%      { box-shadow: 0 0 32px rgba(215, 95, 78, 0.5); }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
.animate-slide-up   { animation: slide-up 200ms ease-out; }

/* Tailwind 4 utility shim — radial gradient */
.bg-gradient-radial {
  background-image: radial-gradient(ellipse at center, var(--tw-gradient-stops));
}

/* Reduced motion — disable animations for users who request it */
@media (prefers-reduced-motion: reduce) {
  .animate-pulse-glow,
  .animate-slide-up,
  .animate-pulse,
  .animate-fadeIn {
    animation: none !important;
  }
}
```

### Step 3: Verify Tailwind 4 picks up the tokens

Run from `frontend/`:
```bash
npx tailwindcss -i src/app/globals.css -o /tmp/test-output.css --content "src/app/page.tsx" 2>&1 | head -20
grep -E "bg-mai-silk|color-mai-silk" /tmp/test-output.css | head -5
```

Expected: lines containing `bg-mai-silk` and `color-mai-silk`. If empty, check `@theme` syntax — Tailwind 4 requires `--color-*` prefix (not `--mai-*`) for utility generation.

### Step 4: Type-check

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit code 0, no errors. (No ts changes yet, but verifies nothing broken.)

### Step 5: Stage and report (DO NOT commit)

```bash
cd "D:/Project/ViTale" && git add frontend/src/app/globals.css
git diff --staged --stat
```

Report the staged files + suggested commit message in your final report. **Do NOT run `git commit`** — the user must approve the commit message first.

## Suggested commit message

```
chore(theme): add Mai palette + animations for chat redesign
```

## Acceptance criteria

- 5 CSS custom properties exist in `@theme` block: `--color-mai-night`, `--color-mai-silk`, `--color-mai-lotus`, `--color-mai-leaf`, `--color-mai-bone`
- 4 new utility classes available: `animate-pulse-glow`, `animate-slide-up`, `bg-gradient-radial`, plus `prefers-reduced-motion` block
- `npx tailwindcss` confirms `bg-mai-silk` and `color-mai-silk` utilities are generated
- `npx tsc --noEmit` exits 0
- No other files touched
