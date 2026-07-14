import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GlassChatPanel } from '../GlassChatPanel';

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({ messages: [], isStreaming: false, language: 'vi' }),
}));

describe('GlassChatPanel', () => {
  it('renders welcome message when empty (VI)', () => {
    render(<GlassChatPanel />);
    expect(screen.getByText(/Xin chào! Mình là Mai/i)).toBeInTheDocument();
  });

  it('renders footer disclaimer', () => {
    render(<GlassChatPanel />);
    expect(screen.getByText(/AI có thể sai/i)).toBeInTheDocument();
  });
});