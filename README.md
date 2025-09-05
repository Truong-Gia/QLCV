# QLCV — Quản lý công việc

Một ứng dụng web quản lý công việc (to-do/tasks) gọn nhẹ, chạy hoàn toàn trên trình duyệt, không cần backend.

![Banner/Logo](./assets/cover.png)

## 👀 Demo
- (Tùy chọn) GitHub Pages: `https://<username>.github.io/QLCV/`
- Hoặc mở trực tiếp `index.html` trên máy là chạy.

> Dự án dùng **HTML/CSS/JavaScript thuần**. Không có bước build. Cấu trúc thư mục tham khảo bên dưới.

---

## ✨ Tính năng chính
- Tạo / sửa / xóa công việc.
- Đánh dấu hoàn thành, lọc theo trạng thái (Tất cả / Đang làm / Hoàn thành).
- Tìm kiếm nhanh theo tiêu đề/nội dung.
- (Tùy chọn) Lưu trạng thái cục bộ trên trình duyệt để không mất dữ liệu sau khi refresh.
- Gọn nhẹ, tải nhanh, hoạt động offline cơ bản.

---

## 🧱 Kiến trúc & Thư mục

```
QLCV/
├─ components/     # Thành phần giao diện (modal, item, filter, v.v.)
├─ services/       # Tầng dịch vụ (lưu trữ, đồng bộ, API khi mở rộng)
├─ utils/          # Hàm tiện ích (format ngày, id, validate,...)
├─ index.html      # Trang chính, mount ứng dụng
├─ style.css       # Style toàn cục
├─ main.js         # Khởi tạo app, gắn sự kiện, bootstrap state
└─ state.js        # Quản lý trạng thái (store, actions)
```

---

## 🚀 Chạy dự án

### Cách 1: Mở trực tiếp
1. Tải mã nguồn về máy.
2. Mở file `index.html` bằng trình duyệt.

### Cách 2: Dùng Live Server (VS Code)
1. Cài extension **Live Server**.
2. Chuột phải `index.html` → **Open with Live Server**.

### Cách 3: Dùng HTTP server đơn giản (Node)
```bash
npx http-server . -p 5173
# sau đó mở http://localhost:5173
```

---

## 🛣️ Lộ trình (Roadmap)
- [ ] Kéo-thả sắp xếp (drag & drop)
- [ ] Hạn chót (due date) & nhắc việc
- [ ] Gán nhãn (tags), ưu tiên (priority)
- [ ] Đồng bộ đa thiết bị (thêm backend)
- [ ] PWA: cài như app, làm việc offline tốt hơn
- [ ] i18n (vi, en)

---

## 📦 Phiên bản & Phát hành
- **V1.0** — Bản đầu tiên (2025-09-04). Xem tab **Releases** để tải gói build/zip.  

---

## 🤝 Đóng góp
1. Fork dự án
2. Tạo nhánh tính năng: `git checkout -b feature/ten-tinh-nang`
3. Commit: `git commit -m "feat: ..."`
4. Push: `git push origin feature/ten-tinh-nang`
5. Mở Pull Request

---

## 📜 Giấy phép
MIT © 2025 [Truong-Gia]

---

## 👨‍💻 Tác giả & Liên hệ
- **Truong-Gia** — maintainer chính
- Issues/feature request: mở tại tab **Issues**
