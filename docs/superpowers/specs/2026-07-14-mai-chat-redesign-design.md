# Design: Trợ lý 3D Nàng Mai — Cinema Stage Redesign

**Date:** 2026-07-14
**Status:** Approved (design phase)
**Owner:** Duong
**Depends on:** `2026-07-14-hanoi-ai-guide-design.md` (28 tasks đã xong)
**Scope:** Frontend only — không đụng backend, không đụng prompt

---

## Context

Chat UI hiện tại (`ChatPanel.tsx`, Tasks 20-25) là dạng **flat chat list** (header trắng + stone-50 messages + ChatInput). Màn hình "assistant" trong `Canvas.tsx` đang dùng **split 50/50**: avatar bên trái, chat bên phải. Layout này đọng lại 2 vấn đề:

1. **Avatar là decoration, không phải main character.** Mai chỉ chiếm nửa màn hình và không phản ứng gì khi user gõ. Cảm giác như chatbot thường có hình minh hoạ, không phải đang trò chuyện với người.
2. **Chat flat và generic.** Header + bubbles theo style Tailwind mặc định. Không có chất "heritage Việt" — không phản ánh persona "Nàng Mai" và 114 KB entries về văn hoá Hà Nội.

**Mục tiêu redesign:** đưa Mai lên **cinema stage** — avatar full-bleed backdrop, chat là glass overlay floating phía trước, voice inline với input. Trải nghiệm phải đặc trưng Việt, không lẫn vào generic AI chatbot.

---

## Decisions từ brainstorming

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Approach | **B — Stage + composable overlays** | Avatar là main character, chat overlay glass; 5 components composable dễ maintain |
| Layout | **Cinema stage** (avatar backdrop, chat floating overlay) | Đúng persona "trợ lý 3D", khác biệt so với split 50/50 |
| Visual direction | **Modern Vietnamese** (ngói đỏ + lá sen + lụa) | Match brand ViTale, khác biệt với 3 AI defaults (cream serif / dark neon / broadsheet) |
| Typography | **Noto Serif (display) + Inter (body)** | Noto đã có sẵn ở Canvas.tsx, hỗ trợ diacritics Việt tốt |
| Voice UI | **Inline với chat input** (placeholder, không wire audio) | Để slot sẵn, wire phase sau khi có API |
| Scope | **Desktop-first, mobile fallback** | Demo trên laptop, mobile chỉ cần dùng được |
| Signature element | **Silk ribbon chat bubble** | Một góc bubble cong như lụa cuộn, glow terracotta khi streaming |
| Accessibility | WCAG AA contrast, keyboard nav, `prefers-reduced-motion` | Tuân thủ CLAUDE.md |
| Out of scope | Audio playback (đã có `audioUrl` ở backend nhưng UI chưa wire), 3D lip-sync integration, voice STT | Phase sau |

---

## Architecture Overview

### Approach B — Cinema Stage

```
┌─────────────────────────────────────────────────────────────┐
│ AVATAR STAGE (full-bleed backdrop, dark indigo gradient)     │
│                                                             │
│  ┌── PersonaIndicator (top center, glass pill) ──┐          │
│  │  ● Mai · AI Heritage Guide · VI/EN toggle    │          │
│  └───────────────────────────────────────────────┘          │
│                                                             │
│       ┌──────────────────────────┐                          │
│       │                          │                          │
│       │  AvatarRenderer (3D)     │  ← centered, lit         │
│       │  (existing dynamic)      │                          │
│       │                          │                          │
│       └──────────────────────────┘                          │
│                                                             │
│  ╔══════════ GLASS CHAT PANEL (bottom overlay) ════════╗    │
│  ║                                                     ║    │
│  ║  MessageBubble (user, right-aligned)                ║    │
│  ║  MessageBubble (Mai, left-aligned silk)             ║    │
│  ║  MessageBubble (Mai, with action tags)             ║    │
│  ║  SuggestionChips (after last assistant)            ║    │
│  ║  ...                                               ║    │
│  ║                                                     ║    │
│  ║  ┌────────────── VoiceInput bar ──────────────────┐ ║    │
│  ║  │ [🎤] Type hoặc nói...          [Gửi ➤]        │ ║    │
│  ║  └────────────────────────────────────────────────┘ ║    │
│  ║  Footer: "AI có thể sai. Verify trước khi đi."     ║    │
│  ╚═════════════════════════════════════════════════════╝    │
└─────────────────────────────────────────────────────────────┘
```

