import http from 'k6/http';
import { check, sleep } from 'k6';

// Cấu hình test: Mô phỏng 50 người dùng ảo đồng thời (VUs) gửi request liên tục trong 30 giây
export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Ramp up to 20 users over 5s
    { duration: '20s', target: 50 }, // Stay at 50 users for 20s
    { duration: '5s', target: 0 },   // Ramp down to 0 users over 5s
  ],
  thresholds: {
    // Đảm bảo 95% requests phải phản hồi dưới 200ms
    http_req_duration: ['p(95)<200'], 
    // Tỷ lệ lỗi phải nhỏ hơn 1%
    http_req_failed: ['rate<0.01'],   
  },
};

export default function () {
  // Thay đổi URL theo địa chỉ backend thực tế của bạn
  const url = 'http://localhost:5000/api/products';
  
  const res = http.get(url);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'status is 429 (Rate Limited)': (r) => r.status === 429,
    'transaction time OK': (r) => r.timings.duration < 500,
  });

  // Tạm nghỉ 100ms giữa các requests để tránh làm sập máy client
  sleep(0.1);
}
