import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompanionChatOverlay } from '../CompanionChatOverlay';

// Mock react-markdown to plain render — full markdown tested manually in browser
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

const useChatMock = jest.fn(() => ({
  messages: [],
  isStreaming: false,
  language: 'vi',
}));

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => useChatMock(),
}));

describe('CompanionChatOverlay', () => {
  beforeEach(() => {
    useChatMock.mockReturnValue({
      messages: [],
      isStreaming: false,
      language: 'vi',
    });
  });

  it('renders welcome message in Vietnamese when empty', () => {
    render(<CompanionChatOverlay onSuggestionClick={jest.fn()} />);
    expect(screen.getByText(/Xin chào! Mình là Mai/i)).toBeInTheDocument();
  });

  it('renders suggestion chips in empty state', () => {
    render(<CompanionChatOverlay onSuggestionClick={jest.fn()} />);
    expect(screen.getByText(/Phở nào ngon/i)).toBeInTheDocument();
  });

  it('renders messages from chat context', () => {
    useChatMock.mockReturnValue({
      messages: [
        { id: '1', role: 'user', content: 'Hello Mai' },
        { id: '2', role: 'assistant', content: 'Chào bạn!' },
      ] as any,
      isStreaming: false,
      language: 'vi',
    });
    render(<CompanionChatOverlay onSuggestionClick={jest.fn()} />);
    expect(screen.getByText('Hello Mai')).toBeInTheDocument();
    expect(screen.getByText('Chào bạn!')).toBeInTheDocument();
  });

  it('shows thinking indicator when streaming', () => {
    useChatMock.mockReturnValue({
      messages: [{ id: '1', role: 'assistant', content: '' }] as any,
      isStreaming: true,
      language: 'vi',
    });
    render(<CompanionChatOverlay onSuggestionClick={jest.fn()} />);
    expect(screen.getByText(/Mai đang suy nghĩ/i)).toBeInTheDocument();
  });
});