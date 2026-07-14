# Mai Chat Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Trợ lý 3D Nàng Mai chat UI from flat split-50/50 layout to cinema-stage with composable overlays (avatar backdrop + glass chat panel).

**Architecture:** Approach B — full-bleed avatar backdrop (AvatarStage), floating glass chat panel overlay (GlassChatPanel) anchored bottom, 5 composable components share `useChat()` context. Backend untouched.

**Tech Stack:**
- Next.js 16.2.9 (App Router implicit)
- React 19.2.4 (Server Components by default; `'use client'` for chat)
- Tailwind CSS 4 (`@theme` block in globals.css, no tailwind.config.ts)
- @react-three/fiber 9 + drei 10 (existing AvatarRenderer)
- TypeScript 5, Jest 30 + @testing-library/react 16
- Lucide-react for icons

---

## Global Constraints

These apply to every task. Copy-pasted verbatim from the spec; do not edit per-task.

- **Visual palette** (CSS vars in `@theme`):
  - `--mai-night: #0E0E27` — page background
  - `--mai-silk: #D75F4E` — primary accent (đèn lồng đỏ / ngói đỏ)
  - `--mai-lotus: #E8C4C4` — secondary tint (sen hồng)
  - `--mai-leaf: #4A6B5D` — tertiary (lá sen xanh)
  - `--mai-bone: #F5EFE0` — text on dark (ngà)
- **Typography**: Noto Serif display (already loaded via `--font-serif`), Inter/system body, system mono for timestamps
- **Accessibility**: WCAG AA contrast on dark theme, `aria-label`/`aria-pressed` on icon buttons, `prefers-reduced-motion` must disable pulse/slide animations
- **Naming convention**: New files in `frontend/src/components/Chat/` (capital `Chat/` — same folder as existing chat components, since Windows filesystem is case-insensitive and lowercase `chat/` cannot coexist with `Chat/`. The plan/spec originally intended lowercase; this was relaxed for Windows compatibility. Task 37 cleanup deletes legacy files from this same folder.)
- **No new dependencies**: All icons from `lucide-react`, animations in plain CSS
- **Backend untouched**: No changes to `backend/`, `ChatContext.tsx`, `types/chat.ts`
- **Commit rule**: After every task, **stage files and request user approval before committing**. NEVER auto-commit. Co-authored trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`
- **Component tests** use `@testing-library/react` + `jest.mock` for `useChat`. Test files live in `frontend/src/components/chat/__tests__/` next to components.

---

## File Structure (locked)

### Mới (5 components + 5 test files)
- `frontend/src/components/chat/AvatarStage.tsx`
- `frontend/src/components/chat/PersonaIndicator.tsx`
- `frontend/src/components/chat/GlassChatPanel.tsx`
- `frontend/src/components/chat/MessageBubble.tsx`
- `frontend/src/components/chat/VoiceInput.tsx`
- `frontend/src/components/chat/__tests__/AvatarStage.test.tsx`
- `frontend/src/components/chat/__tests__/PersonaIndicator.test.tsx`
- `frontend/src/components/chat/__tests__/GlassChatPanel.test.tsx`
- `frontend/src/components/chat/__tests__/MessageBubble.test.tsx`
- `frontend/src/components/chat/__tests__/VoiceInput.test.tsx`

### Sửa (3 files)
- `frontend/src/app/globals.css` — extend `@theme` + add animations
- `frontend/src/components/Chat/LanguageToggle.tsx` — restyle for dark glass
- `frontend/src/components/Canvas.tsx` — replace assistant screen with stage + overlay

### Xoá (3 files sau khi integration xong)
- `frontend/src/components/Chat/ChatPanel.tsx`
- `frontend/src/components/Chat/ChatMessage.tsx`
- `frontend/src/components/Chat/ChatInput.tsx`

### Di chuyển (1 file, logic giữ nguyên)
- `frontend/src/components/Chat/SuggestionChips.tsx` → `frontend/src/components/chat/SuggestionChips.tsx` (restyled)

### Không đổi
- `frontend/src/context/ChatContext.tsx`
- `frontend/src/types/chat.ts`
- `frontend/src/components/AvatarRenderer.tsx` (only consumed via dynamic import)

---

## Task 1: Theme Tokens + CSS Animations

**Files:**
- Modify: `frontend/src/app/globals.css:6-9` (extend `@theme`)
- Modify: `frontend/src/app/globals.css:35-38` (add new animations after existing `.animate-fadeIn`)

**Interfaces:**
- Consumes: existing `--font-serif`, `--font-sans` from `@theme`
- Produces: 5 new CSS custom properties (`--color-mai-*`) + 2 animation classes (`animate-pulse-glow`, `animate-slide-up`) + `bg-gradient-radial` utility + `prefers-reduced-motion` override

- [ ] **Step 1: Add color tokens to `@theme` block**

Open `frontend/src/app/globals.css`. Replace the `@theme` block (line 6-9):

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

These Tailwind 4 `@theme` vars auto-generate utilities like `bg-mai-silk`, `text-mai-bone`, `border-mai-silk/30`.

- [ ] **Step 2: Add new animations after existing `.animate-fadeIn`**

In `globals.css`, after line 38 (after `.stamp-entrance`), append:

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

- [ ] **Step 3: Verify Tailwind picks up the tokens**

Run from `frontend/`:
```bash
npx tailwindcss -i src/app/globals.css -o /tmp/test-output.css --content "src/app/page.tsx" 2>&1 | head -20
grep -E "bg-mai-silk|color-mai-silk" /tmp/test-output.css | head -5
```

Expected output: lines containing `bg-mai-silk` and `color-mai-silk`. If empty, check `@theme` syntax — Tailwind 4 requires `--color-*` prefix (not `--mai-*`) for utility generation.

- [ ] **Step 4: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit code 0, no errors. (No ts changes yet, but verifies nothing broken.)

- [ ] **Step 5: Stage and request commit**

```bash
cd "D:/Project/ViTale" && git add frontend/src/app/globals.css
git diff --staged
```

Then ask user: "OK to commit as `chore(theme): add Mai palette + animations for chat redesign`?" Do not commit without approval.

---

## Task 2: LanguageToggle v2 (dark glass style)

**Files:**
- Modify: `frontend/src/components/Chat/LanguageToggle.tsx` (full rewrite, keep file path)

**Interfaces:**
- Consumes: `useChat()` from `@/context/ChatContext` — returns `{ language: 'vi' | 'en', setLanguage: (lang) => void }`
- Produces: dark glass pill toggle with `aria-pressed` on both buttons

- [ ] **Step 1: Write smoke test**

Create `frontend/src/components/Chat/__tests__/LanguageToggle.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageToggle } from '../LanguageToggle';

