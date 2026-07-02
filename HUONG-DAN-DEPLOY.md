# Hướng dẫn deploy — BN Logistics (Netlify + Supabase + GitHub)

## A. Đưa code lên GitHub

### Nếu GitHub Desktop báo lỗi `.git/index.lock: No such file or directory`
Repo `.git` bị hỏng/thiếu. Làm lại sạch:
1. GitHub Desktop → **File → Remove** repo `bn-logistics-app-v2` (chỉ xoá khỏi danh sách, không mất bản trên GitHub).
2. **File → Clone repository** → chọn `bn-logistics-app-v2` → Clone về (ví dụ `Documents\GitHub\bn-logistics-app-v2`). Bước này tạo lại `.git` sạch.
3. Giải nén ZIP này → **chép TOÀN BỘ nội dung bên trong** (src, public, package.json, eslint.config.js, netlify.toml, migrations…) **VÀO thư mục vừa clone**, chọn **Replace/Ghi đè**.
   - ZIP KHÔNG chứa `.git`, nên `.git` mới clone vẫn nguyên vẹn.
4. GitHub Desktop → gõ Summary "update" → **Commit to main** → **Push origin**.
5. Netlify sẽ tự build (xem mục C).

> Lưu ý: nếu thư mục repo nằm trong OneDrive, tạm tắt OneDrive khi commit để tránh khoá file `.git`.

## B. Cấu hình Supabase

### 1) Chạy migration (trong Supabase → SQL Editor)
Chạy file: `migrations/2026-06-order-type-cargo.sql` (thêm cột `order_type` + `cargo` cho đơn Gửi hàng).
Nếu chưa từng chạy các migration trước, chạy luôn các file trong thư mục `migrations/` còn thiếu.

### 2) Lấy khoá API
Supabase Dashboard → **Project Settings → API**:
- **Project URL**: `https://wbvstqiaiadvfxbmbfmh.supabase.co`
- **anon public** key: chuỗi dài bắt đầu bằng `eyJ...`

## C. Cấu hình Netlify (env vars) + deploy

Netlify build từ GitHub, nên khoá Supabase phải đặt trong **Netlify** (không commit khoá vào repo).

1. Netlify → site của bạn → **Site configuration → Environment variables → Add**:
   - `VITE_SUPABASE_URL` = `https://wbvstqiaiadvfxbmbfmh.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (anon public key ở mục B2)
   - (tuỳ chọn) `VITE_GOOGLE_MAPS_API_KEY` = key Google Places nếu dùng.
2. Sau khi push code lên GitHub (mục A), Netlify tự build. Nếu build cũ chạy trước khi thêm env → vào **Deploys → Trigger deploy → Clear cache and deploy site** để build lại với env mới.
3. Cấu hình build (đã có sẵn trong `netlify.toml`, không cần sửa):
   - Build command: `npm run build`
   - Publish directory: `dist`

## D. Chạy thử ở máy (tuỳ chọn)
```bash
npm install
copy .env.example .env       # Windows (hoặc: cp .env.example .env)
# mở .env, dán VITE_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:5173
```

## E. Kiểm tra sau deploy
- Mở `bnlogistics.us` → Ctrl+Shift+R.
- Đăng nhập → tạo/sửa/xoá đơn → mở biên nhận → Tải/In PDF.
- Thử tạo đơn **Gửi hàng** (chọn 📦) để xác nhận migration đã chạy.
