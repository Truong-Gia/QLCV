Quản lý công việc 4.0

Một ứng dụng quản lý công việc cá nhân và nhóm nhỏ, được xây dựng với triết lý "Lean Build" - không sử dụng framework, tập trung vào việc ra mắt nhanh và đầy đủ chức năng.

✨ Xem Demo trực tiếp tại: https://truong-gia.github.io/QLCV/ ✨

## Giới thiệu

Đây là một hệ thống quản lý công việc (Task Management) hoàn chỉnh, cho phép người dùng tạo, theo dõi, và báo cáo tiến độ công việc một cách trực quan. Ứng dụng được thiết kế để hoạt động mà không cần bất kỳ bước cài đặt phức tạp nào phía client, chỉ cần một trình duyệt web và kết nối tới backend Supabase.

Triết lý cốt lõi của dự án là:

- Launch Nhanh: Xây dựng và triển khai trong thời gian ngắn nhất.

- Không Framework: Sử dụng Vanilla JavaScript (JavaScript thuần) để giữ cho ứng dụng nhẹ và dễ hiểu.

- Lấy Feedback Thật: Dễ dàng chia sẻ qua một đường link duy nhất để nhận phản hồi từ người dùng.

🚀 Các tính năng chính
📊 Dashboard tổng quan:

- Biểu đồ tròn thống kê công việc theo Trạng thái và Mức độ ưu tiên.

- Biểu đồ cột thống kê theo Danh mục và Người phụ trách.

- Theo dõi tiến độ công việc chung trong tháng.

- Danh sách công việc quá hạn, công việc hôm nay, và các công việc sắp tới.

📅 Lịch làm việc trực quan:

- Xem công việc theo Lịch Tuần và Lịch Tháng.

- Tự động tính toán và hiển thị tiến độ hoàn thành cho mỗi ngày trong tuần.

📋 Bảng Kanban:

- Quản lý công việc theo phương pháp Kanban với các cột: Cần làm, Đang làm, Hoàn thành, Tạm dừng.

- Hỗ trợ kéo-thả (Drag & Drop) để thay đổi trạng thái công việc một cách nhanh chóng.

📈 Báo cáo & Xuất dữ liệu:

- Tạo báo cáo động theo khoảng thời gian tùy chỉnh (tuần này, tháng này, quý này...).

- Lọc báo cáo theo từng thành viên trong nhóm.

- Xuất báo cáo ra file định dạng CSV và PDF.

⚙️ Quản lý công việc đầy đủ (CRUD):

- Thêm, sửa, xóa công việc thông qua giao diện modal tiện lợi.

- Gán công việc cho người phụ trách, đặt mức độ ưu tiên, danh mục và ngày hết hạn.

🔍 Tìm kiếm & Lọc mạnh mẽ:

- Tìm kiếm công việc theo tên.

- Lọc công việc theo Mức độ ưu tiên, Danh mục, và Người phụ trách.

👥 Quản lý nhóm đơn giản:

- Thiết lập thông tin cá nhân và quản lý danh sách thành viên trong nhóm.

⚡ Cập nhật thời gian thực:

Nhờ sức mạnh của Supabase Realtime, mọi thay đổi (thêm, sửa, xóa công việc) sẽ được tự động cập nhật trên trình duyệt của tất cả người dùng mà không cần tải lại trang.

🛠️ Công nghệ sử dụng
- Frontend: HTML, CSS, JavaScript (Vanilla JS - ES Modules).

- Backend & Cơ sở dữ liệu: Supabase (PostgreSQL, Realtime, Functions).

- Styling: Tailwind CSS (thông qua CDN).

- Biểu đồ: Chart.js.

- Kéo-thả (Drag & Drop): SortableJS.

- Xuất PDF: jsPDF & jsPDF-AutoTable.

- Triển khai (Deployment): GitHub Pages.

🔌 Hướng dẫn cài đặt và chạy Local
Để chạy dự án này trên máy của bạn, bạn cần thiết lập backend trên Supabase.

- Bước 1: Thiết lập Supabase Backend
Tạo một tài khoản miễn phí trên Supabase.

Tạo một Project mới.

Trong project của bạn, đi đến SQL Editor.

Nhấn New query và dán toàn bộ nội dung script SQL dưới đây vào, sau đó nhấn RUN.

SQL

'-- 1. TẠO BẢNG CHÍNH

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  content text,
  due_date date,
  is_completed boolean DEFAULT false,
  priority text,
  category text,
  status text,
  assigned_to_email text,
  assigned_to_name text,
  completed_at timestamp with time zone
);

-- 2. KÍCH HOẠT RLS (BẮT BUỘC)

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. XÓA CHÍNH SÁCH CŨ (ĐỂ TRÁNH XUNG ĐỘT)

DROP POLICY IF EXISTS "Enable all access for all users" ON public.tasks;

-- 4. TẠO CHÍNH SÁCH MỚI (CHO PHÉP MỌI NGƯỜI TRUY CẬP)

CREATE POLICY "Enable all access for all users" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- 5. TẠO HÀM (FUNCTION) ĐỂ XÓA DỮ LIỆU (TÙY CHỌN)

CREATE OR REPLACE FUNCTION truncate_all_data()
RETURNS void AS $$
BEGIN
  TRUNCATE TABLE public.tasks RESTART IDENTITY CASCADE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;'

- Bước 2: Chạy dự án trên máy tính

--Clone repository này về máy của bạn:

Bash

'git clone https://github.com/truong-gia/QLCV.git'

-- Do ứng dụng sử dụng JavaScript Modules (type="module"), bạn cần chạy nó thông qua một máy chủ web cục bộ để tránh lỗi CORS.

Cách đơn giản nhất: Nếu dùng VS Code, hãy cài extension Live Server. Sau đó, chuột phải vào file index.html và chọn Open with Live Server.

-- Khi ứng dụng mở lên lần đầu, một cửa sổ sẽ yêu cầu bạn nhập thông tin Supabase:

Project URL và Anon (public) Key: Bạn có thể tìm thấy hai thông tin này trong project Supabase của mình tại mục Settings -> API.

-- Sau khi lưu thông tin, ứng dụng sẽ kết nối tới backend của bạn và sẵn sàng để sử dụng. Thông tin này sẽ được lưu trong localStorage của trình duyệt.

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
