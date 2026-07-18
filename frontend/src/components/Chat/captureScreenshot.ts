/**
 * Capture a DOM element as PNG and trigger browser download.
 * Uses html2canvas (lazy-loaded) to render the element to a canvas,
 * converts to data URL, and triggers a download.
 */
export async function captureScreenshot(
  element: HTMLElement,
  filename?: string
): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(element, {
    logging: false,
  } as any);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `mai-companion-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}