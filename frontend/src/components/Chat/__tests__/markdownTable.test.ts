import { preprocessTables, looksLikePseudoTable } from '../markdownTable';

describe('preprocessTables', () => {
  it('returns plain text unchanged', () => {
    const input = 'Hello world\nThis is a test';
    expect(preprocessTables(input)).toBe(input);
  });

  it('does not touch real markdown tables (already have separator row)', () => {
    const input = `| Name | Age |
|---|---|
| Alice | 30 |
| Bob | 25 |`;
    // No pseudo-separator → table content stays the same; separator may be
    // normalized to canonical form `| --- | --- |` (equivalent rendering).
    const result = preprocessTables(input);
    expect(result).toContain('| Name | Age |');
    expect(result).toContain('| Alice | 30 |');
    expect(result).toContain('| Bob | 25 |');
    // Separator row should have exactly 2 dashes cells
    expect(result).toMatch(/^\|[-\s|]+\|$/m);
  });

  it('converts single pseudo-table (header on one line, sep on next)', () => {
    const input = `| Tên | Địa chỉ | Giá | --- | --- | --- |
| Phở X | 12 Hàng Bột | 30k |
| Phở Y | 5 Hàng Bông | 40k |`;

    const result = preprocessTables(input);
    // Header row should only have the content cells (no --- markers)
    expect(result).toContain('| Tên | Địa chỉ | Giá |');
    // Separator row with proper --- tokens
    expect(result).toMatch(/\|[-\s|]+\|/); // matches any pipe + dashes pattern
    // Data rows preserved
    expect(result).toContain('| Phở X | 12 Hàng Bột | 30k |');
    expect(result).toContain('| Phở Y | 5 Hàng Bông | 40k |');
  });

  it('handles blank line between header and pseudo-separator', () => {
    const input = `| A | B | --- | --- |

| x | y |
| m | n |`;

    const result = preprocessTables(input);
    expect(result).toContain('| A | B |');
    expect(result).toMatch(/\|[-\s|]+\|/);
    expect(result).toContain('| x | y |');
  });

  it('preserves non-table content around the table', () => {
    const input = `Đây là text trước bảng.

| Tên | Giá | --- | --- |
| Phở | 30k |
| Bún | 25k |

Đây là text sau bảng.`;

    const result = preprocessTables(input);
    expect(result).toContain('Đây là text trước bảng.');
    expect(result).toContain('| Tên | Giá |');
    expect(result).toMatch(/\|[-\s|]+\|/);
    expect(result).toContain('| Phở | 30k |');
    expect(result).toContain('| Bún | 25k |');
    expect(result).toContain('Đây là text sau bảng.');
  });

  it('handles table at end of content without trailing newline', () => {
    const input = `| A | B | --- | --- |
| x | y |`;
    const result = preprocessTables(input);
    expect(result).toContain('| A | B |');
    expect(result).toMatch(/\|[-\s|]+\|/);
    expect(result).toContain('| x | y |');
  });

  it('handles rows without leading pipe', () => {
    const input = `A | B | --- | ---
x | y |
m | n |`;
    const result = preprocessTables(input);
    expect(result).toContain('| A | B |');
    expect(result).toMatch(/\|[-\s|]+\|/);
  });

  it('detects pseudo-table pattern with looksLikePseudoTable', () => {
    expect(looksLikePseudoTable('| A | --- | --- |')).toBe(true);
    expect(looksLikePseudoTable('Just text')).toBe(false);
    expect(looksLikePseudoTable('| A | B |\n|---|---|')).toBe(false);
  });

  it('handles table with separator at the END of header line (mixed)', () => {
    // Header line has content + ---: this is the pattern we expect
    const input = `| Name | Age | --- | --- |
| Alice | 30 |
| Bob | 25 |`;

    const result = preprocessTables(input);
    expect(result).toContain('| Name | Age |');
    expect(result).toMatch(/\|[-\s|]+\|/);
    expect(result).toContain('| Alice | 30 |');
    expect(result).toContain('| Bob | 25 |');
  });

  it('handles ENTIRE table on one line (LLM concatenated)', () => {
    // Real-world: LLM outputs header + separator + ALL data rows on one line
    const input = '| Tên | Địa chỉ | Giá | --- | --- | --- | | Phở X | 12 HBT | 30k | | Phở Y | 5 HBG | 40k |';

    const result = preprocessTables(input);
    expect(result).toContain('| Tên | Địa chỉ | Giá |');
    expect(result).toContain('| Phở X | 12 HBT | 30k |');
    expect(result).toContain('| Phở Y | 5 HBG | 40k |');
    expect(result).toMatch(/\|[-\s|]+\|/);
  });

  it('handles Mai-style long answer with all table data on one line', () => {
    // Real Mai output pattern (long, with Vietnamese text + prices)
    const input = '| Quán | Địa chỉ | Giờ | Giá | --- | --- | --- | --- | | Phở Bát Đàn | 49 Bát Đàn | 6h-21h | 30-50k | | Phở Thìn | 15 Chùa Thống | 6h-21h | 30-50k |';

    const result = preprocessTables(input);
    expect(result).toContain('| Quán | Địa chỉ | Giờ | Giá |');
    expect(result).toContain('| Phở Bát Đàn | 49 Bát Đàn | 6h-21h | 30-50k |');
    expect(result).toContain('| Phở Thìn | 15 Chùa Thống | 6h-21h | 30-50k |');
  });

  it('handles variable-length dashes (-----, ----, etc) as separator marker', () => {
    // Real Mai output uses different dash counts per column
    const input = '| Tên | Địa chỉ | Giờ mở | Giá tham khảo | |-----|-----|-----|------------------| | Phở Bát Đàn | 13 Bát Đàn | 6h-21h | 30-60k |';

    const result = preprocessTables(input);
    expect(result).toContain('| Tên | Địa chỉ | Giờ mở | Giá tham khảo |');
    expect(result).toContain('| Phở Bát Đàn | 13 Bát Đàn | 6h-21h | 30-60k |');
    // Should have proper separator row
    expect(result).toMatch(/^\| --- \| --- \| --- \| --- \|$/m);
  });

  it('handles multi-row single-line tables with variable dashes', () => {
    const input = '| A | B | ---|----| | 1 | 2 | | 3 | 4 | | 5 | 6 |';
    const result = preprocessTables(input);
    expect(result).toContain('| A | B |');
    expect(result).toContain('| 1 | 2 |');
    expect(result).toContain('| 3 | 4 |');
    expect(result).toContain('| 5 | 6 |');
  });
});