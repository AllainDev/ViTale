'use client';

/**
 * Parse + render the LLM's pseudo-table format as a multi-line bullet list.
 *
 * Bypasses react-markdown table parsing entirely. Each row becomes one
 * bullet item:
 *   • **Title**
 *     Địa chỉ: 13 Bát Đàn, Hoàn Kiếm
 *     Giờ mở: 6h-21h
 *     Giá: 30-60k
 *
 * Returns null if content doesn't look like a table (caller should fall back
 * to markdown rendering).
 */

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function splitIntoRows(content: string): string[] {
  // Normalize: replace row-boundary `|` `|` (with optional space) with `\n|`
  // so each logical row becomes its own line.
  const normalized = content.replace(/\|\s*\|/g, '\n|');
  return normalized.split('\n').map((r) => r.trim()).filter((r) => r.length > 0);
}

function isSeparatorCell(cell: string): boolean {
  return /^-{2,}$/.test(cell.trim());
}

function parseCells(line: string, expectedCols?: number): string[] {
  let working = line.trim();
  if (working.startsWith('|')) working = working.slice(1);
  if (working.endsWith('|')) working = working.slice(0, -1);
  const cells = working.split('|').map((c) => c.trim());
  // If caller tells us how many columns to expect, pad with empty strings
  if (expectedCols !== undefined && cells.length < expectedCols) {
    while (cells.length < expectedCols) cells.push('');
  }
  return cells;
}

/** Like parseCells but drops trailing empty cells (cosmetic only). */
function parseCellsTrim(line: string): string[] {
  const cells = parseCells(line);
  // Drop trailing empties (e.g., `| a | b |` after trim → ['a','b',''] → ['a','b'])
  while (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
  // Also drop LEADING empties
  while (cells.length > 0 && cells[0] === '') cells.shift();
  return cells;
}

/** Detect + extract a table from LLM output. Returns null if not a table. */
export function extractTable(content: string): ParsedTable | null {
  const rows = splitIntoRows(content);

  let sepIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const cells = parseCells(rows[i]);
    if (cells.some(isSeparatorCell) && cells.length >= 2) {
      sepIdx = i;
      break;
    }
  }

  if (sepIdx < 0) return null;

  let header: string[];
  const sepCells = parseCells(rows[sepIdx]);
  if (sepCells.every(isSeparatorCell)) {
    if (sepIdx === 0) return null;
    header = parseCellsTrim(rows[sepIdx - 1]);
    var dataStart = sepIdx + 1;
  } else {
    header = sepCells.filter((c) => !isSeparatorCell(c));
    var dataStart = sepIdx + 1;
  }

  if (header.length < 2) return null;

  const dataRows: string[][] = [];
  for (let i = dataStart; i < rows.length; i++) {
    // Pass expectedCols so empty trailing cells get padded (e.g., `| Phở |` → ['Phở', ''])
    const cells = parseCells(rows[i], header.length);
    if (cells.every(isSeparatorCell)) continue;
    dataRows.push(cells);
  }

  if (dataRows.length === 0) return null;

  return { headers: header, rows: dataRows };
}

interface TableParts {
  /** Text before the table. */
  before: string;
  /** Extracted table or null. */
  table: ParsedTable | null;
  /** Text after the table. */
  after: string;
}

/**
 * Split content into 3 parts: text-before-table, table, text-after-table.
 * Useful when LLM emits intro/closing paragraphs around the table data —
 * we want to render each part with the right component (markdown vs table).
 */
