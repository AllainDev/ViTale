import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PersonaIndicator } from '../PersonaIndicator';

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({ language: 'vi' }),
}));

describe('PersonaIndicator', () => {
  it('renders Mai persona badge in VI', () => {
    render(<PersonaIndicator />);
    expect(screen.getByText(/Trợ lý Di sản/i)).toBeInTheDocument();
  });

  it('renders language toggle', () => {
    render(<PersonaIndicator />);
    expect(screen.getByRole('group', { name: /language toggle/i })).toBeInTheDocument();
  });
});