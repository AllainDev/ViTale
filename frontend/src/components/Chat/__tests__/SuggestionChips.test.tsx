import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SuggestionChips } from '../SuggestionChips';

const mockSendMessage = jest.fn();
jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({ sendMessage: mockSendMessage, language: 'vi' }),
}));

describe('SuggestionChips', () => {
  beforeEach(() => mockSendMessage.mockClear());

  it('renders fallback suggestions when no tool calls', () => {
    render(<SuggestionChips lastMsg={{ id: '1', role: 'assistant', content: 'Hi', timestamp: 0 }} />);
    expect(screen.getByText(/Kể thêm đi!/)).toBeInTheDocument();
  });

  it('renders tool-specific suggestions', () => {
    render(<SuggestionChips lastMsg={{ id: '1', role: 'assistant', content: 'Quán gần đây', toolCalls: ['get_nearby_partners'], timestamp: 0 }} />);
    expect(screen.getByText(/Có quán nào rẻ hơn/)).toBeInTheDocument();
  });

  it('calls sendMessage on chip click', () => {
    render(<SuggestionChips lastMsg={{ id: '1', role: 'assistant', content: 'Hi', timestamp: 0 }} />);
    fireEvent.click(screen.getByText(/Kể thêm đi!/));
    expect(mockSendMessage).toHaveBeenCalledWith('Kể thêm đi!');
  });
});