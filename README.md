# ViTale Platform

ViTale là nền tảng khám phá văn hoá Việt qua bộ sưu tập búp bê dân tộc và nhân vật 3D AI.

## 🚀 Yêu cầu hệ thống (Prerequisites)
Để chạy được dự án này, máy tính của bạn cần cài đặt sẵn các phần mềm sau:
1. [Git](https://git-scm.com/) (Để clone code)
2. [Node.js](https://nodejs.org/) (Phiên bản 18 trở lên để chạy Frontend Next.js)
3. [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Để chạy Backend .NET và Database PostgreSQL một cách tự động)

---

## 🛠 Hướng dẫn cài đặt và chạy dự án cho người mới

### Bước 1: Clone dự án về máy
Mở Terminal / Command Prompt và chạy lệnh:
```bash
git clone <đường-dẫn-repo-github-của-bạn>
cd ViTale
```

### Bước 2: Thiết lập biến môi trường (Environment Variables)
Dự án cần các biến môi trường để kết nối Database và API.
1. Tại thư mục gốc `ViTale`, copy file `.env.example` thành file mới tên là `.env`.
2. Tại thư mục `frontend`, copy file `.env.example` thành file mới tên là `.env.local`.

*(Trong môi trường dev, cấu hình mặc định trong file example thường đã đủ để chạy mà không cần sửa gì thêm).*

### Bước 3: Khởi động Backend & Database (Bằng Docker)
Đảm bảo **Docker Desktop** đang mở và chạy trên máy bạn.
Tại thư mục gốc (`ViTale`), mở Terminal và chạy lệnh:
```bash
docker compose up -d
```
*Lệnh này sẽ tự động tải PostgreSQL và khởi động API Backend (.NET). Lần đầu tiên chạy có thể mất 1-3 phút để tải image. API sẽ chạy ở cổng `http://localhost:5000`.*

### Bước 4: Khởi động Frontend (Next.js)
Mở một Terminal khác, di chuyển vào thư mục `frontend`:
```bash
cd frontend
npm install
npm run dev
```
*Lệnh này sẽ cài đặt các thư viện cần thiết và khởi động giao diện web. Frontend sẽ chạy ở cổng `http://localhost:3000`.*

---

## 🛑 Các sự cố thường gặp
- **Lỗi không nhận lệnh Docker trong VS Code**: Tắt hẳn VS Code và mở lại, hoặc dùng phần mềm PowerShell bên ngoài.
- **Frontend báo lỗi ERR_CONNECTION_REFUSED hoặc bị đơ**: Hãy vào thư mục `frontend`, xóa thư mục ẩn tên là `.next` đi rồi chạy lại lệnh `npm run dev`. Tránh click chuột vào màn hình Terminal gây ra lỗi "Select" (QuickEdit Mode) làm đóng băng tiến trình.
- **Backend không chạy được**: Mở Docker Desktop lên kiểm tra xem container `vitale_api` và `vitale_db` có báo lỗi xanh/đỏ gì không. Đảm bảo cổng 5000 và 5432 không bị phần mềm khác chiếm dụng.
