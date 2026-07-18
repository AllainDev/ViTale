import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompanionControls } from '../CompanionControls';

const captureScreenshotMock = jest.fn(() => Promise.resolve());

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({ language: 'vi' }),
}));

jest.mock('../captureScreenshot', () => ({
  captureScreenshot: () => captureScreenshotMock(),
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

describe('CompanionControls', () => {
  beforeEach(() => {
    captureScreenshotMock.mockClear();
  });

  it('renders 3 control buttons', () => {
    render(<CompanionControls onTranscript={jest.fn()} targetRef={{ current: null }} />);
    expect(screen.getByTestId('voice-button')).toBeInTheDocument();
    expect(screen.getByTestId('camera-button')).toBeInTheDocument();
    expect(screen.getByTestId('share-button')).toBeInTheDocument();
  });

  it('calls captureScreenshot when camera button clicked', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    render(<CompanionControls onTranscript={jest.fn()} targetRef={{ current: target }} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('camera-button'));
    });
    expect(captureScreenshotMock).toHaveBeenCalled();
    document.body.removeChild(target);
  });

  it('does not crash when targetRef is null on camera click', async () => {
    render(<CompanionControls onTranscript={jest.fn()} targetRef={{ current: null }} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('camera-button'));
    });
    expect(captureScreenshotMock).not.toHaveBeenCalled();
  });

  it('falls back to clipboard when navigator.share is unavailable', async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const origShare = (navigator as any).share;
    delete (navigator as any).share;
    render(<CompanionControls onTranscript={jest.fn()} targetRef={{ current: null }} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('share-button'));
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('screen=assistant'));
    if (origShare) (navigator as any).share = origShare;
  });
});