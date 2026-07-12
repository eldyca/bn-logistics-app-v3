# 🚀 HƯỚNG DẪN DEPLOY - RPC SECURITY DEFINER FIX

## 📋 TỔNG QUAN

**Vấn Đề:** Sửa tên nhân viên báo "User ID không tồn tại" → **RLS Policy không hoạt động**

**Giải Pháp:** Tạo RPC Function với **SECURITY DEFINER** để bypass RLS

**Kết Quả:** Admin/Super Admin có thể sửa tên nhân viên mà không cần lo RLS policy

---

## ⚙️ STEP-BY-STEP DEPLOYMENT

### **STEP 1: Run Migration trong Supabase (PHẢI LÀM)**

1. Vào **Supabase Dashboard** → **SQL Editor**
2. **Copy toàn bộ** nội dung file:
   ```
   migrations/2026-07-update-member-name-rpc.sql
   ```
3. **Paste vào** SQL Editor
4. Click **"Run"** (hoặc Ctrl+Enter)
5. **Verify:** 
   - ✓ Không lỗi đỏ
   - ✓ "Success" message hiện
   - ✓ Function được tạo

**Nếu lỗi "function xxx already exists":**
- Click **"Apply"** hoặc
- Chạy lại, hệ thống sẽ DROP function cũ và tạo mới

---

### **STEP 2: Deploy Code lên Netlify**

1. **Build (nếu cần):**
   ```bash
   npm run build
   ```

2. **Deploy dist/ folder:**
   - Mở **Netlify**
   - Drag & drop folder **`dist/`**
   - (Hoặc git push nếu dùng GitHub)

3. **Wait for deployment** (1-2 minutes)

---

### **STEP 3: Test Chức Năng**

1. **Vào ứng dụng** → **Quản trị** → **Công ty & Thành viên**
2. **Click ✏️ Edit** một nhân viên
3. **Đổi tên** → Click **"Lưu"**
4. **Kiểm tra Console (F12):**
   ```
   [RPC] Calling update_member_name_secure...
   [RPC] Response: {success: true, user_id: "...", full_name: "Tên Mới", ...}
   [SUCCESS] ✓ Update successful: {...}
   ```

5. **Expected Result:**
   - ✅ Modal đóng ngay lập tức
   - ✅ Tên trong danh sách update
   - ✅ Thông báo "✓ Cập nhật tên nhân viên thành công"
   - ✅ Không lỗi "User ID không tồn tại"

---

## 🔧 FILES ĐÃ THAY ĐỔI

| File | Thay Đổi |
|------|----------|
| `migrations/2026-07-update-member-name-rpc.sql` | ✅ NEW - RPC Function |
| `src/lib/supabase.js` | ✅ updateMemberName() - gọi RPC thay vì direct query |

---

## 🔐 SECURITY - TẠI SAO AN TOÀN?

### **RPC Function SECURITY DEFINER:**

```sql
CREATE FUNCTION public.update_member_name_secure(...)
SECURITY DEFINER  -- ← Chạy với quyền của creator (thường là superuser)
```

**Lợi ích:**
- ✅ Bypass RLS Policy (không cần lo RLS chặn)
- ✅ Permission check ở SQL level (an toàn hơn)
- ✅ Frontend không dùng service_role key
- ✅ Anon key vẫn có thể gọi (nhưng check permission ở SQL)

### **Permission Check (trong RPC):**

```sql
-- 1. Check user logged in (auth.uid() không null)
-- 2. Check target user exists
-- 3. Check target user in same company
-- 4. Check caller is Admin/Super Admin
-- 5. Only Super Admin can edit anyone
-- 6. Admin chỉ edit members in same company
```

---

## 🧪 TEST SCENARIOS

### **Test 1: Admin Sửa Nhân Viên Cùng Công Ty**
```
Admin A (Company 1) → Edit Member B (Company 1)
Expected: ✅ Success
Console: [SUCCESS] ✓ Update successful
```

### **Test 2: Admin Sửa Nhân Viên Công Ty Khác**
```
Admin A (Company 1) → Edit Member B (Company 2)
Expected: ❌ Error "Chỉ được chỉnh sửa thành viên trong công ty"
Console: [RPC] Response: {error: "..."}
```

