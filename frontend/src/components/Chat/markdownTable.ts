/**
 * Preprocess LLM-generated pseudo-table format into proper markdown tables.
 *
 * Mai (and other LLMs) often emit a single-line pseudo-table where the header,
 * separator marker, AND all data rows are concatenated on one line. Example:
 *
 *   | Tên | Địa chỉ | Giờ mở | Giá | --- | --- | --- | --- |
 *   | Phở X | 12 Hàng Bột | 6h-21h | 30k |
 *   | Phở Y | 5 Hàng Bông | 7h-20h | 40k |
 *
 * OR worse, everything on one line:
 *
 *   | Tên | Giá | --- | --- | | Phở X | 30k | | Phở Y | 40k |
 *
 * Real markdown requires: header row, separator row (`|---|---|`), then
 * data rows. Without a separator row, react-markdown renders the whole
 * thing as plain paragraph text — which is what users see today.
 *
 * `preprocessTables` rewrites these into proper markdown.
 *
 * Algorithm:
 *  1. Split content on `\n` AND on ` | | ` (row delimiter when LLM
 *     concatenates multiple rows on one line).
 *  2. For each line, count cells by splitting on `|`.
 *  3. If a line has BOTH content cells AND `---` cells (separator marker),
 *     the cells before the separator are the header; the rest is data rows.
 *  4. Rewrite: header row, separator row (`|---|---|`), then data rows.
 */

const SEPARATOR_REGEX = /^-+$/; // matches ---, ----, -----, etc.
const CELL_DELIM = '|';
const ROW_DELIM = ' | | '; // pattern that separates rows on a single line

interface ParsedRow {
  cells: string[];
}

/** Split a single-line pseudo-table row into cells, trimming whitespace. */
function parseRow(line: string): ParsedRow {
  // Handle both "| a | b | c |" and "a | b | c" formats
  const trimmed = line.trim();
  let working = trimmed;
  if (working.startsWith(CELL_DELIM)) working = working.slice(1);
  if (working.endsWith(CELL_DELIM)) working = working.slice(0, -1);
  const cells = working
    .split(CELL_DELIM)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  return { cells };
}

/** Detect if a parsed row is the AI's pseudo-separator (mix of content + dashes). */
function isPseudoSeparatorRow(row: ParsedRow): boolean {
  if (row.cells.length < 2) return false;
  const hasSep = row.cells.some((c) => SEPARATOR_REGEX.test(c));
  const hasContent = row.cells.some((c) => !SEPARATOR_REGEX.test(c));
  return hasSep && hasContent;
}

/** Detect if a parsed row is a PURE separator (all cells are dashes). */
function isPureSeparatorRow(row: ParsedRow): boolean {
  if (row.cells.length < 1) return false;
  return row.cells.every((c) => SEPARATOR_REGEX.test(c));
}

/** Extract just the content cells from a pseudo-separator row. */
function extractHeaderFromSeparator(row: ParsedRow): string[] {
  return row.cells.filter((c) => !SEPARATOR_REGEX.test(c));
}

/**
 * Split a content string into individual lines, treating both `\n` and
 * pipe-boundary patterns (when LLM concatenates multiple rows on one line)
 * as separators. After splitting, each virtual row is trimmed of leading
 * whitespace and (if missing AND it looks like a table row) re-prefixed
 * with `|` so parseRow works uniformly.
 */
function splitToLines(content: string): string[] {
  // First split on newlines
  const newlineLines = content.split('\n');
  // Then split each newline-line on row boundary: `|` (lookbehind) + optional \s* + `|`
  const result: string[] = [];
  for (const line of newlineLines) {
    const subLines = line.split(/(?<=\|)\s*\|/);
    for (const sub of subLines) {
      // Trim leading whitespace
      let normalized = sub.replace(/^\s+/, '');
      // Only re-add leading `|` if the row LOOKS like a table row (≥ 2 pipes).
      // Plain text without multiple `|` should not get a `|` prepended.
      const pipeCount = (normalized.match(/\|/g) || []).length;
      if (normalized && pipeCount >= 2 && !normalized.startsWith(CELL_DELIM)) {
        normalized = CELL_DELIM + ' ' + normalized;
      }
      result.push(normalized);
    }
  }
  return result;
}

/**
 * Process the content and rewrite any detected pseudo-tables into proper
 * markdown. Lines that don't belong to a table are returned as-is.
 */
export function preprocessTables(content: string): string {
  const lines = splitToLines(content);
  const out: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const row = parseRow(line);

    // Case 1: current line IS the pseudo-header (content + --- mixed).
    // Look for data rows AFTER this line.
    if (isPseudoSeparatorRow(row)) {
      const headerCells = extractHeaderFromSeparator(row);
      const separatorCells = headerCells.map(() => '---');
      out.push('| ' + headerCells.join(' | ') + ' |');
      out.push('| ' + separatorCells.join(' | ') + ' |');

      // Collect subsequent rows with the same column count
      let k = i + 1;
      while (k < lines.length) {
        const dataRow = parseRow(lines[k]);
        if (dataRow.cells.length !== headerCells.length) {
          break; // different column count → table ended
        }
        out.push('| ' + dataRow.cells.join(' | ') + ' |');
        k++;
      }
      i = k;
      continue;
    }

    // Case 2: current line is a regular table row (no --- in it).
    // Look ahead up to 3 lines for a separator row (PSEUDO or PURE-dash).
    // For pseudo: header is the current line, separator marker gets rewritten.
    // For pure-dash: header is the current line, separator is already valid,
    //   we just emit header + the pure separator as-is.
    let headerRow: ParsedRow | null = null;
    let separatorIdx = -1;
    let isPureDashSep = false;
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = parseRow(lines[j]);
      if (next.cells.length === 0) continue; // skip blank lines
      if (next.cells.length === row.cells.length) {
        if (isPseudoSeparatorRow(next)) {
          headerRow = row;
          separatorIdx = j;
          isPureDashSep = false;
          break;
        }
        if (isPureSeparatorRow(next)) {
          headerRow = row;
          separatorIdx = j;
          isPureDashSep = true;
          break;
        }
      }
      // Hit a non-separator line that doesn't match → abort
      break;
    }

    if (headerRow && separatorIdx >= 0) {
      const headerCells = headerRow.cells;
      // Always emit proper separator row (|---|---|) regardless of whether
      // the input separator was pure-dash or pseudo-mixed.
      out.push('| ' + headerCells.join(' | ') + ' |');
      out.push('| ' + headerCells.map(() => '---').join(' | ') + ' |');

      let k = separatorIdx + 1;
      while (k < lines.length) {
        const dataRow = parseRow(lines[k]);
        if (dataRow.cells.length !== headerCells.length) {
          break;
        }
        out.push('| ' + dataRow.cells.join(' | ') + ' |');
        k++;
      }
      i = k;
    } else {
      // Not a table header — pass through
      out.push(line);
      i++;
    }
  }

  return out.join('\n');
}

/** Quick sanity check: does this string contain a pseudo-table pattern? */
export function looksLikePseudoTable(content: string): boolean {
  return splitToLines(content).some((line) => {
    const row = parseRow(line);
    return isPseudoSeparatorRow(row);
  });
}