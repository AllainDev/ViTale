'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { chatApi, type ChatResponse } from '../../lib/api';

// Dynamic import — Three.js only loads client-side (no SSR)
const AvatarRenderer = dynamic(() => import('../../components/AvatarRenderer'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-surface)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <span className="spinner" style={{ margin: '0 auto 0.75rem' }} />
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đang tải nhân vật 3D...</p>
      </div>
    </div>
  ),
});

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string | null;
  action?: string | null;
  timestamp: Date;
}

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '1rem',
    }}>
      <div className={`chat-bubble ${msg.role}`}>{msg.content}</div>
      {msg.audioUrl && (
        <audio src={msg.audioUrl} controls autoPlay={!isUser}
          style={{ marginTop: '0.5rem', height: 32, maxWidth: 220 }} />
      )}
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
        {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Hồ Hoàn Kiếm có lịch sử gì?',
  'Món ăn đặc sản Hà Nội?',
  'Văn Miếu xây năm nào?',
  'Phố cổ Hà Nội gồm những phố nào?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'intro',
    role: 'assistant',
    content: 'Xin chào! Tôi là trợ lý ViTale 🎎 Hãy hỏi tôi về lịch sử, văn hoá Hà Nội, hoặc các địa điểm bạn muốn khám phá!',
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [lang, setLang] = useState<'vi-VN' | 'en-US'>('vi-VN');
  const [animTag, setAnimTag] = useState<'idle' | 'talking'>('idle');
  const [show3D, setShow3D] = useState(true);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-detect if model exists; fall back to icon if not
  useEffect(() => {
    fetch('/models/avatar.glb', { method: 'HEAD' })
      .then(r => setShow3D(r.ok))
      .catch(() => setShow3D(false));
  }, []);

  const handleAvatarLoaded = useCallback(() => {
    setAvatarLoaded(true);
  }, []);

  const playAudio = useCallback((url: string) => {
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    setAnimTag('talking');
    audio.play().catch(() => {});
    audio.onended = () => setAnimTag('idle');
    audio.onerror = () => setAnimTag('idle');
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date(),
    }]);
    setLoading(true);
    try {
      const res: ChatResponse = await chatApi.sendMessage(text, sessionId, lang);
      if (res.sessionId) setSessionId(res.sessionId);
      const aiMsg: Message = {
        id: crypto.randomUUID(), role: 'assistant',
        content: res.message, audioUrl: res.audioUrl,
        action: res.action, timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      if (res.audioUrl) playAudio(res.audioUrl);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: '⚠️ Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <main className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* ─── Top bar ─── */}
      <div style={{
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginTop: 'var(--nav-height)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--brand-gold-dim)', border: '2px solid var(--brand-gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
          }}>🎎</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Trợ lý ViTale</div>
            <div style={{ fontSize: '0.65rem', color: loading ? 'var(--brand-purple)' : 'var(--brand-teal)' }}>
              {loading ? '⟳ Đang suy nghĩ...' : animTag === 'talking' ? '🔊 Đang nói...' : '● Sẵn sàng'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className={`btn btn-sm ${show3D ? 'btn-outline' : 'btn-ghost'}`}
            onClick={() => setShow3D(v => !v)}
            style={{ fontSize: '0.75rem' }}
            title="Bật/tắt nhân vật 3D"
          >
            {show3D ? '🎭 3D Bật' : '🎭 3D Tắt'}
          </button>
          <select
            value={lang}
            onChange={e => setLang(e.target.value as 'vi-VN' | 'en-US')}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', borderRadius: 'var(--radius-md)',
              padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            <option value="vi-VN">🇻🇳 VI</option>
            <option value="en-US">🇺🇸 EN</option>
          </select>
        </div>
      </div>

      {/* ─── Main content: 3D left + chat right ─── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* 3D Avatar Panel */}
        {show3D && (
          <div style={{
            width: '38%', maxWidth: 320, minWidth: 200,
            background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-surface) 100%)',
            borderRight: '1px solid var(--border)',
            position: 'relative', flexShrink: 0,
          }}>
            <AvatarRenderer
              lipsSyncEngine={null}
              animationTag={animTag}
              onAvatarLoaded={handleAvatarLoaded}
              isPaused={!show3D}
            />
            {/* Glow overlay bottom */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
              background: 'linear-gradient(transparent, var(--bg-surface))',
              pointerEvents: 'none',
            }} />
            {avatarLoaded && (
              <div style={{
                position: 'absolute', bottom: '0.75rem', left: 0, right: 0,
                textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)',
              }}>
                {animTag === 'talking' ? '🔊 Đang phát âm thanh' : '💬 Chờ câu hỏi của bạn'}
              </div>
            )}
          </div>
        )}

        {/* Chat Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
            {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: '0.35rem', padding: '0.5rem 0', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-gold)',
                    animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips */}
          {messages.length <= 2 && (
            <div style={{ padding: '0 1.25rem 0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', flexShrink: 0 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} className="btn btn-ghost btn-sm"
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  style={{ fontSize: '0.75rem' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={{
            padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)', display: 'flex', gap: '0.65rem',
            alignItems: 'flex-end', flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              className="input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Nhập câu hỏi... (Enter để gửi)"
              rows={1}
              disabled={loading}
              style={{ resize: 'none', minHeight: 42, maxHeight: 120, lineHeight: 1.5 }}
            />
            <button
              className="btn btn-primary"
              onClick={send}
              disabled={!input.trim() || loading}
              style={{ flexShrink: 0, height: 42, paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
            >
              {loading ? <span className="spinner spinner-sm" /> : '➤'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