### **Test 3: Super Admin Sửa Bất Kỳ Ai**
```
Super Admin → Edit Member (Any Company)
Expected: ✅ Success
Console: [SUCCESS] ✓ Update successful
```

### **Test 4: Nhân Viên Thường Sửa Tên**
```
Staff (Non-Admin) → Edit
Expected: ❌ Error "Bạn không có quyền chỉnh sửa"
Console: [RPC] Response: {error: "..."}
```

---

## 📊 CONSOLE LOG - CÓ THỂ THẤY

### **Thành Công:**
```
[UPDATE] user_id: xxx-yyy-zzz
[UPDATE] full_name: Tên Mới
[UPDATE] display_name: Tên Mới
[RPC] Calling update_member_name_secure...
[RPC] Error: null
[RPC] Response: {
  success: true,
  user_id: "xxx-yyy-zzz",
  full_name: "Tên Mới",
  display_name: "Tên Mới",
  updated_at: "2026-07-12T20:47:00+00:00"
}
[SUCCESS] ✓ Update successful: {...}
========== updateMemberName END ==========
```

### **Lỗi Permission:**
```
[RPC] Response: {
  error: "Chỉ được chỉnh sửa thành viên trong công ty"
}
[ERROR] RPC error response: Chỉ được chỉnh sửa thành viên trong công ty
```

---

## ✅ CHECKLIST DEPLOY

- [ ] Đã copy file `migrations/2026-07-update-member-name-rpc.sql`
- [ ] Đã chạy migration trong Supabase SQL Editor
- [ ] Migration chạy success (không lỗi)
- [ ] Build project: `npm run build`
- [ ] Deploy `dist/` lên Netlify
- [ ] Wait deployment complete
- [ ] Login vào ứng dụng
- [ ] Test edit tên nhân viên
- [ ] Check console log
- [ ] ✓ Tên update ngay lập tức
- [ ] ✓ F5 trang tên vẫn mới
- [ ] ✓ Logout/Login tên vẫn mới

---

## 🚨 TROUBLESHOOTING

### **Lỗi: "function update_member_name_secure does not exist"**

**Nguyên Nhân:** Migration chưa được chạy hoặc chạy thất bại

**Cách Sửa:**
1. Vào Supabase SQL Editor
2. Chạy lại file `migrations/2026-07-update-member-name-rpc.sql`
3. Verify no error

### **Lỗi: "Permission denied"**

**Nguyên Nhân:** User chưa authenticated hoặc không có role

**Cách Sửa:**
1. Logout → Login lại
2. F5 page
3. Check console: `auth.uid()` có giá trị không

### **Tên không update trong danh sách**

**Nguyên Nhân:** Frontend chưa reload danh sách sau update

**Cách Sửa:**
1. F5 page
2. Hoặc check console xem có lỗi không

### **"User ID không tồn tại" vẫn hiển thị**

**Nguyên Nhân:** Migration chưa chạy hoặc code cũ vẫn chạy

**Cách Sửa:**
1. Chạy migration lại
2. Clear browser cache: Ctrl+Shift+Delete → Clear Browsing Data
3. Reload page: Ctrl+Shift+R (hard refresh)

---

## 📝 IMPORTANT NOTES

✅ **RPC Function:**
- Chạy ở server side (Supabase) → An toàn
- Permission check ở SQL level → Không thể bypass
- SECURITY DEFINER → Bypass RLS policy

❌ **KHÔNG dùng:**
- service_role key ở frontend
- Direct update without permission check

✅ **Frontend:**
- Vẫn dùng anon key
- Gọi RPC function (không bypass permission)
- Permission check ở server (SQL)

---

## 🎉 DONE!

Sau khi hoàn thành 3 bước trên:
- ✅ Admin/Super Admin có thể sửa tên nhân viên
- ✅ Permission check ở SQL level (an toàn)
- ✅ RLS Policy không cần lo
- ✅ Frontend không dùng service_role key
- ✅ Tên update ngay lập tức

**Good luck! 🚀**

