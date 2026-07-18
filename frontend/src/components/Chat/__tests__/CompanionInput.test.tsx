import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompanionInput } from '../CompanionInput';

jest.mock('../../../context/ChatContext', () => ({
  useChat: jest.fn(() => ({ isStreaming: false, language: 'vi' })),
}));

describe('CompanionInput', () => {
  it('renders Vietnamese placeholder when language is vi', () => {
    render(<CompanionInput onSend={jest.fn()} />);
    expect(screen.getByPlaceholderText(/Hỏi Mai về Hà Nội/i)).toBeInTheDocument();
  });

  it('calls onSend when Enter pressed with non-empty text', () => {
    const onSend = jest.fn();
    render(<CompanionInput onSend={onSend} />);
    const input = screen.getByPlaceholderText(/Hỏi Mai/i);
    fireEvent.change(input, { target: { value: 'Xin chào' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('Xin chào');
  });

  it('calls onSend when send button clicked', () => {
    const onSend = jest.fn();
    render(<CompanionInput onSend={onSend} />);
    const input = screen.getByPlaceholderText(/Hỏi Mai/i);
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /gửi/i }));
    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('does not call onSend when input is empty', () => {
    const onSend = jest.fn();
    render(<CompanionInput onSend={onSend} />);
    fireEvent.click(screen.getByRole('button', { name: /gửi/i }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables input when isStreaming is true', () => {
    // Re-render with isStreaming mocked via mockReturnValueOnce pattern
    const useChatMock = require('../../../context/ChatContext').useChat as jest.Mock;
    useChatMock.mockReturnValueOnce({ isStreaming: true, language: 'vi' });
    render(<CompanionInput onSend={jest.fn()} />);
    const input = screen.getByPlaceholderText(/Hỏi Mai/i);
    expect(input).toBeDisabled();
  });
});