**Nguyên tắc:**
1. **Stage-first:** Avatar là 100% viewport, không margin, không border, không shadow
2. **Overlay by z-index:** GlassChatPanel `absolute bottom-0`, MessageBubble `relative`, VoiceInput `sticky bottom`
3. **Composition over inheritance:** 5 components composable, không có component cha wrap hết (trừ GlassChatPanel là root overlay container)
4. **Backend untouched:** Vẫn dùng `useChat()` từ `ChatContext.tsx`, không đổi API

---

## Visual Direction — "Đêm Hà Nội"

Tránh 3 AI defaults (cream+terracotta serif, near-black+acid green, broadsheet newspaper) bằng cách pin vào **subject-specific world: đêm Hà Nội với đèn lồng đỏ bên hồ Hoàn Kiếm**.

### Palette (5 named hex)

| Token | Hex | Vai trò | Cảm hứng |
|---|---|---|---|
| `--mai-night` | `#0E0E27` | Page background (deep night sky) | Trời đêm Hà Nội, không pure black |
| `--mai-silk` | `#D75F4E` | Primary accent, signature glow | Đèn lồng đỏ phố cổ / ngói đỏ |
| `--mai-lotus` | `#E8C4C4` | Secondary tint, hover states | Sen hồng nhạt, lụa mềm |
| `--mai-leaf` | `#4A6B5D` | Tertiary accent, persona badge | Lá sen xanh sâu, áo tấm Mai |
| `--mai-bone` | `#F5EFE0` | Text on dark, ivory contrast | Ngà, ánh trăng |

> Tailwind tokens khai báo trong `tailwind.config.ts` (extended colors).

### Typography

| Role | Font | Weight | Use case |
|---|---|---|---|
| Display | Noto Serif (Google Fonts, đã có sẵn ở Canvas.tsx) | 700 | Persona badge "Mai", welcome message |
| Body | Inter (Google Fonts) hoặc system sans fallback | 400/500 | Message bubbles, input, buttons |
| Mono | JetBrains Mono hoặc system mono | 400 | Timestamps, action tags debug |

Type scale (px):
- `xs`: 12 — disclaimer, meta
- `sm`: 14 — body messages, input
- `base`: 16 — primary reading
- `lg`: 18 — section labels
- `xl`: 22 — welcome greeting
- `2xl`: 28 — persona display name

### Layout (căn giữa, có rhythm)

- **Avatar**: centered horizontally, chiếm ~50% viewport height (max 480px), bottom anchor 220px (chừa chỗ cho chat panel)
- **Chat panel**: full-width, max-width 768px, bottom 0, height 40vh, glass effect
- **Persona indicator**: top center, floating pill, glass blur

### Signature element: Silk ribbon bubble

`MessageBubble` của Mai có:
- Background: `bg-[var(--mai-lotus)]/10` (translucent lotus) với `border border-[var(--mai-silk)]/30`
- Border-radius: `1rem 1rem 1rem 0.25rem` (sharp corner bottom-left như lụa cuộn)
- Khi streaming: pulsing glow `shadow-[0_0_24px_var(--mai-silk)]`
- Action tags (`[WAVE]`, `[SMILE]`) inline dưới bubble, font-size xs, color `--mai-silk`

User bubble:
- Background: `bg-[var(--mai-silk)]` (đèn lồng đỏ)
- Text: `text-[var(--mai-bone)]` (ngà)
- Border-radius: `1rem 1rem 0.25rem 1rem` (sharp corner bottom-right, mirror)

### Motion

