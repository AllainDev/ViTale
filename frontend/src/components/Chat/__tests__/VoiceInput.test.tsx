import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VoiceInput } from '../VoiceInput';

const mockSendMessage = jest.fn();
const mockRequestGps = jest.fn();
const mockClearChat = jest.fn();

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({
    sendMessage: mockSendMessage,
    isStreaming: false,
    language: 'vi',
    requestGps: mockRequestGps,
    gps: null,
    clearChat: mockClearChat,
  }),
}));

describe('VoiceInput', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    mockRequestGps.mockClear();
    mockClearChat.mockClear();
  });

  it('disables send when input is empty', () => {
    render(<VoiceInput />);
    expect(screen.getByRole('button', { name: /gửi/i })).toBeDisabled();
  });

  it('sends message on Enter key and clears textarea', () => {
    render(<VoiceInput />);
    const textarea = screen.getByPlaceholderText(/Hỏi Mai/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Phở ở đâu?' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(mockSendMessage).toHaveBeenCalledWith('Phở ở đâu?');
  });

  it('sends on submit button click', () => {
    render(<VoiceInput />);
    const textarea = screen.getByPlaceholderText(/Hỏi Mai/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Xin chào' } });
    fireEvent.click(screen.getByRole('button', { name: /gửi/i }));
    expect(mockSendMessage).toHaveBeenCalledWith('Xin chào');
  });

  it('disables mic button (placeholder)', () => {
    render(<VoiceInput />);
    expect(screen.getByRole('button', { name: /voice/i })).toBeDisabled();
  });

  it('calls requestGps when GPS button clicked', () => {
    render(<VoiceInput />);
    fireEvent.click(screen.getByRole('button', { name: /bật vị trí/i }));
    expect(mockRequestGps).toHaveBeenCalledTimes(1);
  });

  it('calls clearChat when clear button clicked', () => {
    render(<VoiceInput />);
    fireEvent.click(screen.getByRole('button', { name: /xoá/i }));
    expect(mockClearChat).toHaveBeenCalledTimes(1);
  });

  it('does not send when input has only whitespace', () => {
    render(<VoiceInput />);
    const textarea = screen.getByPlaceholderText(/Hỏi Mai/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /gửi/i }));
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});