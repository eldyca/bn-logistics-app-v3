# Sửa lỗi: cập nhật thành công nhưng tên chưa hiển thị

Nguyên nhân: RPC cập nhật tên đã chạy thành công, nhưng giao diện vẫn đọc trực tiếp `user_profiles` và bị RLS trả về danh sách rỗng.

## Bước 1 — Chạy SQL mới

Mở Supabase → SQL Editor, mở file:

`migrations/2026-07-list-member-profiles-rpc.sql`

Copy toàn bộ nội dung và bấm **Run**.

Kết quả mong đợi: `Success. No rows returned`.

## Bước 2 — Deploy bản mới

Deploy lại project này hoặc deploy thư mục `dist` lên Netlify.

## Bước 3 — Làm mới trình duyệt

Nhấn `Ctrl + F5`, đăng xuất và đăng nhập lại.

Sau đó vào Công ty & Thành viên. Tên nhân viên sẽ hiển thị từ RPC an toàn dù RLS vẫn bật.