- **Page load**: Avatar fade-in 600ms ease-out, GlassChatPanel slide-up 400ms ease-out delay 200ms
- **Message arrive**: Bubble slide-up 200ms ease-out
- **Streaming**: Silk bubble pulsing glow 2s infinite
- **Voice button hover**: Scale 1.05, 150ms ease-out
- **`prefers-reduced-motion`**: Tắt pulse, giữ fade cơ bản

---

## Component Spec (5 components)

### 1. `AvatarStage` — full-bleed 3D backdrop

**File:** `frontend/src/components/chat/AvatarStage.tsx`

```tsx
'use client';
import dynamic from 'next/dynamic';
import { PersonaIndicator } from './PersonaIndicator';

// Dynamic import để giữ SSR off + lazy load three.js bundle
const AvatarRenderer = dynamic(
  () => import('@/components/AvatarRenderer'),
  {
    ssr: false,
    loading: () => <StageSkeleton />,
  }
);

interface AvatarStageProps {
  animTag: 'idle' | 'talking';
  onAvatarLoaded: () => void;
}

export function AvatarStage({ animTag, onAvatarLoaded }: AvatarStageProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--mai-night)]">
      {/* Aurora gradient overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-[var(--mai-leaf)]/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--mai-night)] via-transparent to-transparent" />

      {/* Avatar 3D, centered */}
      <div className="absolute inset-x-0 top-[8%] mx-auto h-[55vh] max-h-[480px]">
        <AvatarRenderer
          lipsSyncEngine={null}
          animationTag={animTag}
          onAvatarLoaded={onAvatarLoaded}
        />
      </div>

      {/* Persona indicator floats on top of stage */}
      <PersonaIndicator />
    </div>
  );
}
```

**Props:**
- `animTag: 'idle' | 'talking'` — passed từ ChatContext (sẽ thêm field này vào context ở task riêng)
- `onAvatarLoaded: () => void` — callback khi avatar GLB load xong

**Không thay đổi AvatarRenderer.** Component này chỉ là wrapper với background + PersonaIndicator.

---

### 2. `PersonaIndicator` — top floating pill

**File:** `frontend/src/components/chat/PersonaIndicator.tsx`

```tsx
'use client';
import { useChat } from '@/context/ChatContext';
import { LanguageToggle } from './LanguageToggle';
import { Sparkles } from 'lucide-react';

export function PersonaIndicator() {
  const { language } = useChat();

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full
                      bg-black/30 backdrop-blur-xl
                      border border-[var(--mai-silk)]/30
                      shadow-[0_0_32px_rgba(215,95,78,0.15)]">
        <span className="w-2 h-2 rounded-full bg-[var(--mai-silk)] animate-pulse" />
        <span className="font-serif text-sm font-bold text-[var(--mai-bone)] tracking-wide">
          {language === 'vi' ? 'Mai' : 'Mai'} · {language === 'vi' ? 'Trợ lý Di sản' : 'Heritage Guide'}
        </span>
        <Sparkles className="w-3.5 h-3.5 text-[var(--mai-silk)]" />
        <div className="w-px h-4 bg-[var(--mai-bone)]/20" />
        <LanguageToggle />
      </div>
    </div>
  );
}
```

**Giữ nguyên `LanguageToggle` component** hiện có (Task 21), chỉ restyle cho fit glass context.

---

### 3. `GlassChatPanel` — root overlay container

