import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageBubble } from '../MessageBubble';

jest.mock('../../../context/ChatContext', () => ({
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

  it('applies animate-pulse-glow when assistant content is empty (streaming)', () => {
    const { container } = render(<MessageBubble message={{ ...baseMsg, role: 'assistant', content: '' }} />);
    expect(container.querySelector('.animate-pulse-glow')).toBeInTheDocument();
  });
});