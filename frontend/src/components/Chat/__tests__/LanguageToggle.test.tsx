import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LanguageToggle } from '../LanguageToggle';

const mockSetLanguage = jest.fn();
// jest.mock's path arg is resolved by Jest's module resolver, which doesn't
// read the tsconfig "@/*" alias in this project. Use the relative path that
// resolves to the same module that LanguageToggle imports via "@/context/ChatContext".
jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({ language: 'vi', setLanguage: mockSetLanguage }),
}));

describe('LanguageToggle', () => {
  beforeEach(() => mockSetLanguage.mockClear());

  it('renders VI and EN buttons', () => {
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'VI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
  });

  it('marks current language as pressed', () => {
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'VI' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls setLanguage when EN clicked', () => {
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(mockSetLanguage).toHaveBeenCalledWith('en');
  });
});
