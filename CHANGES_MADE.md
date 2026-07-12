# Sửa chữa: Hệ thống Tạo Tài Khoản Nhân Viên & Lưu Nhân Viên Nhận Đơn

## 📋 Tóm tắt thay đổi

### 1. **Database Schema** (schema.sql)
✅ Thêm 2 cột mới vào bảng `orders`:
   - `received_by_user_id` (UUID) - ID tài khoản nhân viên tạo đơn
   - `received_by_employee_name` (TEXT) - Tên nhân viên tại thời điểm tạo

✅ Cập nhật RLS policy cho `orders`:
   - Thêm điều kiện: `received_by_user_id = auth.uid()`
   - Đảm bảo chỉ có thể lưu với user_id của tài khoản đang đăng nhập

### 2. **Migration File** (migrations/2026-07-orders-received-by.sql)
✅ Tạo file migration mới để:
   - Thêm 2 cột mới
   - Tạo index trên `received_by_user_id`
   - Reload schema cache

### 3. **CreateOrder.jsx** (src/pages/CreateOrder.jsx)
✅ Import `user` từ `useAuth()` để lấy `user.id`
✅ Thêm `myUserId = user?.id` 
✅ Thêm vào form payload khi lưu:
   ```javascript
   received_by_user_id: myUserId,
   received_by_employee_name: employeeName,
   ```
✅ Field "Tên nhân viên nhận đơn" đã là read-only (không cần sửa)

### 4. **data.js** (src/lib/data.js)
✅ **createOrder()**: 
   - Lưu `received_by_user_id: data.received_by_user_id || user_id`
   - Lưu `received_by_employee_name: data.received_by_employee_name || null`

✅ **updateOrder()**: 
   - Không cập nhật `received_by_user_id/received_by_employee_name`
   - Giữ nguyên giá trị ban đầu (tại khi tạo đơn)

✅ **mapRow()**:
   - Thêm fields vào return object:
   ```javascript
   received_by_user_id: row.received_by_user_id || null,
   received_by_employee_name: row.received_by_employee_name || '',
   ```

## 🔒 Bảo mật (Security)

✅ **RLS Policy**: 
   - Khi insert/update order: `received_by_user_id = auth.uid()`
   - Nhân viên không thể giả mạo user_id từ frontend
   - Database layer kiểm tra

✅ **Frontend**:
   - Field "Tên nhân viên nhận đơn" là read-only
   - Tự động điền từ `displayName` (từ `user_profiles.display_name`)
   - Không cho phép sửa thủ công

## 📝 Luồng Dữ Liệu (Data Flow)

```
1. Admin tạo tài khoản nhân viên
   ├─ Company.jsx (form)
   └─ Netlify create-member.js (server)
      ├─ supabase auth.admin.users (create)
      ├─ user_profiles (insert)
      │  └─ display_name = "Nguyễn Văn A" ✓
      └─ company_members (insert)

2. Nhân viên đăng nhập
   ├─ AuthContext.getMembership()
   └─ displayName = "Nguyễn Văn A" ✓

3. Nhân viên tạo đơn
   ├─ CreateOrder.jsx
   │  └─ myUserId = user.id ✓
   ├─ Form payload:
   │  ├─ employee: displayName ✓
   │  ├─ received_by_user_id: myUserId ✓
   │  └─ received_by_employee_name: displayName ✓
   └─ data.js createOrder()
      ├─ orders table insert
      │  ├─ received_by_user_id = myUserId ✓
      │  └─ received_by_employee_name = displayName ✓
      └─ RLS check: received_by_user_id = auth.uid() ✓

4. Database lưu giữ
   ├─ orders.received_by_user_id = uuid
   ├─ orders.received_by_employee_name = "Nguyễn Văn A"
   └─ Lịch sử giữ đúng tên cũ dù thay đổi sau
```

## 🧪 Test Cases

### Test 1: Tạo tài khoản nhân viên
```
Đầu vào:
- Username/email: lisa@company.com
- Tên nhân viên: Lisa Nguyễn
- Mật khẩu: Test@123456
- Vai trò: Nhân viên
- Quyền: Tạo đơn

Kỳ vọng:
✓ Tài khoản auth được tạo
✓ user_profiles.display_name = "Lisa Nguyễn"
✓ company_members được thêm
```

### Test 2: Đăng nhập & Hiển thị tên
```
Đầu vào:
- Email: lisa@company.com
- Mật khẩu: Test@123456

Kỳ vọng:
✓ Đăng nhập thành công
✓ displayName = "Lisa Nguyễn"
✓ Chỉ thấy đúng quyền
```

### Test 3: Tạo đơn Gửi tiền
```
Đầu vào:
- Form "Tạo đơn → Gửi tiền"
- "Tên nhân viên nhận đơn" (read-only)

Kỳ vọng:
✓ Field mặc định = "Lisa Nguyễn" (read-only)
✓ Không thể sửa
✓ Database lưu:
  - received_by_user_id = <lisa_user_id>
  - received_by_employee_name = "Lisa Nguyễn"
```

### Test 4: Tạo đơn Gửi hàng
```
Đầu vào:
- Form "Tạo đơn → Gửi hàng"
- "Tên nhân viên nhận đơn" (read-only)

Kỳ vọng:
✓ Field mặc định = "Lisa Nguyễn" (read-only)
✓ Không thể sửa
✓ Database lưu:
  - received_by_user_id = <lisa_user_id>
  - received_by_employee_name = "Lisa Nguyễn"
```

### Test 5: Đổi user & Kiểm tra tên thay đổi
```
Đầu vào:
- Đăng xuất Lisa
- Đăng nhập user khác (John)
- Tạo đơn mới

Kỳ vọng:
✓ Field "Tên nhân viên nhận đơn" = "John's Name"
✓ Không dùng lại tên của Lisa
✓ Database lưu:
  - received_by_user_id = <john_user_id>
  - received_by_employee_name = "John's Name"
```

## 📂 Files Sửa

| File | Thay đổi |
|------|----------|
| `schema.sql` | +2 cột, +RLS policy |
| `migrations/2026-07-orders-received-by.sql` | NEW |
| `src/pages/CreateOrder.jsx` | +user import, +myUserId, +payload fields |
| `src/lib/data.js` | createOrder, updateOrder, mapRow |

## ✅ Build Status

```
✓ npm run build — SUCCESS (0 errors)
✓ 650 modules transformed
✓ dist/assets generated
✓ No TypeScript errors
✓ No console errors expected
```

## 🚀 Ready for Testing

Tất cả files đã sửa xong. Có thể proceed sang testing phase.
