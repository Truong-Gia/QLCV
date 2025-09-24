Quản lý công việc 4.0

Một ứng dụng quản lý công việc cá nhân và nhóm nhỏ, được xây dựng với triết lý "Lean Build" - không sử dụng framework, tập trung vào việc ra mắt nhanh và đầy đủ chức năng.

✨ Xem Demo trực tiếp tại: https://truong-gia.github.io/QLCV/ ✨

## Giới thiệu

Đây là một hệ thống quản lý công việc (Task Management) hoàn chỉnh, cho phép người dùng tạo, theo dõi, và báo cáo tiến độ công việc một cách trực quan. Ứng dụng được thiết kế để hoạt động mà không cần bất kỳ bước cài đặt phức tạp nào phía client, chỉ cần một trình duyệt web và kết nối tới backend Supabase.

Triết lý cốt lõi của dự án là:

Launch Nhanh: Xây dựng và triển khai trong thời gian ngắn nhất.

Không Framework: Sử dụng Vanilla JavaScript (JavaScript thuần) để giữ cho ứng dụng nhẹ và dễ hiểu.

Lấy Feedback Thật: Dễ dàng chia sẻ qua một đường link duy nhất để nhận phản hồi từ người dùng.

🚀 Các tính năng chính
📊 Dashboard tổng quan:

Biểu đồ tròn thống kê công việc theo Trạng thái và Mức độ ưu tiên.

Biểu đồ cột thống kê theo Danh mục và Người phụ trách.

Theo dõi tiến độ công việc chung trong tháng.

Danh sách công việc quá hạn, công việc hôm nay, và các công việc sắp tới.

📅 Lịch làm việc trực quan:

Xem công việc theo Lịch Tuần và Lịch Tháng.

Tự động tính toán và hiển thị tiến độ hoàn thành cho mỗi ngày trong tuần.

📋 Bảng Kanban:

Quản lý công việc theo phương pháp Kanban với các cột: Cần làm, Đang làm, Hoàn thành, Tạm dừng.

Hỗ trợ kéo-thả (Drag & Drop) để thay đổi trạng thái công việc một cách nhanh chóng.

📈 Báo cáo & Xuất dữ liệu:

Tạo báo cáo động theo khoảng thời gian tùy chỉnh (tuần này, tháng này, quý này...).

Lọc báo cáo theo từng thành viên trong nhóm.

Xuất báo cáo ra file định dạng CSV và PDF.

⚙️ Quản lý công việc đầy đủ (CRUD):

Thêm, sửa, xóa công việc thông qua giao diện modal tiện lợi.

Gán công việc cho người phụ trách, đặt mức độ ưu tiên, danh mục và ngày hết hạn.

🔍 Tìm kiếm & Lọc mạnh mẽ:

Tìm kiếm công việc theo tên.

Lọc công việc theo Mức độ ưu tiên, Danh mục, và Người phụ trách.

👥 Quản lý nhóm đơn giản:

Thiết lập thông tin cá nhân và quản lý danh sách thành viên trong nhóm.

⚡ Cập nhật thời gian thực:

Nhờ sức mạnh của Supabase Realtime, mọi thay đổi (thêm, sửa, xóa công việc) sẽ được tự động cập nhật trên trình duyệt của tất cả người dùng mà không cần tải lại trang.

🛠️ Công nghệ sử dụng
Frontend: HTML, CSS, JavaScript (Vanilla JS - ES Modules).

Backend & Cơ sở dữ liệu: Supabase (PostgreSQL, Realtime, Functions).

Styling: Tailwind CSS (thông qua CDN).

Biểu đồ: Chart.js.

Kéo-thả (Drag & Drop): SortableJS.

Xuất PDF: jsPDF & jsPDF-AutoTable.

Triển khai (Deployment): GitHub Pages.

## 📦 Phiên bản & Phát hành
- **V1.0** — Bản đầu tiên (2025-09-04). Xem tab **Releases** để tải gói build/zip.  
- **V2.0** — Bản thứ 2 (2025-09-24)

## 🤝 Đóng góp
1. Gemini

---

## 📜 Giấy phép
MIT © 2025 [Truong-Gia]

---

## 👨‍💻 Tác giả & Liên hệ
- **Truong-Gia** — maintainer chính
- Issues/feature request: mở tại tab **Issues**