**File:** `frontend/src/components/chat/GlassChatPanel.tsx`

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

  // Auto-scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  const welcomeMsg = language === 'vi'
    ? 'Xin chào! Mình là Mai — hướng dẫn viên Hà Nội của bạn. Hỏi mình bất cứ điều gì về thủ đô nhé! [WAVE]'
    : "Hi! I'm Mai — your Hanoi local friend. Ask me anything about the city! [WAVE]";

  return (
    <div className="absolute bottom-0 inset-x-0 z-10
                    bg-gradient-to-t from-[var(--mai-night)] via-[var(--mai-night)]/95 to-transparent
                    backdrop-blur-md
                    border-t border-[var(--mai-silk)]/20
                    shadow-[0_-32px_64px_rgba(14,14,39,0.6)]">

      {/* Message scroll area */}
      <div ref={scrollRef} className="overflow-y-auto px-4 md:px-6 py-4 max-h-[40vh] min-h-[180px]">
        {messages.length === 0 ? (
          <WelcomeMessage text={welcomeMsg} />
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
            {isStreaming && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* Suggestion chips (above input) */}
      {messages.length > 0 && <SuggestionChipsRow />}

      {/* Voice input bar */}
      <VoiceInput />

      {/* Footer disclaimer */}
      <p className="text-center text-[10px] text-[var(--mai-bone)]/40 pb-2">
        {language === 'vi'
          ? 'AI có thể sai. Kiểm tra thông tin quan trọng trước khi đi.'
          : 'AI may be inaccurate. Verify important info before traveling.'}
      </p>
    </div>
  );
}
```

---

### 4. `MessageBubble` — silk ribbon bubble

**File:** `frontend/src/components/chat/MessageBubble.tsx`

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
      <div className="text-center text-xs text-[var(--mai-silk)]
                      bg-[var(--mai-silk)]/10 border border-[var(--mai-silk)]/30
                      rounded-lg px-3 py-2 mx-auto max-w-md">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] px-4 py-2.5 ${
        isUser
          ? 'bg-[var(--mai-silk)] text-[var(--mai-bone)] rounded-2xl rounded-br-sm'
          : `bg-[var(--mai-lotus)]/10 backdrop-blur-sm
             text-[var(--mai-bone)] border border-[var(--mai-silk)]/30
             rounded-2xl rounded-bl-sm
             ${isStreaming ? 'animate-pulse-glow' : ''}`
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {displayContent.trim()}
        </p>

        {/* Action tags */}
        {!isUser && tagsInContent.length > 0 && (
          <div className="flex gap-1 mt-1.5 text-sm">
            {tagsInContent.map((tag, i) => (
              <span key={i} title={tag} className="opacity-80">
                {TAG_EMOJI[tag] || tag}
              </span>
            ))}
          </div>
        )}

        {/* Tool calls (collapsible) */}
        {!isUser && (message.toolCalls?.length || 0) > 0 && (
          <details className="mt-2 text-[10px] text-[var(--mai-bone)]/40">
            <summary className="cursor-pointer hover:text-[var(--mai-bone)]/70">
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

**CSS animations** (thêm vào `globals.css`):

```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 16px rgba(215, 95, 78, 0.2); }
  50% { box-shadow: 0 0 32px rgba(215, 95, 78, 0.5); }
}
.animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up { animation: slide-up 200ms ease-out; }

.bg-gradient-radial {
  background-image: radial-gradient(ellipse at center, var(--tw-gradient-stops));
}

