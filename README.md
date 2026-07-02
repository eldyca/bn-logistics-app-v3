# Hệ thống quản lý chuyển tiền (Money Transfer System) — v2.0

Ứng dụng nội bộ ghi nhận & quản lý giao dịch chuyển tiền cho doanh nghiệp của bạn.
React + Vite, dữ liệu lưu trên Supabase (Auth + Postgres + RLS).

> Ứng dụng chỉ **ghi nhận** giao dịch để quản lý nội bộ. Nó **không** kết nối cổng
> thanh toán, không chuyển tiền thật, và không lưu giấy tờ tuỳ thân / sao kê của khách.

## Tính năng chính
- Đăng nhập / đăng ký (Supabase Auth)
- **Đa công ty (multi-tenant):** mỗi công ty nhiều nhân viên; admin mời staff;
  admin & staff thấy chung dữ liệu công ty; RLS chặn công ty khác.
- Tạo / sửa / xoá đơn; trạng thái; tìm kiếm & lọc (tên, SĐT, mã GD, ngày)
- **Country / State / City:** Mỹ (50 bang) & Việt Nam (63 tỉnh/thành), thành phố/quận
  huyện đổi theo bang/tỉnh; cho nhập tay.
- **Gợi ý địa chỉ:** Google Places (nếu cấu hình key) hoặc nhập tay.
- **Biên nhận A4:** in (Print) và **xuất PDF** kèm logo/thông tin công ty.
- **Đa ngôn ngữ:** Tiếng Việt / English (react-i18next), nhớ lựa chọn trong localStorage.
- **Cài đặt:** ngôn ngữ, thông tin công ty, logo, dòng chân biên nhận, tiền tệ.
- Báo cáo: tổng hợp, chi tiết, hoạt động, sao kê; xuất CSV/Excel.

## Cài đặt
```bash
npm install
cp .env.example .env      # điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY
# (tuỳ chọn) điền VITE_GOOGLE_MAPS_API_KEY để bật gợi ý địa chỉ
npm run dev
```

## Thiết lập Supabase
1. Tạo project tại supabase.com, lấy **Project URL** và **anon public key** → điền vào `.env`.
2. Mở **SQL Editor**, dán toàn bộ `schema.sql` và chạy (tạo bảng, RLS, RPC, trigger).
3. (Tuỳ chọn) Chạy `seed.sql` sau khi thay `v_user` bằng UUID user thật để có dữ liệu mẫu.
4. Đăng ký tài khoản trong app → màn hình onboarding: **tạo công ty** (bạn thành admin)
   hoặc **tham gia** nếu được mời.

## Mời nhân viên
- Admin vào **Công ty & Thành viên** → nhập email nhân viên → gửi lời mời.
- Nhân viên tự đăng ký bằng đúng email đó → onboarding hiện nút **Tham gia**.

## Lệnh
- `npm run dev` — chạy dev server
- `npm run build` — build production (thư mục `dist/`)
- `npm run preview` — xem thử bản build

## Bảo mật dữ liệu (RLS)
Mọi bảng nghiệp vụ đều có `company_id` và chính sách RLS giới hạn theo
`current_company_id()`. Người dùng chỉ đọc/ghi dữ liệu công ty mình. Các thao tác
đặc quyền (tạo công ty, mời, chấp nhận lời mời) đi qua hàm RPC `SECURITY DEFINER`
được kiểm soát chặt.
