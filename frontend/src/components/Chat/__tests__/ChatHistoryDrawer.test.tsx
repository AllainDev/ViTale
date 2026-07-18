import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatHistoryDrawer } from '../ChatHistoryDrawer';

const useChatMock = jest.fn(() => ({
  language: 'vi',
  sessionId: null,
  sessions: [],
  loadSession: jest.fn(() => false),
  removeSessionById: jest.fn(),
  startNewChat: jest.fn(),
}));

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => useChatMock(),
}));

describe('ChatHistoryDrawer', () => {
  it('renders closed state (translated off-screen)', () => {
    render(<ChatHistoryDrawer isOpen={false} onClose={jest.fn()} />);
    const dialog = screen.getByRole('dialog', { name: /lịch sử/i });
    expect(dialog).toHaveClass('-translate-x-full');
  });

  it('renders open state when isOpen=true', () => {
    render(<ChatHistoryDrawer isOpen={true} onClose={jest.fn()} />);
    const dialog = screen.getByRole('dialog', { name: /lịch sử/i });
    expect(dialog).toHaveClass('translate-x-0');
  });

  it('shows empty state when no sessions', () => {
    useChatMock.mockReturnValue({
      language: 'vi',
      sessionId: null,
      sessions: [],
      loadSession: jest.fn(() => false),
      removeSessionById: jest.fn(),
      startNewChat: jest.fn(),
    });
    render(<ChatHistoryDrawer isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText(/Chưa có cuộc trò chuyện nào/i)).toBeInTheDocument();
  });

  it('calls startNewChat when new chat button clicked', () => {
    const startNewChat = jest.fn();
    const onClose = jest.fn();
    useChatMock.mockReturnValue({
      language: 'vi',
      sessionId: null,
      sessions: [],
      loadSession: jest.fn(() => false),
      removeSessionById: jest.fn(),
      startNewChat,
    });
    render(<ChatHistoryDrawer isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cuộc trò chuyện mới/i }));
    expect(startNewChat).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders sessions list when sessions exist', () => {
    useChatMock.mockReturnValue({
      language: 'vi',
      sessionId: 'a',
      sessions: [
        {
          id: 'a',
          title: 'Phở nào ngon?',
          messages: [{ id: '1', role: 'user', content: 'Phở?', timestamp: Date.now() }],
          createdAt: Date.now() - 1000,
          updatedAt: Date.now(),
        },
      ] as any,
      loadSession: jest.fn(() => false),
      removeSessionById: jest.fn(),
      startNewChat: jest.fn(),
    } as any);
    render(<ChatHistoryDrawer isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Phở nào ngon?')).toBeInTheDocument();
  });

  it('calls loadSession + onClose when session clicked', () => {
    const loadSession = jest.fn(() => true);
    const onClose = jest.fn();
    useChatMock.mockReturnValue({
      language: 'vi',
      sessionId: null,
      sessions: [
        {
          id: 'x',
          title: 'Old chat',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ] as any,
      loadSession,
      removeSessionById: jest.fn(),
      startNewChat: jest.fn(),
    } as any);
    render(<ChatHistoryDrawer isOpen={true} onClose={onClose} />);
    // Use role=button since the container is a div with role=button now
    const sessionItem = screen.getByRole('button', { name: /old chat/i });
    fireEvent.click(sessionItem);
    expect(loadSession).toHaveBeenCalledWith('x');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls removeSessionById when delete button clicked', () => {
    const removeSessionById = jest.fn();
    useChatMock.mockReturnValue({
      language: 'vi',
      sessionId: null,
      sessions: [
        {
          id: 'x',
          title: 'To delete',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ] as any,
      loadSession: jest.fn(() => false),
      removeSessionById,
      startNewChat: jest.fn(),
    });
    render(<ChatHistoryDrawer isOpen={true} onClose={jest.fn()} />);
    const deleteBtn = screen.getByRole('button', { name: /xoá/i });
    fireEvent.click(deleteBtn);
    expect(removeSessionById).toHaveBeenCalledWith('x');
  });

  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(<ChatHistoryDrawer isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /đóng/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = jest.fn();
    render(<ChatHistoryDrawer isOpen={true} onClose={onClose} />);
    // Backdrop has aria-hidden="true"; click it
    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});