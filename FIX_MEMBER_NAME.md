# Sửa chức năng “Chỉnh sửa tên nhân viên”

## 1. Chạy đúng file SQL

Trong Supabase → SQL Editor → New query:

- Mở file `migrations/2026-07-update-member-name-rpc.sql`.
- Copy toàn bộ nội dung.
- Dán vào SQL Editor và bấm **Run**.
- Kết quả đúng: `Success. No rows returned`.

File SQL này:

- Tạo đúng RPC `update_member_name_secure` với 3 tham số mà frontend đang gọi.
- Không dùng cột `updated_at` hoặc `is_super_admin` không chắc tồn tại.
- Chỉ cho Admin sửa thành viên cùng công ty.
- Giữ RLS bật.

## 2. Deploy project mới

Build đã được cập nhật trong thư mục `dist`.

- Deploy toàn bộ project lên Netlify, hoặc kéo thư mục `dist` vào Netlify Drop.
- Sau khi deploy, nhấn `Ctrl + F5`.
- Đăng xuất rồi đăng nhập lại.

## 3. Kiểm tra

Vào **Quản trị → Công ty & Thành viên → Sửa tên → Lưu**.

Không cần tắt RLS.
