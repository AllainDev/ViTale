# Task 29 Report: Theme Tokens + CSS Animations

**Status:** DONE
**Date:** 2026-07-14
**Plan task:** Task 1 of 9 in Mai chat redesign
**Brief:** `.superpowers/sdd/workspace/task-29-brief.md`

## What was implemented

Added the "Đêm Hà Nội" palette (5 CSS custom properties) and 2 animation utilities (`animate-pulse-glow`, `animate-slide-up`) to `globals.css`, plus `bg-gradient-radial` shim and `prefers-reduced-motion` overrides. This is the visual foundation all subsequent redesign component tasks will consume.

Two hunks applied to `frontend/src/app/globals.css`:

**Hunk 1 — `@theme` block (lines 6-9 → 6-15)**
- Added 5 mai color tokens with `--color-` prefix required by Tailwind 4 for utility generation.

**Hunk 2 — After `.stamp-entrance` (line 38 → line 75)**
- Added `@keyframes pulse-glow` (silk ribbon box-shadow pulse, 0/16px → 50/32px in D75F4E)
- Added `@keyframes slide-up` (opacity + 8px translateY)
- Added `.animate-pulse-glow` (2s ease-in-out infinite)
- Added `.animate-slide-up` (200ms ease-out)
- Added `.bg-gradient-radial` shim for Tailwind 4 (radial-gradient w/ `--tw-gradient-stops`)
- Added `@media (prefers-reduced-motion: reduce)` block killing animations for 4 classes (`.animate-pulse-glow`, `.animate-slide-up`, `.animate-pulse`, `.animate-fadeIn`)

## Test results

### 1. Tailwind PostCSS compile (functional equivalent of `npx tailwindcss`)

The `tailwindcss` CLI binary is not shipped in this version of Tailwind v4 — only the JS API and `@tailwindcss/postcss` plugin exist (see `frontend/package.json` and `postcss.config.mjs`). I ran the PostCSS plugin directly on `globals.css` — this is the exact path Next.js uses during `next dev`/`next build`.

```
$ node -e "postcss([require('@tailwindcss/postcss')()]).process(css)"
```

Output verified:
- All 5 `--color-mai-*` variables emitted into the generated theme layer (`--color-mai-night: #0E0E27;` …)
- Sentinel class with `bg-mai-silk text-mai-bone bg-mai-night text-mai-silk bg-mai-lotus bg-mai-leaf` resolved to:

```
.sentinel {
    background-color: var(--color-mai-leaf);
    background-color: var(--color-mai-lotus);
    background-color: var(--color-mai-night);
    background-color: var(--color-mai-silk);
    color: var(--color-mai-bone);
    color: var(--color-mai-silk);
}
```

This proves Tailwind 4 generated `bg-mai-*` and `text-mai-*` utility classes correctly. (Known limitation: `animate-pulse-glow` cannot be referenced via `@apply` because it's a plain CSS class, not a Tailwind built-in — but it works correctly via `className="animate-pulse-glow"` in components. This is expected behaviour, not a bug.)

### 2. TypeScript type-check

```
$ cd frontend && npx tsc --noEmit
(no output, exit 0)
```

No type errors. Expected (no TS files were modified in this task).

## Files changed

```
$ git diff --staged --stat
 frontend/src/app/globals.css | 34 ++++++++++++++++++++++++++++++++++
 1 file changed, 34 insertions(+)
```

| Token | Brief hex | In-file hex | Match |
|---|---|---|---|
| mai-night | `#0E0E27` | `#0E0E27` | yes |
| mai-silk | `#D75F4E` | `#D75F4E` | yes |
| mai-lotus | `#E8C4C4` | `#E8C4C4` | yes |
| mai-leaf | `#4A6B5D` | `#4A6B5D` | yes |
| mai-bone | `#F5EFE0` | `#F5EFE0` | yes |

## Self-review findings

- [x] Exact hex values match the brief (0E0E27, D75F4E, E8C4C4, 4A6B5D, F5EFE0)
- [x] `--color-` prefix used (required by Tailwind 4 for utility generation)
- [x] `prefers-reduced-motion` override present, covers 4 animation classes (incl. legacy `animate-fadeIn`)
- [x] Diff clean — only `globals.css` changed
- [x] `tsc --noEmit` passes
- [x] Tokens propagate to generated CSS via the postcss plugin (verified with sentinel)

## Concerns / blockers

None. All acceptance criteria met. No commit made (awaiting user approval of suggested commit message).

## Follow-ups for next tasks

Tasks 30-37 can now consume these tokens directly:
- `text-mai-bone`, `bg-mai-night`, `border-mai-silk`, etc. (utility classes)
- `animate-pulse-glow`, `animate-slide-up` (custom animations)
- `bg-gradient-radial` (radial gradient shim)
- The reduced-motion overrides cover `animate-fadeIn` from earlier work too, so legacy Canvas animations are also accessibility-safe.
