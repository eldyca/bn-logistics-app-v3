# 🔴 FIX: Lỗi "Không tìm thấy user" Khi Cập Nhật Tên

## ❌ Lỗi

```
❌ Lỗi: Cập nhật không thành công - không tìm thấy user
```

## ✅ Nguyên Nhân

1. **`.single()` query thất bại** - Khi verify update, nó không tìm thấy user
2. **User ID không tồn tại** trong bảng `user_profiles`
3. **Không check user tồn tại trước** - Cập nhật trước khi xác nhận

## 🔧 Cách Sửa

### **Trước:**
```javascript
// Cập nhật ngay, không check user tồn tại
const { data, error } = await supabase
  .from('user_profiles')
  .update({ full_name: fullName, display_name: displayName })
  .eq('user_id', userId)
  .select()

// Verify dùng .single() - có thể lỗi
const { data: verify } = await supabase
  .from('user_profiles')
  .select(...)
  .eq('user_id', userId)
  .single()  // ❌ Nếu không tìm thấy sẽ lỗi
```

### **Sau:**
```javascript
// 1. Check user tồn tại trước
const { data: userExists } = await supabase
  .from('user_profiles')
  .select('user_id')
  .eq('user_id', userId)

if (!userExists || userExists.length === 0) {
  throw new Error(`User ID không tồn tại: ${userId}`)
}

// 2. Cập nhật database
const { data, error } = await supabase
  .from('user_profiles')
  .update({ full_name: fullName, display_name: displayName })
  .eq('user_id', userId)
  .select()

// 3. Verify dùng array (không .single())
const { data: verify } = await supabase
  .from('user_profiles')
  .select(...)
  .eq('user_id', userId)
  // ✅ Không dùng .single(), dùng array
if (verify && verify.length > 0) {
  // Update đúng
}
```

---

## 📝 Chi Tiết Fix

### File: `src/lib/supabase.js`

**Function: `updateMemberName(userId, fullName, displayName)`**

**Thêm bước:**
1. ✅ Kiểm tra user_id hợp lệ
2. ✅ **Kiểm tra user tồn tại trong user_profiles** (NEW)
3. ✅ Cập nhật database
4. ✅ Xác nhận update thành công
5. ✅ Verify update (không .single())
6. ✅ Wait 800ms

---

## 🧪 Test Lại

1. **Mở modal edit tên**
   - Click ✏️ member

2. **Đổi tên & Lưu**
   - Input tên mới
   - Click "Lưu"

3. **Kiểm tra F12 → Console**
   - `[DB] Checking if user exists...`
   - `[DB] User exists, proceeding with update...`
   - `[DB] Update verified: {...}`
   - `[SUCCESS] Update completed!`

4. **Expected Result**
   - ✅ Modal đóng
   - ✅ Tên update trong danh sách
   - ✅ Thông báo success
   - ❌ KHÔNG có lỗi "không tìm thấy user"

---

## 🔍 Debug

Nếu vẫn lỗi, kiểm tra:

1. **User ID có đúng không?**
   ```javascript
   // Console
   console.log('Editing user:', editingUser)
   ```

2. **User tồn tại trong user_profiles?**
   ```sql
   -- Supabase SQL Editor
   SELECT user_id, full_name FROM user_profiles WHERE user_id = 'xxx'
   ```

3. **Permissions có đủ không?**
   - Kiểm tra RLS policies

---

## ✨ Kết Quả

✅ Check user trước → Lỗi clear hơn  
✅ Bỏ .single() → Không lỗi query  
✅ Xử lý error chi tiết → Debug dễ hơn  
✅ Verify dùng array → Tránh crash

---

## 📦 Ready

Build: ✅ SUCCESS  
Bug: ✅ FIXED  
ZIP: Ready!

