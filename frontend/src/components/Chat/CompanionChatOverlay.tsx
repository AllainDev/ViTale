'use client';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChat } from '@/context/ChatContext';
import { preprocessTables } from './markdownTable';
import { TableRenderer, looksLikeTable, splitAroundTable } from './TableRenderer';

interface CompanionChatOverlayProps {
  onSuggestionClick: (suggestion: string) => void;
}

/** Reusable Markdown renderer with our styling. */
function MarkdownContent({ content }: { content: string }) {
  if (!content.trim()) return null;
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
             className="text-[var(--color-mai-silk)] underline hover:opacity-80 break-all">
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        code: ({ children }) => (
          <code className="px-1 py-0.5 rounded bg-black/20 text-xs font-mono">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 p-2 rounded bg-black/30 text-xs font-mono overflow-x-auto">{children}</pre>
        ),
        h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[var(--color-mai-silk)] pl-3 my-2 italic opacity-90">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-3 border-white/20" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/** Render content that contains a table: split into intro + table + closing. */
function TableOrSplitContent({ content }: { content: string }) {
  const parts = splitAroundTable(content);

  return (
    <div>
      {parts.before && <MarkdownContent content={parts.before} />}
      {parts.table && <TableRenderer headers={parts.table.headers} rows={parts.table.rows} />}
      {parts.after && <MarkdownContent content={parts.after} />}
    </div>
  );
}

const WELCOME_VI = 'Xin chào! Mình là Mai — hướng dẫn viên Hà Nội của bạn. Hỏi mình bất cứ điều gì về thủ đô nhé!';
const WELCOME_EN = "Hi! I'm Mai — your Hanoi local friend. Ask me anything about the city!";

const SUGGESTIONS_VI = [
  'Phở nào ngon ở Hà Nội?',
  'Lên lịch 1 ngày ở phố cổ',
  'Hồ Gươm có gì hay?',
  'Cách đi từ sân bay về trung tâm?',
];

const SUGGESTIONS_EN = [
  'Best pho in Hanoi?',
  'Plan a day in Old Quarter',
  "What's special about Hoan Kiem Lake?",
  'How to get from airport to city?',
];

export function CompanionChatOverlay({ onSuggestionClick }: CompanionChatOverlayProps) {
  const { messages, isStreaming, language } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current && typeof scrollRef.current.scrollTo === 'function') {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length, isStreaming]);

  const isEmpty = messages.length === 0;
  const welcome = language === 'vi' ? WELCOME_VI : WELCOME_EN;
  const suggestions = language === 'vi' ? SUGGESTIONS_VI : SUGGESTIONS_EN;

  return (
    <div
      ref={scrollRef}
      className="absolute bottom-[8.5rem] left-1/2 -translate-x-1/2 z-20
                 w-full max-w-[95vw] sm:max-w-2xl px-3 sm:px-4 max-h-[35vh] overflow-y-auto
                 flex flex-col gap-2
                 [&::-webkit-scrollbar]:w-1.5
                 [&::-webkit-scrollbar-track]:bg-transparent
                 [&::-webkit-scrollbar-thumb]:bg-white/20
                 [&::-webkit-scrollbar-thumb]:rounded-full"
    >
      {isEmpty ? (
        <>
          {/* Welcome bubble */}
          <div
            data-testid="welcome-bubble"
            className="self-start max-w-[85%]
                       px-4 py-2.5 rounded-2xl
                       bg-white/10 dark:bg-white/5 backdrop-blur-xl
                       border border-white/20
                       text-stone-800 dark:text-gray-100 text-sm"
          >
            {welcome}
          </div>
          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2 mt-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(s)}
                className="px-3 py-1.5 text-xs rounded-full
                           bg-white/10 dark:bg-white/5 backdrop-blur-xl
                           border border-white/20
                           text-stone-700 dark:text-gray-200
                           hover:bg-white/20 dark:hover:bg-white/10
                           transition-colors touch-manipulation"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      ) : (
        messages.map((m) => {
          // Preprocess assistant messages: rewrite pseudo-tables into proper markdown.
          // preprocessTables is a pure function — no need for useMemo here.
          const displayContent = m.role === 'user' ? m.content : preprocessTables(m.content);

          return (
            <div
              key={m.id}
              data-testid={`bubble-${m.role}`}
              className={
                m.role === 'user'
                  ? 'self-end max-w-[80%] sm:max-w-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl ' +
                    'bg-[var(--color-mai-silk)]/30 backdrop-blur-xl ' +
                    'border border-[var(--color-mai-silk)]/40 ' +
                    'text-stone-800 dark:text-gray-100 text-sm whitespace-pre-wrap'
                  : 'self-start max-w-[92%] sm:max-w-2xl px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl ' +
                    'bg-white/10 dark:bg-white/5 backdrop-blur-xl ' +
                    'border border-white/20 ' +
                    'text-stone-800 dark:text-gray-100 text-sm'
              }
            >
              {m.role === 'user' ? (
                displayContent
              ) : looksLikeTable(m.content) ? (
                // Split into intro + table + closing. Render each with appropriate component.
                <TableOrSplitContent content={displayContent} />
              ) : (
                <MarkdownContent content={displayContent} />
              )}
            </div>
          );
        })
      )}

      {/* Streaming indicator */}
      {isStreaming && (
        <div
          data-testid="streaming-indicator"
          className="self-start flex items-center gap-2 px-4 py-2.5 rounded-2xl
                     bg-white/10 dark:bg-white/5 backdrop-blur-xl
                     border border-white/20
                     text-stone-700 dark:text-gray-300 text-xs"
        >
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-[var(--color-mai-silk)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-[var(--color-mai-silk)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-[var(--color-mai-silk)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          {language === 'vi' ? 'Mai đang suy nghĩ...' : 'Mai is thinking...'}
        </div>
      )}
    </div>
  );
}