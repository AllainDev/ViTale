'use client';
import { useChat } from '@/context/ChatContext';
import type { ChatMessage } from '@/types/chat';

const TAG_EMOJI: Record<string, string> = {
  WAVE: '👋', SMILE: '😊', NOD: '👍', POINT: '👉', BOW: '🙇', DANCE: '💃',
};

/**
 * Tiny markdown renderer — handles bold, line breaks, lists, headings, inline code.
 * No external deps (react-markdown would be ~50KB).
 * Supports: **bold**, _italic_, `code`, # / ## / ### headers, - / * bullets, 1. numbered lists, plain paragraphs.
 */
function renderMarkdown(text: string, isUserBubble = false): React.ReactNode[] {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Markdown table: | col | col |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push(<MarkdownTable key={key++} lines={tableLines} isUserBubble={isUserBubble} />);
      continue;
    }

    // Heading: # / ## / ###
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const className =
        level === 1 ? 'text-base font-bold mt-2 mb-1' :
        level === 2 ? 'text-sm font-bold mt-2 mb-0.5' :
                      'text-sm font-semibold mt-1.5 mb-0.5';
      blocks.push(<div key={key++} className={className}>{renderInline(content, isUserBubble)}</div>);
      i++;
      continue;
    }

    // Unordered list: - or * (with space)
    if (/^[-*]\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-1.5 ml-1 space-y-1 list-none">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm leading-relaxed">
              <span className={`shrink-0 mt-0.5 ${isUserBubble ? 'text-white/70' : 'text-mai-silk'}`}>•</span>
              <span className="flex-1">{renderInline(item, isUserBubble)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list: 1. / 2.
    if (/^\d+\.\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-1.5 ml-1 space-y-1 list-none counter-reset-[item]">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm leading-relaxed">
              <span className={`font-bold shrink-0 ${isUserBubble ? 'text-white/70' : 'text-mai-silk'}`}>{j + 1}.</span>
              <span className="flex-1">{renderInline(item, isUserBubble)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Plain paragraph (collect consecutive non-special lines)
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' &&
           !lines[i].trim().startsWith('|') && !lines[i].trim().endsWith('|') &&
           !/^#{1,3}\s+/.test(lines[i].trim()) &&
           !/^[-*]\s+/.test(lines[i].trim()) && !/^\d+\.\s+/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="text-sm leading-relaxed my-1.5">
        {paraLines.map((pl, j) => (
          <span key={j}>
            {renderInline(pl, isUserBubble)}
            {j < paraLines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }

  return blocks;
}

/** Render inline markdown: **bold**, _italic_, `code` */
function renderInline(text: string, isUserBubble = false): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Combined regex: **bold** | _italic_ | `code`
  const inlineRe = /(\*\*([^*]+)\*\*)|(_([^_]+)_)|(`([^`]+)`)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = inlineRe.exec(remaining)) !== null) {
    if (m.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, m.index));
    }
    if (m[1]) parts.push(<strong key={key++} className="font-bold text-stone-900 dark:text-gray-100">{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={key++} className="italic">{m[4]}</em>);
    else if (m[5]) parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-stone-100 dark:bg-white/10 text-[var(--color-mai-silk)] font-mono text-xs">{m[5]}</code>);
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex));
  }
  return parts;
}

/** Render markdown table (GFM style) */
function MarkdownTable({ lines, isUserBubble = false }: { lines: string[]; isUserBubble?: boolean }) {
  if (lines.length < 2) {
    return <p className="text-sm">{lines.join('\n')}</p>;
  }
  const headerCells = parseRow(lines[0]);
  const bodyRows = lines.slice(2).map(parseRow); // skip separator (line 1)

  return (
    <div className="my-2 overflow-x-auto rounded-lg border border-mai-silk/20 bg-stone-50/50">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-mai-silk/10 border-b border-mai-silk/30">
            {headerCells.map((cell, j) => (
              <th key={j} className="text-left px-3 py-2 font-semibold text-stone-800">
                {renderInline(cell, isUserBubble)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={ri} className="border-b border-stone-200/60 last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 align-top text-stone-700">
                  {renderInline(cell, isUserBubble)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\||\|$/g, '');
  return trimmed.split('|').map((c) => c.trim());
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const { language } = useChat();
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isStreaming = message.role === 'assistant' && !message.content;

  // Strip [WAVE], [SMILE]... action tags from display content
  const contentStr = message.content || '';
  const displayContent = contentStr.replace(/\[(WAVE|SMILE|NOD|POINT|BOW|DANCE)\]/g, '');
  const tagsInContent = (contentStr.match(/\[(WAVE|SMILE|NOD|POINT|BOW|DANCE)\]/g) || [])
    .map((t) => t.replace(/[\[\]]/g, ''));

  if (isSystem) {
    return (
      <div className="text-center text-xs text-stone-600 dark:text-amber-200
                      bg-amber-50 dark:bg-amber-900/20
                      border border-amber-200 dark:border-amber-700/30
                      rounded-lg px-3 py-2 mx-auto max-w-md transition-colors">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] px-4 py-3 ${
        isUser
          ? 'bg-[var(--color-mai-silk)] text-white rounded-2xl rounded-br-sm shadow-md'
          : `bg-white dark:bg-white/10
             text-stone-800 dark:text-gray-100
             border border-[var(--color-mai-silk)]/30 dark:border-white/15
             shadow-md rounded-2xl rounded-bl-sm
             ${isStreaming ? 'animate-pulse-glow' : ''}`
      }`}>
        <div className="leading-relaxed">
          {renderMarkdown(displayContent.trim(), isUser)}
        </div>

        {!isUser && tagsInContent.length > 0 && (
          <div className="flex gap-1 mt-2 text-sm">
            {tagsInContent.map((tag, i) => (
              <span key={i} title={tag} className="opacity-80">
                {TAG_EMOJI[tag] || tag}
              </span>
            ))}
          </div>
        )}

        {!isUser && (message.toolCalls?.length || 0) > 0 && (
          <details className="mt-2 text-[10px] text-stone-500 dark:text-gray-500">
            <summary className="cursor-pointer hover:text-stone-700 dark:hover:text-gray-300">
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