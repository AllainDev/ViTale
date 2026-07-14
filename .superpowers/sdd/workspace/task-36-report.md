# Task 36 Report: AvatarStage component

**Status:** DONE

## Summary

Created AvatarStage component — full-bleed backdrop with aurora gradient overlay + dynamic 3D avatar import + PersonaIndicator overlay. Both files in `frontend/src/components/chat/`.

## Files created

- `D:/Project/ViTale/frontend/src/components/chat/AvatarStage.tsx` (39 lines)
- `D:/Project/ViTale/frontend/src/components/chat/__tests__/AvatarStage.test.tsx` (31 lines)

## TDD Evidence

### RED (test before implementation)

Command:
```
cd "D:/Project/ViTale/frontend" && npx jest src/components/chat/__tests__/AvatarStage.test.tsx
```

Output (failing):
```
FAIL src/components/Chat/__tests__/AvatarStage.test.tsx
  ● Test suite failed to run
    Cannot find module '../AvatarStage' from 'src/components/Chat/__tests__/AvatarStage.test.tsx'
Tests:       0 total
```

### GREEN (after implementation)

Command:
```
cd "D:/Project/ViTale/frontend" && npx jest src/components/chat/__tests__/AvatarStage.test.tsx
```

Output (passing):
```
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        0.552 s
```

Full version worked — no fallback needed.

### Type check

Command:
```
cd "D:/Project/ViTale/frontend" && npx tsc --noEmit
```

Output: exit 0 (clean, no errors)

### Full chat test suite (regression check)

Command:
```
cd "D:/Project/ViTale/frontend" && npx jest src/components/chat/__tests__/
```

Output:
```
Test Suites: 7 passed, 7 total
Tests:       25 passed, 25 total
```

## Deviations from brief

1. **Path fix**: Brief specified `../../../components/AvatarRenderer` for `dynamic(() => import(...))`. Counted from `src/components/chat/AvatarStage.tsx`, that path resolves to `frontend/components/AvatarRenderer` (wrong). Correct path is `../AvatarRenderer` (one level up from `chat/` to `components/`). Brief's 3-dot path was likely copied from the test file path. Fixed to `../AvatarRenderer`. TypeScript would otherwise fail with `TS2307: Cannot find module`.
2. Test file paths kept as written in brief — they happen to be correct from `__tests__/` (3 levels deep: chat → tests → AvatarStage.test.tsx → ../../../components/AvatarRenderer = src/components/AvatarRenderer ✓).

## Self-Review

- [x] Test passes (2 tests, full version)
- [x] Uses `var(--color-mai-night)`, `var(--color-mai-silk)`, `var(--color-mai-leaf)` tokens
- [x] Uses `next/dynamic` with `ssr: false`
- [x] Embeds `<PersonaIndicator />`
- [x] tsc --noEmit exits 0
- [x] Only 2 files created
- [x] Loading spinner included (silk color, animated)
- [x] Full-bleed stage (`absolute inset-0`)
- [x] Aurora gradient + bottom darkening overlay

## Notes for next task (Task 37: Canvas integration)

- `AvatarStage` consumes `animTag: 'idle' | 'talking'` and `onAvatarLoaded: () => void` — wire these from ChatPanel/Canvas
- `lipsSyncEngine={null}` currently passed; future enhancement could pass a real engine
- AvatarRenderer uses `modelUrl` prop (optional); if 3D model not present at runtime, it shows a fallback message (Vietnamese WebGL warning)