export function splitAroundTable(content: string): TableParts {
  const normalized = content.replace(/\|\s*\|/g, '\n|');
  const lines = normalized.split('\n').map((r) => r.trim()).filter((r) => r.length > 0);

  // Find separator row
  let sepIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = parseCells(lines[i]);
    if (cells.some(isSeparatorCell) && cells.length >= 2) {
      sepIdx = i;
      break;
    }
  }

  if (sepIdx < 0) {
    return { before: content, table: null, after: '' };
  }

  // Determine the extent of the table: from header row to last data row
  let headerIdx: number;
  const sepCells = parseCells(lines[sepIdx]);
  if (sepCells.every(isSeparatorCell)) {
    if (sepIdx === 0) {
      return { before: content, table: null, after: '' };
    }
    headerIdx = sepIdx - 1;
  } else {
    headerIdx = sepIdx;
  }

  // Scan forward from sepIdx+1 to find end of table
  let endIdx = sepIdx;
  const headerCells = sepCells.every(isSeparatorCell)
    ? parseCellsTrim(lines[headerIdx])
    : sepCells.filter((c) => !isSeparatorCell(c));

  if (headerCells.length < 2) {
    return { before: content, table: null, after: '' };
  }

  for (let i = sepIdx + 1; i < lines.length; i++) {
    const cells = parseCells(lines[i]);
    if (cells.length === headerCells.length && !cells.every(isSeparatorCell)) {
      endIdx = i;
    } else {
      break; // table ended
    }
  }

  // Collect before / after from raw content (best-effort: use line boundaries)
  // For simplicity: return the parts as line arrays.
  const beforeLines = lines.slice(0, headerIdx);
  const afterLines = lines.slice(endIdx + 1);

  // Reconstruct the table from these line indices
  const tableRows: string[][] = [];
  for (let i = headerIdx + (sepCells.every(isSeparatorCell) ? 1 : 0); i <= endIdx; i++) {
    const cells = parseCells(lines[i]);
    if (cells.length !== headerCells.length) continue;
    if (cells.every(isSeparatorCell)) continue;
    tableRows.push(cells);
  }

  return {
    before: beforeLines.join('\n'),
    table: { headers: headerCells, rows: tableRows },
    after: afterLines.join('\n'),
  };
}

export function looksLikeTable(content: string): boolean {
  return extractTable(content) !== null;
}

interface TableRendererProps {
  /** Parse the table from this content string. Mutually exclusive with headers/rows. */
  content?: string;
  /** Provide headers directly (when content was already parsed externally). */
  headers?: string[];
  /** Provide rows directly (when content was already parsed externally). */
  rows?: string[][];
}

/** Render extracted table as a multi-line bullet list (one item per row). */
export function TableRenderer({ content, headers: propHeaders, rows: propRows }: TableRendererProps) {
  let headers: string[];
  let rows: string[][];

  if (propHeaders && propRows) {
    headers = propHeaders;
    rows = propRows;
  } else if (content) {
    const table = extractTable(content);
    if (!table) return null;
    headers = table.headers;
    rows = table.rows;
  } else {
    return null;
  }

  const fieldHeaders = headers.slice(1);

  return (
    <ul
      className="my-3 flex flex-col gap-3 list-none p-0 m-0 text-sm"
      role="list"
      aria-label="Danh sách"
    >
      {rows.map((row, rIdx) => {
        const [title, ...fields] = row;
        const fieldPairs = fieldHeaders
          .map((label, i) => ({ label, value: fields[i] ?? '' }))
          .filter((p) => p.value.length > 0);

        return (
          <li
            key={rIdx}
            className="flex items-start gap-2.5 leading-relaxed"
          >
            <span className="text-[var(--color-mai-silk)] mt-1.5 shrink-0 font-bold text-base leading-none">•</span>
            <div className="min-w-0 flex-1">
              {/* Title row */}
              <div className="font-bold text-stone-800 dark:text-gray-100">
                {title}
              </div>

              {/* Field rows: each on its own line, indented to align with title */}
              {fieldPairs.length > 0 && (
                <ul className="mt-1 space-y-0.5 list-none p-0 m-0 pl-0 text-stone-600 dark:text-gray-300">
                  {fieldPairs.map((p, i) => (
                    <li key={i} className="flex gap-2 text-[13px]">
                      <span className="text-stone-400 dark:text-gray-500 shrink-0 min-w-[5rem]">
                        {p.label}:
                      </span>
                      <span className="flex-1 break-words">{p.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}