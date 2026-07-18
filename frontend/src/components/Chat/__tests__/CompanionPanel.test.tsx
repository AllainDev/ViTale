import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompanionPanel } from '../CompanionPanel';

const useChatMock = jest.fn(() => ({
  messages: [],
  isStreaming: false,
  language: 'vi',
  sessionId: null,
  sendMessage: jest.fn(),
  sessions: [],
  refreshSessions: jest.fn(),
  loadSession: jest.fn(() => false),
  removeSessionById: jest.fn(),
  startNewChat: jest.fn(),
}));

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => useChatMock(),
}));

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: jest.fn() }),
}));

jest.mock('../AnimatedBackground', () => ({
  AnimatedBackground: () => <div data-testid="animated-background" />,
}));

jest.mock('../AvatarStage', () => ({
  AvatarStage: () => <div data-testid="avatar-stage" />,
}));

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

beforeAll(() => {
  (window as any).SpeechRecognition = class {
    start() {}
    stop() {}
    abort() {}
    lang: string = 'vi-VN';
    continuous: boolean = false;
    interimResults: boolean = false;
    onresult: any = null;
    onend: any = null;
    onerror: any = null;
  };
});

describe('CompanionPanel', () => {
  beforeEach(() => {
    useChatMock.mockReturnValue({
      messages: [],
      isStreaming: false,
      language: 'vi',
      sessionId: null,
      sendMessage: jest.fn(),
      sessions: [],
      refreshSessions: jest.fn(),
      loadSession: jest.fn(() => false),
      removeSessionById: jest.fn(),
      startNewChat: jest.fn(),
    });
  });

  it('renders all main sections', () => {
    render(<CompanionPanel />);
    expect(screen.getByTestId('companion-panel')).toBeInTheDocument();
    expect(screen.getByTestId('animated-background')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-stage')).toBeInTheDocument();
    expect(screen.getByTestId('hamburger-button')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByText(/Xin chào! Mình là Mai/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Hỏi Mai về Hà Nội/i)).toBeInTheDocument();
    expect(screen.getByTestId('camera-button')).toBeInTheDocument();
    expect(screen.getByTestId('share-button')).toBeInTheDocument();
  });

  it('calls sendMessage when input + Enter', () => {
    const sendMessage = jest.fn();
    useChatMock.mockReturnValue({
      messages: [],
      isStreaming: false,
      language: 'vi',
      sessionId: null,
      sendMessage,
      sessions: [],
      refreshSessions: jest.fn(),
      loadSession: jest.fn(() => false),
      removeSessionById: jest.fn(),
      startNewChat: jest.fn(),
    });
    render(<CompanionPanel />);
    const input = screen.getByPlaceholderText(/Hỏi Mai/i);
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(sendMessage).toHaveBeenCalledWith('Test message');
  });

  it('opens history drawer when hamburger clicked', () => {
    render(<CompanionPanel />);
    // Initially drawer should be closed (translated off-screen)
    expect(screen.getByRole('dialog', { name: /lịch sử/i })).toHaveClass('-translate-x-full');
    fireEvent.click(screen.getByTestId('hamburger-button'));
    // After click, drawer should slide in (translate-x-0)
    expect(screen.getByRole('dialog', { name: /lịch sử/i })).toHaveClass('translate-x-0');
  });
});