@media (prefers-reduced-motion: reduce) {
  .animate-pulse-glow,
  .animate-slide-up,
  .animate-pulse {
    animation: none;
  }
}
```

---

### 5. `VoiceInput` — input bar with mic placeholder

**File:** `frontend/src/components/chat/VoiceInput.tsx`

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
                        border border-[var(--mai-silk)]/30 rounded-2xl
                        shadow-[0_0_24px_rgba(215,95,78,0.1)]
                        focus-within:border-[var(--mai-silk)]/60
                        focus-within:shadow-[0_0_32px_rgba(215,95,78,0.25)]
                        transition-all">

          {/* GPS button */}
          <button
            type="button"
            onClick={requestGps}
            title={language === 'vi' ? 'Bật vị trí' : 'Enable location'}
            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                        transition-colors ${
                          gps
                            ? 'bg-[var(--mai-leaf)]/20 text-[var(--mai-leaf)]'
                            : 'text-[var(--mai-bone)]/40 hover:text-[var(--mai-bone)] hover:bg-white/5'
                        }`}
          >
            <MapPin className="w-4 h-4" />
          </button>

          {/* Voice button (placeholder, no-op) */}
          <button
            type="button"
            disabled
            title={language === 'vi' ? 'Voice (sắp ra mắt)' : 'Voice (coming soon)'}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                       text-[var(--mai-bone)]/30 cursor-not-allowed
                       hover:bg-white/5"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Text input */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={language === 'vi'
              ? 'Hỏi Mai về Hà Nội...'
              : 'Ask Mai about Hanoi...'}
            rows={1}
            className="flex-1 resize-none bg-transparent
                       text-sm text-[var(--mai-bone)] placeholder:text-[var(--mai-bone)]/30
                       focus:outline-none max-h-32 px-1"
            disabled={isStreaming}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!text.trim() || isStreaming}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                       bg-[var(--mai-silk)] text-[var(--mai-bone)]
                       hover:bg-[var(--mai-silk)]/90
                       disabled:bg-[var(--mai-bone)]/10 disabled:text-[var(--mai-bone)]/30
                       disabled:cursor-not-allowed
                       transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-actions */}
        <div className="mt-1.5 flex justify-between items-center text-[10px] text-[var(--mai-bone)]/40">
          <span>
            {language === 'vi' ? 'Enter gửi · Shift+Enter xuống dòng' : 'Enter to send · Shift+Enter newline'}
          </span>
          <button type="button" onClick={clearChat} className="hover:text-[var(--mai-silk)] underline">
            {language === 'vi' ? '🗑 Xoá' : '🗑 Clear'}
          </button>
        </div>
      </div>
    </form>
  );
}
```

---

## Canvas Integration

**File sửa:** `frontend/src/components/Canvas.tsx`

Thay đoạn screen "assistant" hiện tại (line 1089-1118, split 50/50 layout):

```tsx
{activeScreen === "assistant" && user && !chatBlocked && (
  <div className="relative w-full h-[calc(100vh-80px)] min-h-[640px] overflow-hidden animate-fadeIn">

    {/* Stage backdrop */}
    <AvatarStage animTag={animTag} onAvatarLoaded={() => setAvatarLoaded(true)} />

    {/* Chat overlay (replaces ChatPanel) */}
    <GlassChatPanel />

  </div>
)}
```

**Thêm vào Canvas state** (line 332):
```tsx
const [animTag, setAnimTag] = useState<'idle' | 'talking'>('idle');
```
(đã có sẵn)

**Drop import:**
- `import { ChatPanel } from "./Chat/ChatPanel";` → giữ lại vì có thể dùng cho test, hoặc xoá nếu không dùng
- Layout split 50/50 → thay bằng full-bleed stage

**Drop các state không cần nữa trong Canvas:**
- `chatHistory`, `chatInput`, `isTyping`, `chatBlocked` (giữ `chatBlocked` vì vẫn cần gate auth) → chuyển sang dùng `useChat()` từ `ChatContext`
- `triggerSuggestion` → bỏ, suggestion giờ ở SuggestionChips

---

## Files thay đổi / tạo mới

### Mới (5 files)
- `frontend/src/components/chat/AvatarStage.tsx`
- `frontend/src/components/chat/PersonaIndicator.tsx`
- `frontend/src/components/chat/GlassChatPanel.tsx`
- `frontend/src/components/chat/MessageBubble.tsx`
- `frontend/src/components/chat/VoiceInput.tsx`

### Sửa (3 files)
- `frontend/src/components/Canvas.tsx` — replace assistant screen layout, drop inline chat state
- `frontend/src/components/Chat/ChatPanel.tsx` → **xoá** (replaced by GlassChatPanel)
- `frontend/src/components/Chat/SuggestionChips.tsx` — re-export từ `chat/` folder hoặc move vào
- `frontend/src/components/Chat/ChatMessage.tsx` → **xoá** (replaced by MessageBubble)
- `frontend/src/components/Chat/ChatInput.tsx` → **xoá** (replaced by VoiceInput)
- `frontend/src/components/Chat/LanguageToggle.tsx` — giữ nguyên logic, restyle cho dark mode
- `frontend/src/app/globals.css` — thêm CSS animations + gradient-radial utility
- `frontend/tailwind.config.ts` — extend theme với 5 color tokens

### Không đổi
- `frontend/src/context/ChatContext.tsx` — đã có đủ API
- `frontend/src/types/chat.ts` — đã có đủ types
- Backend, API, prompt, KB — không đụng

---

## Migration Plan (an toàn)

1. **Tạo 5 components mới song song** — không sửa Canvas.tsx / ChatPanel.tsx cũ
2. **Switch import trong Canvas.tsx** từ `ChatPanel` → `GlassChatPanel` + `AvatarStage`
3. **Verify visually** ở `localhost:3000/?screen=assistant&dev=1`
4. **Smoke test**: gửi 1 message, kiểm tra streaming + suggestion chips + language toggle
5. **Mobile responsive check**: iPhone 14 viewport (390×844)
6. **Accessibility check**: keyboard tab order, focus ring visible, screen reader labels
7. **Reduced motion**: toggle `prefers-reduced-motion` trong DevTools → confirm animations tắt
8. **Xoá file cũ**: ChatPanel.tsx, ChatMessage.tsx, ChatInput.tsx sau khi verify xong
9. **Commit + PR**

---

## Out of Scope (Phase sau)

- Audio playback UI (backend đã có `audioUrl` ở response — wire sau)
- Voice STT/TTS thực sự (cần API key Whisper / Groq audio)
- 3D lip-sync integration với text streaming (AvatarRenderer đã có `lipsSyncEngine` prop, wire sau)
- Persona animations theo action tags `[WAVE]` etc. (Mai hiện chỉ có idle/talking)
- Mobile-first redesign (giờ là mobile fallback, polish sau)

---

## Acceptance Criteria

- [ ] 5 components mới render đúng trên `localhost:3000/?screen=assistant&dev=1`
- [ ] Avatar full-bleed, không margin, không border, không shadow
- [ ] GlassChatPanel overlay đúng vị trí bottom, không che avatar
- [ ] PersonaIndicator floating pill top center, glass blur visible
- [ ] MessageBubble silk ribbon style (rounded-bl-sm cho Mai, rounded-br-sm cho user)
- [ ] Voice button có disabled state + tooltip "coming soon"
- [ ] Streaming có pulse-glow animation
- [ ] Suggestion chips hiển thị sau last assistant message
- [ ] Language toggle VI/EN hoạt động (đã có sẵn)
- [ ] GPS button có 2 states (off/active)
- [ ] Footer disclaimer hiển thị
- [ ] `prefers-reduced-motion` tắt animation
- [ ] Keyboard nav: Tab qua mic → input → send → clear, focus ring visible
- [ ] Mobile (390×844): chat panel full-width, persona indicator vẫn visible
- [ ] Tsc clean (`npx tsc --noEmit`)
- [ ] Console không có error/warning khi load page

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| AvatarRenderer cần SSR off → có thể gây flash | Dùng `dynamic({ ssr: false })` + `StageSkeleton` loading state |
| Tailwind 4 có breaking changes vs 3 | Verify `tailwind.config.ts` syntax trước khi extend colors |
| Glass blur có thể chậm trên GPU yếu | Test trên hardware Duong (RTX 5070 — không lo) |
| MessageBubble user dùng `--mai-silk` solid có thể clash với action tags | Tags chỉ hiển thị ở Mai bubble, không ở user bubble |
| Streaming glow có thể gây epileptic | Respect `prefers-reduced-motion` |
| Mobile landscape (chat panel chiếm full) | Có thể cần toggle collapse — note phase sau |

---

## References

- Spec gốc: `docs/superpowers/specs/2026-07-14-hanoi-ai-guide-design.md` (28 tasks đã xong)
- SDD ledger: `.superpowers/sdd/progress.md`
- Frontend design skill (visual direction): loaded via `frontend-design:frontend-design`
- Next.js 16 docs: `frontend/node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (cho dynamic imports)