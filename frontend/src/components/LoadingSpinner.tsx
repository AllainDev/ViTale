export function LoadingSpinner() {
  return (
    <div className="loading-container" role="alert" aria-busy="true">
      <div className="spinner"></div>
      <p>Đang tải dữ liệu...</p>
    </div>
  );
}
