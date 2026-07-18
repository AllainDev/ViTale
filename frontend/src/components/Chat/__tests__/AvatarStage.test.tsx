import { render } from '@testing-library/react';
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
  it('renders the stage container in default (inline) mode', () => {
    const { container } = render(<AvatarStage animTag="idle" onAvatarLoaded={() => {}} />);
    const stage = container.querySelector('[data-testid="avatar-stage"]');
    expect(stage).toBeInTheDocument();
    expect(stage?.className).toMatch(/relative/);
  });

  it('renders fullscreen position with absolute inset-0', () => {
    const { container } = render(<AvatarStage position="fullscreen" />);
    const stage = container.querySelector('[data-testid="avatar-stage"]');
    expect(stage?.className).toMatch(/absolute/);
    expect(stage?.className).toMatch(/inset-0/);
  });

  it('renders floating position with fixed bottom-right', () => {
    const { container } = render(<AvatarStage position="floating" />);
    const stage = container.querySelector('[data-testid="avatar-stage"]');
    expect(stage?.className).toMatch(/fixed/);
    expect(stage?.className).toMatch(/right-2/);
  });
});