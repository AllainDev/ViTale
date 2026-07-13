'use client';

import { APIError } from '../lib/types';

interface ErrorMessageProps {
  error: APIError | Error;
  onRetry?: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  let userMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
  
  if (error instanceof APIError) {
    switch (error.statusCode) {
      case 400:
        userMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
        break;
      case 408:
        userMessage = 'Quá thời gian kết nối. Vui lòng kiểm tra mạng và thử lại.';
        break;
      case 429:
        userMessage = 'Hệ thống đang quá tải. Vui lòng đợi một lát rồi thử lại.';
        break;
      case 500:
        userMessage = 'Lỗi máy chủ (500). Vui lòng thử lại sau.';
        break;
      case 503:
        userMessage = 'Dịch vụ tạm thời gián đoạn (503). Vui lòng thử lại sau.';
        break;
      default:
        userMessage = `Lỗi hệ thống (${error.statusCode}). Vui lòng thử lại.`;
    }
  }

  return (
    <div className="error-message-container" role="alert">
      <div className="error-icon">⚠️</div>
      <p className="error-text">{userMessage}</p>
      {onRetry && (
        <button className="retry-button" onClick={onRetry}>
          Thử Lại
        </button>
      )}
    </div>
  );
}
