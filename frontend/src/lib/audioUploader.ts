/**
 * Audio Uploader module for 3D Chat system.
 * Sends recorded audio blob to backend via multipart/form-data.
 * 
 * Requirements: 3 (Upload Audio to Backend)
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5000';
const UPLOAD_ENDPOINT = `${BACKEND_URL}/api/chat/upload-audio`;
const SEND_TEXT_ENDPOINT = `${BACKEND_URL}/api/chat/send-text`;
const UPLOAD_TIMEOUT_MS = 30_000; // 30 seconds

export interface UploadResult {
  success: boolean;
  requestId?: string;
  error?: string;
  statusCode?: number;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Yêu cầu không hợp lệ. Vui lòng thử lại.',
  413: 'File âm thanh quá lớn (tối đa 10MB).',
  429: 'Quá nhiều yêu cầu. Vui lòng chờ một lúc.',
  500: 'Lỗi server. Vui lòng thử lại sau.',
  502: 'Dịch vụ xử lý không khả dụng.',
  503: 'Dịch vụ tạm thời không khả dụng.',
};

/**
 * Uploads a recorded audio blob to the backend for AI processing.
 * The actual response arrives asynchronously via SignalR.
 * 
 * @param audioBlob - The recorded audio blob (audio/webm)
 * @param connectionId - SignalR connection ID to route response back to this client
 * @param onStateChange - Callback for loading state changes
 */
export async function uploadAudio(
  audioBlob: Blob,
  connectionId: string,
  onStateChange?: (isLoading: boolean) => void
): Promise<UploadResult> {
  if (!connectionId) {
    console.error('[AudioUploader] Missing connectionId - cannot upload without SignalR connection.');
    return { success: false, error: 'Chưa kết nối SignalR. Vui lòng đợi kết nối được thiết lập.' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  onStateChange?.(true);
  console.log('[AudioUploader] Uploading audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);

  try {
    const formData = new FormData();
    formData.append('audioFile', audioBlob, 'recording.webm');

    const response = await fetch(UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-SignalR-ConnectionId': connectionId,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('[AudioUploader] Upload successful. RequestId:', data.requestId);
      return { success: true, requestId: data.requestId };
    }

    // Handle error responses
    const statusCode = response.status;
    let errorText = STATUS_MESSAGES[statusCode] ?? `Lỗi ${statusCode}: ${response.statusText}`;

    try {
      const errorBody = await response.json();
      if (errorBody.error) errorText = errorBody.error;
    } catch {
      // ignore - use default message
    }

    console.error('[AudioUploader] Upload failed. Status:', statusCode, 'Error:', errorText);
    return { success: false, error: errorText, statusCode };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[AudioUploader] Upload timed out after', UPLOAD_TIMEOUT_MS / 1000, 'seconds.');
      return {
        success: false,
        error: 'Upload timeout. Vui lòng kiểm tra kết nối và thử lại.',
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('[AudioUploader] Network error:', message);
    return {
      success: false,
      error: 'Lỗi kết nối mạng. Vui lòng kiểm tra server và thử lại.',
    };
  } finally {
    onStateChange?.(false);
  }
}

/**
 * Sends a text message to the backend for AI processing.
 * Response arrives asynchronously via SignalR.
 */
export async function sendText(
  text: string,
  connectionId: string,
  onStateChange?: (isLoading: boolean) => void
): Promise<UploadResult> {
  if (!connectionId) {
    return { success: false, error: 'Chưa kết nối SignalR. Vui lòng đợi kết nối được thiết lập.' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  onStateChange?.(true);

  try {
    const response = await fetch(SEND_TEXT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SignalR-ConnectionId': connectionId,
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { success: true, requestId: data.requestId };
    }

    const statusCode = response.status;
    let errorText = STATUS_MESSAGES[statusCode] ?? `Lỗi ${statusCode}: ${response.statusText}`;

    try {
      const errorBody = await response.json();
      if (errorBody.error) errorText = errorBody.error;
    } catch {
      // ignore
    }

    return { success: false, error: errorText, statusCode };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Gửi tin nhắn timeout. Vui lòng thử lại.' };
    }

    return { success: false, error: 'Lỗi kết nối mạng. Vui lòng kiểm tra server.' };
  } finally {
    onStateChange?.(false);
  }
}
