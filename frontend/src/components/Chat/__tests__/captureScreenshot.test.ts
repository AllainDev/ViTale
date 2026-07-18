import { captureScreenshot } from '../captureScreenshot';

jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn(() =>
    Promise.resolve({
      toDataURL: () => 'data:image/png;base64,FAKE',
    })
  ),
}));

describe('captureScreenshot', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = jest.fn();

    // Stub fetch to return a fake blob
    global.fetch = jest.fn(() =>
      Promise.resolve({
        blob: () => Promise.resolve(new Blob(['fake'], { type: 'image/png' })),
      } as Response)
    );
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    jest.restoreAllMocks();
  });

  it('calls html2canvas with the element', async () => {
    const html2canvas = require('html2canvas').default;
    const element = document.createElement('div');
    await captureScreenshot(element, 'test.png');
    expect(html2canvas).toHaveBeenCalledWith(element, expect.objectContaining({
      logging: false,
    }));
  });

  it('uses default filename with timestamp when not provided', async () => {
    const element = document.createElement('div');
    // Spy on createElement to capture the anchor
    const createElSpy = jest.spyOn(document, 'createElement');
    await captureScreenshot(element);
    expect(createElSpy).toHaveBeenCalledWith('a');
    const anchor = createElSpy.mock.results[0]?.value as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^mai-companion-\d+\.png$/);
  });

  it('uses custom filename when provided', async () => {
    const element = document.createElement('div');
    const createElSpy = jest.spyOn(document, 'createElement');
    await captureScreenshot(element, 'custom-name.png');
    const anchor = createElSpy.mock.results[0]?.value as HTMLAnchorElement;
    expect(anchor.download).toBe('custom-name.png');
  });

  it('creates a blob URL and revokes it', async () => {
    const element = document.createElement('div');
    await captureScreenshot(element);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});