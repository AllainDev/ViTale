import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TableRenderer, extractTable, looksLikeTable } from '../TableRenderer';

describe('extractTable', () => {
  it('extracts table from pseudo-separator (mixed content + dashes)', () => {
    const input = '| Tên | Giá | --- | --- | | Phở | 30k | | Bún | 25k |';
    const result = extractTable(input);
    expect(result).not.toBeNull();
    expect(result?.headers).toEqual(['Tên', 'Giá']);
    expect(result?.rows).toEqual([
      ['Phở', '30k'],
      ['Bún', '25k'],
    ]);
  });

  it('extracts table with pure-dash separator on separate row', () => {
    const input = '| Name | Age |\n|---|---|\n| Alice | 30 |\n| Bob | 25 |';
    const result = extractTable(input);
    expect(result?.headers).toEqual(['Name', 'Age']);
    expect(result?.rows).toEqual([
      ['Alice', '30'],
      ['Bob', '25'],
    ]);
  });

  it('extracts Mai-style long answer (single line, variable dashes)', () => {
    const input = '| Tên | Địa chỉ | Giờ mở | Giá tham khảo | |-----|-----|-----|------------------| | Phở Bát Đàn | 13 Bát Đàn | 6h-21h | 30-60k | | Phở Thìn | 15 Chùa Thống | 6h-21h | 30-50k |';
    const result = extractTable(input);
    expect(result?.headers).toEqual(['Tên', 'Địa chỉ', 'Giờ mở', 'Giá tham khảo']);
    expect(result?.rows).toHaveLength(2);
    expect(result?.rows[0][0]).toBe('Phở Bát Đàn');
  });

  it('returns null for plain text', () => {
    expect(extractTable('Hello world')).toBeNull();
    expect(extractTable('No pipes here at all.')).toBeNull();
  });

  it('returns null when no separator marker found', () => {
    const input = '| A | B |\n| C | D |';
    expect(extractTable(input)).toBeNull();
  });
});

describe('looksLikeTable', () => {
  it('returns true for table content', () => {
    expect(looksLikeTable('| A | B | --- | --- | | x | y |')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(looksLikeTable('Just text')).toBe(false);
  });
});

describe('TableRenderer (multi-line bullet list)', () => {
  it('renders nothing for non-table content', () => {
    const { container } = render(<TableRenderer content="Hello world" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one top-level bullet per row', () => {
    const input = '| Tên | Giá | --- | --- | | Phở X | 30k | | Bún Y | 25k |';
    const { container } = render(<TableRenderer content={input} />);
    // 2 outer bullets (one per row)
    const outer = container.querySelector('ul[role="list"]');
    expect(outer?.querySelectorAll(':scope > li').length).toBe(2);
    expect(screen.getByText('Phở X')).toBeInTheDocument();
    expect(screen.getByText('Bún Y')).toBeInTheDocument();
  });

  it('renders each field on its OWN line (not inline ·)', () => {
    const input = '| Tên | Giá | --- | --- | | Phở | 30k |';
    const { container } = render(<TableRenderer content={input} />);
    // Inner sub-list should have 1 li (one field: "Giá")
    const inner = container.querySelector('ul ul');
    expect(inner?.querySelectorAll('li').length).toBe(1);
  });

  it('renders Mai-style 4-column data with separate field lines', () => {
    const input = '| Tên | Địa chỉ | Giờ mở | Giá | --- | --- | --- | --- | | Phở Bát Đàn | 13 Bát Đàn | 6h-21h | 30-60k | | Phở Thìn | 15 Chùa Thống | 6h-21h | 30-50k |';
    const { container } = render(<TableRenderer content={input} />);
    expect(screen.getByText('Phở Bát Đàn')).toBeInTheDocument();
    expect(screen.getByText('Phở Thìn')).toBeInTheDocument();
    // Inner sub-list has 3 fields × 2 rows = 6 items
    const innerItems = container.querySelectorAll('ul ul li');
    expect(innerItems.length).toBe(6);
  });

  it('skips empty field values gracefully', () => {
    const input = '| Tên | Giá | --- | --- | | Phở | | Bún | 25k |';
    const { container } = render(<TableRenderer content={input} />);
    // Outer list: 2 bullets
    const outer = container.querySelector('ul[role="list"]');
    expect(outer?.querySelectorAll(':scope > li').length).toBe(2);
    // Inner sub-list: only 1 field total (for "Bún")
    const innerItems = container.querySelectorAll('ul ul li');
    expect(innerItems.length).toBe(1);
  });

  it('renders with • bullet character', () => {
    const input = '| Tên | Giá | --- | --- | | Phở | 30k |';
    const { container } = render(<TableRenderer content={input} />);
    expect(container.textContent).toContain('•');
  });
});