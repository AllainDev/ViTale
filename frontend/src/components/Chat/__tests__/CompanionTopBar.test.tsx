import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompanionTopBar } from '../CompanionTopBar';

const useThemeMock = jest.fn(() => ({ theme: 'light', toggleTheme: jest.fn() }));

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => useThemeMock(),
}));

describe('CompanionTopBar', () => {
  beforeEach(() => {
    useThemeMock.mockReturnValue({ theme: 'light', toggleTheme: jest.fn() });
  });

  it('renders hamburger and theme toggle', () => {
    render(<CompanionTopBar onHistoryClick={jest.fn()} />);
    expect(screen.getByTestId('hamburger-button')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('calls onHistoryClick when hamburger pressed', () => {
    const onHistoryClick = jest.fn();
    render(<CompanionTopBar onHistoryClick={onHistoryClick} />);
    fireEvent.click(screen.getByTestId('hamburger-button'));
    expect(onHistoryClick).toHaveBeenCalledTimes(1);
  });

  it('calls toggleTheme when toggle pressed', () => {
    const toggleTheme = jest.fn();
    useThemeMock.mockReturnValue({ theme: 'light', toggleTheme });
    render(<CompanionTopBar onHistoryClick={jest.fn()} />);
    fireEvent.click(screen.getByTestId('theme-toggle'));
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('shows moon icon when theme is dark', () => {
    useThemeMock.mockReturnValue({ theme: 'dark', toggleTheme: jest.fn() });
    const { container } = render(<CompanionTopBar onHistoryClick={jest.fn()} />);
    const slider = container.querySelector('span[class*="rounded-full"]');
    expect(slider?.getAttribute('style')).toContain('translateX(28px)');
  });
});