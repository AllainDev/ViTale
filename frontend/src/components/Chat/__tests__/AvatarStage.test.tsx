import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../../components/AvatarRenderer', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-avatar">Avatar</div>,
}));

jest.mock('next/dynamic', () => () => {
  const Component = (_props: any) => <div data-testid="dynamic-avatar" />;
  Component.displayName = 'DynamicAvatar';
  return Component;
});

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({ language: 'vi' }),
}));

import { AvatarStage } from '../AvatarStage';

describe('AvatarStage', () => {
  it('renders the stage container', () => {
    const { container } = render(<AvatarStage animTag="idle" onAvatarLoaded={() => {}} />);
    expect(container.querySelector('.absolute.inset-0')).toBeInTheDocument();
  });

  it('renders the persona indicator overlay', () => {
    render(<AvatarStage animTag="idle" onAvatarLoaded={() => {}} />);
    expect(screen.getByText(/Trợ lý Di sản/i)).toBeInTheDocument();
  });
});