const mockSetLanguage = jest.fn();
jest.mock('@/context/ChatContext', () => ({
  useChat: () => ({ language: 'vi', setLanguage: mockSetLanguage }),
}));

describe('LanguageToggle', () => {
  beforeEach(() => mockSetLanguage.mockClear());

  it('renders VI and EN buttons', () => {
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'VI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
  });

  it('marks current language as pressed', () => {
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'VI' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls setLanguage when EN clicked', async () => {
    render(<LanguageToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(mockSetLanguage).toHaveBeenCalledWith('en');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx jest src/components/Chat/__tests__/LanguageToggle.test.tsx
```

Expected: FAIL — `LanguageToggle` exists but old version lacks `aria-pressed`, so `expect(...).toHaveAttribute('aria-pressed', 'true')` fails.

- [ ] **Step 3: Rewrite LanguageToggle for dark glass**

Replace full contents of `frontend/src/components/Chat/LanguageToggle.tsx`:

```tsx
'use client';
import { useChat } from '@/context/ChatContext';

export function LanguageToggle() {
  const { language, setLanguage } = useChat();
  const baseBtn = 'px-2.5 py-0.5 text-[10px] font-bold tracking-wider transition-colors';
  return (
    <div
      className="inline-flex rounded-full overflow-hidden border border-white/20"
      role="group"
      aria-label="Language toggle"
    >
      <button
        onClick={() => setLanguage('vi')}
        className={`${baseBtn} ${
          language === 'vi'
            ? 'bg-[var(--color-mai-silk)] text-[var(--color-mai-bone)]'
            : 'text-[var(--color-mai-bone)]/60 hover:text-[var(--color-mai-bone)] hover:bg-white/5'
        }`}
        aria-pressed={language === 'vi'}
      >
        VI
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`${baseBtn} ${
          language === 'en'
            ? 'bg-[var(--color-mai-silk)] text-[var(--color-mai-bone)]'
            : 'text-[var(--color-mai-bone)]/60 hover:text-[var(--color-mai-bone)] hover:bg-white/5'
        }`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx jest src/components/Chat/__tests__/LanguageToggle.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 6: Stage and request commit**

```bash
git add frontend/src/components/Chat/LanguageToggle.tsx frontend/src/components/Chat/__tests__/LanguageToggle.test.tsx
git diff --staged
```

Ask: "Commit as `feat(chat): restyle LanguageToggle for dark glass with aria-pressed`?"

---

## Task 3: MessageBubble component

**Files:**
- Create: `frontend/src/components/chat/MessageBubble.tsx`
- Create: `frontend/src/components/chat/__tests__/MessageBubble.test.tsx`

**Interfaces:**
- Consumes: `useChat()` for `language`; `ChatMessage` from `@/types/chat`
- Produces: `<MessageBubble message={m} />` — silk ribbon bubble (user right-aligned silk, assistant left-aligned lotus glass, system centered warning). Strips `[WAVE]` etc. tags from display content and renders them as emoji chips below.

- [ ] **Step 1: Write component test**

Create `frontend/src/components/chat/__tests__/MessageBubble.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';

jest.mock('@/context/ChatContext', () => ({
  useChat: () => ({ language: 'vi' }),
}));

const baseMsg = { id: '1', timestamp: Date.now() };

describe('MessageBubble', () => {
  it('renders user message right-aligned with silk background', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'user', content: 'Xin chào' }} />);
    const wrap = screen.getByText('Xin chào').closest('div.flex');
    expect(wrap).toHaveClass('justify-end');
  });

  it('renders assistant message left-aligned with lotus glass', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'assistant', content: 'Chào bạn' }} />);
    const wrap = screen.getByText('Chào bạn').closest('div.flex');
    expect(wrap).toHaveClass('justify-start');
  });

  it('strips action tags from display content and renders them as chips', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'assistant', content: 'Chào bạn! [WAVE] [SMILE]' }} />);
    expect(screen.getByText(/Chào bạn!/)).toBeInTheDocument();
    expect(screen.getByText('Chào bạn!').textContent).not.toContain('[WAVE]');
    expect(screen.getByTitle('WAVE')).toHaveTextContent('👋');
    expect(screen.getByTitle('SMILE')).toHaveTextContent('😊');
  });

  it('renders system message centered with warning style', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'system', content: 'Connection lost' }} />);
    expect(screen.getByText('Connection lost').closest('div')).toHaveClass('text-center');
  });

  it('renders collapsible tool calls when present', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'assistant', content: 'OK', toolCalls: ['get_nearby_partners'] }} />);
    expect(screen.getByText('Nguồn')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx jest src/components/chat/__tests__/MessageBubble.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement MessageBubble**

Create `frontend/src/components/chat/MessageBubble.tsx`:

```tsx
'use client';
import { useChat } from '@/context/ChatContext';
import type { ChatMessage } from '@/types/chat';

const TAG_EMOJI: Record<string, string> = {
  WAVE: '👋', SMILE: '😊', NOD: '👍', POINT: '👉', BOW: '🙇', DANCE: '💃',
};

export function MessageBubble({ message }: { message: ChatMessage }) {
  const { language } = useChat();
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isStreaming = message.role === 'assistant' && !message.content;

  const displayContent = message.content.replace(/\[(WAVE|SMILE|NOD|POINT|BOW|DANCE)\]/g, '');
  const tagsInContent = (message.content.match(/\[(WAVE|SMILE|NOD|POINT|BOW|DANCE)\]/g) || [])
    .map((t) => t.replace(/[\[\]]/g, ''));

  if (isSystem) {
    return (
      <div className="text-center text-xs text-[var(--color-mai-silk)]
                      bg-[var(--color-mai-silk)]/10 border border-[var(--color-mai-silk)]/30
                      rounded-lg px-3 py-2 mx-auto max-w-md">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] px-4 py-2.5 ${
        isUser
          ? 'bg-[var(--color-mai-silk)] text-[var(--color-mai-bone)] rounded-2xl rounded-br-sm'
          : `bg-[var(--color-mai-lotus)]/10 backdrop-blur-sm
             text-[var(--color-mai-bone)] border border-[var(--color-mai-silk)]/30
             rounded-2xl rounded-bl-sm
             ${isStreaming ? 'animate-pulse-glow' : ''}`
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {displayContent.trim()}
        </p>

        {!isUser && tagsInContent.length > 0 && (
          <div className="flex gap-1 mt-1.5 text-sm">
            {tagsInContent.map((tag, i) => (
              <span key={i} title={tag} className="opacity-80">
                {TAG_EMOJI[tag] || tag}
              </span>
            ))}
          </div>
        )}

        {!isUser && (message.toolCalls?.length || 0) > 0 && (
          <details className="mt-2 text-[10px] text-[var(--color-mai-bone)]/40">
            <summary className="cursor-pointer hover:text-[var(--color-mai-bone)]/70">
              {language === 'vi' ? 'Nguồn' : 'Sources'}
            </summary>
            <div className="mt-1 space-y-0.5">
              {message.toolCalls?.map((t, i) => (
                <div key={i}>🔧 {t}</div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx jest src/components/chat/__tests__/MessageBubble.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Stage and request commit**

```bash
git add frontend/src/components/chat/MessageBubble.tsx frontend/src/components/chat/__tests__/MessageBubble.test.tsx
git diff --staged
```

Ask: "Commit as `feat(chat): add MessageBubble with silk ribbon style + action tags`?"

---

## Task 4: SuggestionChips v2 (dark glass)

**Files:**
- Create: `frontend/src/components/chat/SuggestionChips.tsx` (move + restyle)
- Create: `frontend/src/components/chat/__tests__/SuggestionChips.test.tsx`
- Delete (after): `frontend/src/components/Chat/SuggestionChips.tsx` (in Task 9 cleanup)

**Interfaces:**
- Consumes: `useChat()` for `sendMessage` + `language`; `ChatMessage` prop
- Produces: dark glass chips that call `sendMessage(text)` on click

- [ ] **Step 1: Write test**

Create `frontend/src/components/chat/__tests__/SuggestionChips.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuggestionChips } from '../SuggestionChips';

const mockSendMessage = jest.fn();
jest.mock('@/context/ChatContext', () => ({
  useChat: () => ({ sendMessage: mockSendMessage, language: 'vi' }),
}));

describe('SuggestionChips', () => {
  beforeEach(() => mockSendMessage.mockClear());

  it('renders fallback suggestions when no tool calls', () => {
    render(<SuggestionChips lastMsg={{ id: '1', role: 'assistant', content: 'Hi', timestamp: 0 }} />);
    expect(screen.getByText(/Kể thêm đi!/)).toBeInTheDocument();
  });

  it('renders tool-specific suggestions', () => {
    render(<SuggestionChips lastMsg={{ id: '1', role: 'assistant', content: 'Quán gần đây', toolCalls: ['get_nearby_partners'], timestamp: 0 }} />);
    expect(screen.getByText(/Có quán nào rẻ hơn/)).toBeInTheDocument();
  });

  it('calls sendMessage on chip click', async () => {
    render(<SuggestionChips lastMsg={{ id: '1', role: 'assistant', content: 'Hi', timestamp: 0 }} />);
    await userEvent.click(screen.getByText(/Kể thêm đi!/));
    expect(mockSendMessage).toHaveBeenCalledWith('Kể thêm đi!');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx jest src/components/chat/__tests__/SuggestionChips.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create new SuggestionChips with dark glass style**

Create `frontend/src/components/chat/SuggestionChips.tsx`:

```tsx
'use client';
import { useChat } from '@/context/ChatContext';
import type { ChatMessage } from '@/types/chat';

const TAG_TOOL_TO_SUGGESTIONS: Record<string, { vi: string[]; en: string[] }> = {
  get_nearby_partners: {
    vi: ['Có quán nào rẻ hơn không?', 'Còn quán nào gần hơn?'],
    en: ['Any cheaper options?', 'Anything closer?'],
  },
  get_nearby_checkpoints: {
    vi: ['Cách đi đến đó?', 'Có gì hay ở đó?'],
    en: ['How to get there?', "What's special about it?"],
  },
  get_checkpoint_details: {
    vi: ['Gần đây có gì hay?', 'Kể thêm về lịch sử?'],
    en: ['What\'s nearby?', 'Tell me more history!'],
  },
  plan_simple_itinerary: {
    vi: ['Có thể thêm quán ăn?', 'Lịch trình buổi tối?'],
    en: ['Can you add restaurants?', 'Evening plan?'],
  },
};

function generateSuggestions(lastMsg: ChatMessage, lang: 'vi' | 'en'): string[] {
  const suggestions: string[] = [];
  for (const tool of lastMsg.toolCalls ?? []) {
    const s = TAG_TOOL_TO_SUGGESTIONS[tool];
    if (s) suggestions.push(...s[lang]);
  }
  suggestions.push(lang === 'vi' ? 'Kể thêm đi!' : 'Tell me more!');
  suggestions.push(lang === 'vi' ? 'Có chỗ nào khác không?' : 'Any other places?');
  return [...new Set(suggestions)].slice(0, 3);
}

export function SuggestionChips({ lastMsg }: { lastMsg: ChatMessage }) {
  const { sendMessage, language } = useChat();
  const suggestions = generateSuggestions(lastMsg, language);

  return (
    <div className="flex flex-wrap gap-2 mt-3 ml-1">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => sendMessage(s)}
          className="px-3 py-1.5 text-xs
                     bg-[var(--color-mai-silk)]/10 hover:bg-[var(--color-mai-silk)]/20
                     border border-[var(--color-mai-silk)]/30 hover:border-[var(--color-mai-silk)]/60
                     rounded-full text-[var(--color-mai-bone)]/90
                     transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
```

Logic identical to old version — only styling differs.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx jest src/components/chat/__tests__/SuggestionChips.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Stage and request commit**

```bash
git add frontend/src/components/chat/SuggestionChips.tsx frontend/src/components/chat/__tests__/SuggestionChips.test.tsx
git diff --staged
```

Ask: "Commit as `feat(chat): add SuggestionChips with dark glass style`?"

NOTE: Old `frontend/src/components/Chat/SuggestionChips.tsx` still exists and is imported by old `ChatPanel.tsx`. We delete it in Task 9 after Canvas integration. Don't delete yet.

---

## Task 5: VoiceInput component

**Files:**
- Create: `frontend/src/components/chat/VoiceInput.tsx`
- Create: `frontend/src/components/chat/__tests__/VoiceInput.test.tsx`

**Interfaces:**
- Consumes: `useChat()` for `sendMessage`, `isStreaming`, `language`, `requestGps`, `gps`, `clearChat`
- Produces: input bar with mic (disabled), GPS (2 states), textarea, send button, footer with clear

- [ ] **Step 1: Write component + interaction test**

Create `frontend/src/components/chat/__tests__/VoiceInput.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceInput } from '../VoiceInput';

const mockSendMessage = jest.fn();
const mockRequestGps = jest.fn();
const mockClearChat = jest.fn();

jest.mock('@/context/ChatContext', () => ({
  useChat: () => ({
    sendMessage: mockSendMessage,
    isStreaming: false,
    language: 'vi',
    requestGps: mockRequestGps,
    gps: null,
    clearChat: mockClearChat,
  }),
}));

describe('VoiceInput', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    mockRequestGps.mockClear();
    mockClearChat.mockClear();
  });

  it('disables send when input is empty', () => {
    render(<VoiceInput />);
    expect(screen.getByRole('button', { name: /gửi/i })).toBeDisabled();
  });

  it('sends message on submit and clears textarea', async () => {
    render(<VoiceInput />);
    const textarea = screen.getByPlaceholderText(/Hỏi Mai/i);
    await userEvent.type(textarea, 'Phở ở đâu?{Enter}');
    expect(mockSendMessage).toHaveBeenCalledWith('Phở ở đâu?');
  });

  it('sends on submit button click', async () => {
    render(<VoiceInput />);
    const textarea = screen.getByPlaceholderText(/Hỏi Mai/i);
    await userEvent.type(textarea, 'Xin chào');
    await userEvent.click(screen.getByRole('button', { name: /gửi/i }));
    expect(mockSendMessage).toHaveBeenCalledWith('Xin chào');
  });

  it('disables mic button (placeholder)', () => {
    render(<VoiceInput />);
    expect(screen.getByRole('button', { name: /voice/i })).toBeDisabled();
  });

  it('calls requestGps when GPS button clicked', async () => {
    render(<VoiceInput />);
    await userEvent.click(screen.getByRole('button', { name: /bật vị trí/i }));
    expect(mockRequestGps).toHaveBeenCalledTimes(1);
  });

  it('calls clearChat when clear button clicked', async () => {
    render(<VoiceInput />);
    await userEvent.click(screen.getByRole('button', { name: /xoá/i }));
    expect(mockClearChat).toHaveBeenCalledTimes(1);
  });

  it('does not send when input has only whitespace', async () => {
    render(<VoiceInput />);
    const textarea = screen.getByPlaceholderText(/Hỏi Mai/i);
    await userEvent.type(textarea, '   {Enter}');
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx jest src/components/chat/__tests__/VoiceInput.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement VoiceInput**

Create `frontend/src/components/chat/VoiceInput.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { Mic, Send, MapPin } from 'lucide-react';

export function VoiceInput() {
  const { sendMessage, isStreaming, language, requestGps, gps, clearChat } = useChat();
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isStreaming) return;
    sendMessage(text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 md:px-6 pb-3 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 p-2
                        bg-black/40 backdrop-blur-xl
                        border border-[var(--color-mai-silk)]/30 rounded-2xl
                        shadow-[0_0_24px_rgba(215,95,78,0.1)]
                        focus-within:border-[var(--color-mai-silk)]/60
                        focus-within:shadow-[0_0_32px_rgba(215,95,78,0.25)]
                        transition-all">

          <button
            type="button"
            onClick={requestGps}
            aria-label={language === 'vi' ? 'Bật vị trí' : 'Enable location'}
            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              gps
                ? 'bg-[var(--color-mai-leaf)]/20 text-[var(--color-mai-leaf)]'
                : 'text-[var(--color-mai-bone)]/40 hover:text-[var(--color-mai-bone)] hover:bg-white/5'
            }`}
          >
            <MapPin className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled
            aria-label={language === 'vi' ? 'Voice (sắp ra mắt)' : 'Voice (coming soon)'}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                       text-[var(--color-mai-bone)]/30 cursor-not-allowed hover:bg-white/5"
          >
            <Mic className="w-4 h-4" />
          </button>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={language === 'vi' ? 'Hỏi Mai về Hà Nội...' : 'Ask Mai about Hanoi...'}
            rows={1}
            className="flex-1 resize-none bg-transparent
                       text-sm text-[var(--color-mai-bone)] placeholder:text-[var(--color-mai-bone)]/30
                       focus:outline-none max-h-32 px-1"
            disabled={isStreaming}
          />

          <button
            type="submit"
            disabled={!text.trim() || isStreaming}
            aria-label={language === 'vi' ? 'Gửi' : 'Send'}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                       bg-[var(--color-mai-silk)] text-[var(--color-mai-bone)]
                       hover:bg-[var(--color-mai-silk)]/90
                       disabled:bg-[var(--color-mai-bone)]/10 disabled:text-[var(--color-mai-bone)]/30
                       disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-1.5 flex justify-between items-center text-[10px] text-[var(--color-mai-bone)]/40">
          <span>
            {language === 'vi' ? 'Enter gửi · Shift+Enter xuống dòng' : 'Enter to send · Shift+Enter newline'}
          </span>
          <button
            type="button"
            onClick={clearChat}
            className="hover:text-[var(--color-mai-silk)] underline"
          >
            {language === 'vi' ? '🗑 Xoá' : '🗑 Clear'}
          </button>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx jest src/components/chat/__tests__/VoiceInput.test.tsx
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Stage and request commit**

```bash
git add frontend/src/components/chat/VoiceInput.tsx frontend/src/components/chat/__tests__/VoiceInput.test.tsx
git diff --staged
```

Ask: "Commit as `feat(chat): add VoiceInput with inline mic placeholder, GPS, send`?"

---

## Task 6: PersonaIndicator component

**Files:**
- Create: `frontend/src/components/chat/PersonaIndicator.tsx`
- Create: `frontend/src/components/chat/__tests__/PersonaIndicator.test.tsx`

**Interfaces:**
- Consumes: `useChat()` for `language`; re-uses `<LanguageToggle />` from `../Chat/LanguageToggle`
- Produces: floating glass pill with status dot + Mai badge + LanguageToggle

- [ ] **Step 1: Write smoke test**

Create `frontend/src/components/chat/__tests__/PersonaIndicator.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { PersonaIndicator } from '../PersonaIndicator';

jest.mock('@/context/ChatContext', () => ({
  useChat: () => ({ language: 'vi' }),
}));

describe('PersonaIndicator', () => {
  it('renders Mai persona badge in VI', () => {
    render(<PersonaIndicator />);
    expect(screen.getByText(/Trợ lý Di sản/i)).toBeInTheDocument();
  });

  it('renders language toggle', () => {
    render(<PersonaIndicator />);
    expect(screen.getByRole('group', { name: /language toggle/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx jest src/components/chat/__tests__/PersonaIndicator.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement PersonaIndicator**

Create `frontend/src/components/chat/PersonaIndicator.tsx`:

```tsx
'use client';
import { useChat } from '@/context/ChatContext';
import { LanguageToggle } from '../Chat/LanguageToggle';
import { Sparkles } from 'lucide-react';

export function PersonaIndicator() {
  const { language } = useChat();
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full
                      bg-black/30 backdrop-blur-xl
                      border border-[var(--color-mai-silk)]/30
                      shadow-[0_0_32px_rgba(215,95,78,0.15)]">
        <span className="w-2 h-2 rounded-full bg-[var(--color-mai-silk)] animate-pulse" />
        <span className="font-serif text-sm font-bold text-[var(--color-mai-bone)] tracking-wide">
          Mai · {language === 'vi' ? 'Trợ lý Di sản' : 'Heritage Guide'}
        </span>
        <Sparkles className="w-3.5 h-3.5 text-[var(--color-mai-silk)]" />
        <div className="w-px h-4 bg-[var(--color-mai-bone)]/20" />
        <LanguageToggle />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx jest src/components/chat/__tests__/PersonaIndicator.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Stage and request commit**

```bash
git add frontend/src/components/chat/PersonaIndicator.tsx frontend/src/components/chat/__tests__/PersonaIndicator.test.tsx
git diff --staged
```

Ask: "Commit as `feat(chat): add PersonaIndicator floating glass pill`?"

---

## Task 7: GlassChatPanel component (root overlay)

**Files:**
- Create: `frontend/src/components/chat/GlassChatPanel.tsx`
- Create: `frontend/src/components/chat/__tests__/GlassChatPanel.test.tsx`

**Interfaces:**
- Consumes: `useChat()` for `messages`, `isStreaming`, `language`; renders `<MessageBubble>`, `<SuggestionChips>`, `<VoiceInput>`
- Produces: bottom-anchored glass overlay with scroll area + welcome state

- [ ] **Step 1: Write component test**

Create `frontend/src/components/chat/__tests__/GlassChatPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { GlassChatPanel } from '../GlassChatPanel';

jest.mock('@/context/ChatContext', () => ({
  useChat: () => ({ messages: [], isStreaming: false, language: 'vi' }),
}));

describe('GlassChatPanel', () => {
  it('renders welcome message when empty (VI)', () => {
    render(<GlassChatPanel />);
    expect(screen.getByText(/Xin chào! Mình là Mai/i)).toBeInTheDocument();
  });

  it('renders footer disclaimer', () => {
    render(<GlassChatPanel />);
    expect(screen.getByText(/AI có thể sai/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx jest src/components/chat/__tests__/GlassChatPanel.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement GlassChatPanel**

Create `frontend/src/components/chat/GlassChatPanel.tsx`:

```tsx
'use client';
import { useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { MessageBubble } from './MessageBubble';
import { SuggestionChips } from './SuggestionChips';
import { VoiceInput } from './VoiceInput';

export function GlassChatPanel() {
  const { messages, isStreaming, language } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  const welcomeMsg = language === 'vi'
    ? 'Xin chào! Mình là Mai — hướng dẫn viên Hà Nội của bạn. Hỏi mình bất cứ điều gì về thủ đô nhé! [WAVE]'
    : "Hi! I'm Mai — your Hanoi local friend. Ask me anything about the city! [WAVE]";

  return (
    <div className="absolute bottom-0 inset-x-0 z-10
                    bg-gradient-to-t from-[var(--color-mai-night)] via-[var(--color-mai-night)]/95 to-transparent
                    backdrop-blur-md border-t border-[var(--color-mai-silk)]/20
                    shadow-[0_-32px_64px_rgba(14,14,39,0.6)]">

      <div ref={scrollRef} className="overflow-y-auto px-4 md:px-6 py-4 max-h-[40vh] min-h-[180px]">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-mai-bone)]/80 mt-6">
            {welcomeMsg}
          </p>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {messages.map((m) => (
              <div key={m.id}>
                <MessageBubble message={m} />
                {m.role === 'assistant' && m === messages[messages.length - 1] && !isStreaming && (
                  <SuggestionChips lastMsg={m} />
                )}
              </div>
            ))}
            {isStreaming && (
              <div className="flex items-center gap-2 text-[var(--color-mai-bone)]/40 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[var(--color-mai-silk)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[var(--color-mai-silk)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[var(--color-mai-silk)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                {language === 'vi' ? 'Mai đang suy nghĩ...' : 'Mai is thinking...'}
              </div>
            )}
          </div>
        )}
      </div>

      <VoiceInput />

      <p className="text-center text-[10px] text-[var(--color-mai-bone)]/40 pb-2">
        {language === 'vi'
          ? 'AI có thể sai. Kiểm tra thông tin quan trọng trước khi đi.'
          : 'AI may be inaccurate. Verify important info before traveling.'}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx jest src/components/chat/__tests__/GlassChatPanel.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Stage and request commit**

```bash
git add frontend/src/components/chat/GlassChatPanel.tsx frontend/src/components/chat/__tests__/GlassChatPanel.test.tsx
git diff --staged
```

Ask: "Commit as `feat(chat): add GlassChatPanel root overlay with auto-scroll + welcome`?"

---

## Task 8: AvatarStage component (full-bleed backdrop)

**Files:**
- Create: `frontend/src/components/chat/AvatarStage.tsx`
- Create: `frontend/src/components/chat/__tests__/AvatarStage.test.tsx`

**Interfaces:**
- Consumes: dynamic import `@/components/AvatarRenderer` (SSR off, lazy). Embeds `<PersonaIndicator />`.
- Produces: full-bleed stage with aurora gradient + centered 3D avatar.

- [ ] **Step 1: Write smoke test (mock AvatarRenderer)**

Create `frontend/src/components/chat/__tests__/AvatarStage.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('@/components/AvatarRenderer', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-avatar">Avatar</div>,
}));

jest.mock('next/dynamic', () => (fn: () => Promise<any>) => {
  const Component = () => {
    require('@/components/AvatarRenderer');
    return null;
  };
  Component.displayName = 'DynamicAvatar';
  return Component;
});

jest.mock('@/context/ChatContext', () => ({
  useChat: () => ({ language: 'vi' }),
}));

import { AvatarStage } from '../AvatarStage';

describe('AvatarStage', () => {
  it('renders the stage container with night background', () => {
    render(<AvatarStage animTag="idle" onAvatarLoaded={() => {}} />);
    const stage = document.querySelector('.absolute.inset-0');
    expect(stage).toBeInTheDocument();
  });

  it('renders the persona indicator overlay', () => {
    render(<AvatarStage animTag="idle" onAvatarLoaded={() => {}} />);
    expect(screen.getByText(/Trợ lý Di sản/i)).toBeInTheDocument();
  });
});
```

NOTE: Mocking `next/dynamic` for tests is tricky. If the test setup fights us, fallback to a manual smoke test that just imports the file:

```tsx
import { render } from '@testing-library/react';
import { AvatarStage } from '../AvatarStage';

test('AvatarStage imports without error', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  expect(() => render(<AvatarStage animTag="idle" onAvatarLoaded={() => {}} />)).not.toThrow();
});
```

Skip the detailed assertions; visual verification happens in Task 9.

- [ ] **Step 2: Run test (verify it runs)**

```bash
cd frontend && npx jest src/components/chat/__tests__/AvatarStage.test.tsx
```

If `next/dynamic` mock fails, replace the test file with the fallback version above. Goal is "doesn't throw", not exhaustive assertions.

- [ ] **Step 3: Implement AvatarStage**

Create `frontend/src/components/chat/AvatarStage.tsx`:

```tsx
'use client';
import dynamic from 'next/dynamic';
import { PersonaIndicator } from './PersonaIndicator';

const AvatarRenderer = dynamic(
  () => import('@/components/AvatarRenderer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--color-mai-silk)]/30 border-t-[var(--color-mai-silk)] animate-spin" />
      </div>
    ),
  }
);

interface AvatarStageProps {
  animTag: 'idle' | 'talking';
  onAvatarLoaded: () => void;
}

export function AvatarStage({ animTag, onAvatarLoaded }: AvatarStageProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--color-mai-night)]">
      <div className="absolute inset-0 bg-gradient-radial from-[var(--color-mai-leaf)]/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-mai-night)] via-transparent to-transparent" />

      <div className="absolute inset-x-0 top-[8%] mx-auto h-[55vh] max-h-[480px]">
        <AvatarRenderer
          lipsSyncEngine={null}
          animationTag={animTag}
          onAvatarLoaded={onAvatarLoaded}
        />
      </div>

      <PersonaIndicator />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify**

```bash
cd frontend && npx jest src/components/chat/__tests__/AvatarStage.test.tsx
```

Expected: PASS (1 test, fallback version).

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Stage and request commit**

```bash
git add frontend/src/components/chat/AvatarStage.tsx frontend/src/components/chat/__tests__/AvatarStage.test.tsx
git diff --staged
```

Ask: "Commit as `feat(chat): add AvatarStage full-bleed backdrop with dynamic 3D import`?"

---

## Task 9: Canvas.tsx integration + cleanup

**Files:**
- Modify: `frontend/src/components/Canvas.tsx:1089-1118` (replace assistant screen layout)
- Modify: `frontend/src/components/Canvas.tsx:1-49` (drop unused imports + state)
- Delete: `frontend/src/components/Chat/ChatPanel.tsx`
- Delete: `frontend/src/components/Chat/ChatMessage.tsx`
- Delete: `frontend/src/components/Chat/ChatInput.tsx`
- Delete: `frontend/src/components/Chat/SuggestionChips.tsx` (already moved to `chat/`)

- [ ] **Step 1: Remove old Chat import and inline chat state**

In `frontend/src/components/Canvas.tsx`:

Find and delete line:
```tsx
import { ChatPanel } from "./Chat/ChatPanel";
```

Find and delete these state declarations (around line 338-349):
```tsx
const [chatHistory, setChatHistory] = useState<ChatMessage[]>([...]);
const [chatInput, setChatInput] = useState("");
const [isTyping, setIsTyping] = useState(false);
```

(Keep `chatBlocked` — still needed for auth gating.)

Find and delete these handlers (around line 404-457):
```tsx
const handleSendChatMessage = ...
const triggerSuggestion = ...
```

Also delete the `useEffect` at line 380-382 (`chatBottomRef.current?.scrollIntoView`) since scroll logic is now in `GlassChatPanel`.

Find `chatBottomRef` declaration at line 349 and delete it. Then delete any remaining references (line 381).

- [ ] **Step 2: Replace assistant screen layout**

Find lines 1089-1118 (the existing `activeScreen === "assistant"` block). Replace the entire inner content of that branch:

OLD (lines 1089-1118, simplified):
```tsx
{activeScreen === "assistant" && user && !chatBlocked && (
  <div className="w-full h-[75vh] min-h-[600px] max-h-[900px] relative overflow-hidden animate-fadeIn flex flex-col md:flex-row" style={{ background: `linear-gradient(135deg, ${brandTheme.primaryColor} 0%, #1c2a1e 100%)` }}>
    {/* Top Status Bar */}
    ...
    {/* Left Side: 3D Avatar */}
    ...
    {/* Right Side: New ChatPanel */}
    <div className="md:w-1/2 h-1/2 md:h-full border-l border-stone-200 bg-white">
      <ChatPanel />
    </div>
  </div>
)}
```

NEW (full replacement):
```tsx
{activeScreen === "assistant" && user && !chatBlocked && (
  <div className="relative w-full h-[calc(100vh-80px)] min-h-[640px] overflow-hidden animate-fadeIn bg-[var(--color-mai-night)]">

    <AvatarStage animTag={animTag} onAvatarLoaded={() => setAvatarLoaded(true)} />

    <GlassChatPanel />

  </div>
)}
```

Add at the top of Canvas.tsx (after existing imports):
```tsx
import { AvatarStage } from "./chat/AvatarStage";
import { GlassChatPanel } from "./chat/GlassChatPanel";
```

- [ ] **Step 3: Verify Canvas builds**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors. If errors mention `chatHistory`, `chatInput`, `isTyping`, etc., Step 1 wasn't complete — find and remove remaining references.

- [ ] **Step 4: Verify dev server boots**

```bash
cd frontend && npm run dev &
sleep 8
curl -sf http://localhost:3000/?screen=assistant -o /dev/null && echo "OK: dev server responds"
```

Expected: "OK: dev server responds". If dev server already running, just check page renders.

- [ ] **Step 5: Run all chat tests**

```bash
cd frontend && npx jest src/components/chat/
```

Expected: All tests pass (LanguageToggle 3, MessageBubble 5, SuggestionChips 3, VoiceInput 7, PersonaIndicator 2, GlassChatPanel 2, AvatarStage 1).

- [ ] **Step 6: Visual smoke test**

Tell user:
> Manual visual check needed at http://localhost:3000/?screen=assistant&dev=1. Verify:
> - Avatar full-bleed (no margin/border)
> - GlassChatPanel anchored bottom, glass blur visible
> - PersonaIndicator floating pill top center
> - Send a message → bubble appears with silk ribbon style
> - Toggle VI/EN → Mai label updates
> - Toggle GPS → button turns green
> - `prefers-reduced-motion` enabled in DevTools → animations stop

Wait for user OK.

- [ ] **Step 7: Delete old files**

```bash
cd "D:/Project/ViTale" && git rm frontend/src/components/Chat/ChatPanel.tsx frontend/src/components/Chat/ChatMessage.tsx frontend/src/components/Chat/ChatInput.tsx frontend/src/components/Chat/SuggestionChips.tsx
```

Expected: 4 files removed from tracking.

- [ ] **Step 8: Final type-check + full test run**

```bash
cd frontend && npx tsc --noEmit && npx jest
```

Expected: 0 type errors, all tests pass.

- [ ] **Step 9: Stage and request commit**

```bash
git add frontend/src/components/Canvas.tsx
git add -u frontend/src/components/Chat/
git status
git diff --staged --stat
```

Ask: "Commit as `feat(chat): integrate AvatarStage + GlassChatPanel into Canvas assistant screen; remove legacy chat components`?"

---

## Acceptance Criteria (cross-task checklist)

After all 9 tasks:

- [ ] Demo URL `http://localhost:3000/?screen=assistant&dev=1` renders the new cinema stage
- [ ] Avatar is full-bleed (no margin, no border, no shadow)
- [ ] GlassChatPanel anchored bottom, semi-transparent over avatar
- [ ] PersonaIndicator floating pill top center, glass blur visible
- [ ] Mai bubbles: left-aligned, lotus glass background, silk border
- [ ] User bubbles: right-aligned, solid silk background, bone text
- [ ] Action tags `[WAVE]`, `[SMILE]` etc. render as emoji chips below bubble
- [ ] Mic button has `disabled` attribute + tooltip "coming soon"
- [ ] GPS button has 2 visual states (gray when off, leaf-green when on)
- [ ] Streaming shows pulse-glow + 3-dot "Mai đang suy nghĩ..." indicator
- [ ] Language toggle VI/EN switches Mai label
- [ ] Suggestion chips appear after last assistant message
- [ ] Footer disclaimer visible
- [ ] `prefers-reduced-motion` disables pulse + slide animations
- [ ] Keyboard: Tab cycles through mic → input → send → clear, focus ring visible
- [ ] Mobile (390×844): chat panel full-width, persona indicator still visible
- [ ] TypeScript: 0 errors
- [ ] All Jest tests pass (~20 tests total)
- [ ] Build succeeds: `cd frontend && npm run build`

---

## Risks & Mitigations (reminder)

| Risk | Mitigation |
|---|---|
| `next/dynamic` mock fights Jest | Use fallback "doesn't throw" test for AvatarStage |
| Tailwind 4 `@theme` color utilities not generated | Verify with `npx tailwindcss` dry-run in Task 1 Step 3 |
| `prefers-reduced-motion` not picked up by Tailwind | Plain CSS in `@media` block, not utility — guaranteed to apply |
| Canvas.tsx has 1500+ lines, hard to edit precisely | Surgical line-targeted edits in Step 1 + Step 2; if errors, revert and re-read lines |
| Old `Chat/` folder still imported elsewhere | `npx tsc --noEmit` will catch missing imports |
| Committing requires user approval | Every task Step 6 (and Task 9 Step 9) explicitly asks before committing |

---

## References

- Spec: `docs/superpowers/specs/2026-07-14-mai-chat-redesign-design.md`
- Original plan: `docs/superpowers/plans/2026-07-14-hanoi-ai-guide.md`
- SDD ledger: `.superpowers/sdd/progress.md`
- Existing chat context: `frontend/src/context/ChatContext.tsx`
- Types: `frontend/src/types/chat.ts`
- Avatar: `frontend/src/components/AvatarRenderer.tsx`
- Next.js 16 dynamic: `frontend/node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`
