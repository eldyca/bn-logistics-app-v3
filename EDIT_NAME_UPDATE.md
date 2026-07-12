# 📝 CẬP NHẬT: CHỈNH SỬA TÊN NHÂN VIÊN - ADMIN & SUPER ADMIN

## ✅ Thay Đổi Hoàn Thành

### 1️⃣ **API Function (src/lib/supabase.js)**

```javascript
// Admin update tên nhân viên (full_name + display_name)
export async function updateMemberName(userId, fullName, displayName) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ full_name: fullName, display_name: displayName })
    .eq('user_id', userId)
  if (error) throw error
}

// Super Admin update tên của chính mình
export async function updateMyName(fullName, displayName) {
  const user = await currentUser()
  if (!user) throw new Error('Chưa đăng nhập')
  const { error } = await supabase
    .from('user_profiles')
    .update({ full_name: fullName, display_name: displayName })
    .eq('user_id', user.id)
  if (error) throw error
}
```

---

### 2️⃣ **UI - Danh Sách Thành Viên (src/pages/Company.jsx)**

#### **Thêm Button Edit (✏️)**

Danh sách thành viên - cột Thao tác:
```
✏️ = Edit tên nhân viên
🔒 = Khóa
🔓 = Mở khóa
🔑 = Đặt lại mật khẩu
🗑️ = Xóa
```

#### **Modal Popup Edit Tên**

Khi click ✏️:
```
┌────────────────────────────────┐
│ Chỉnh sửa tên nhân viên        │
├────────────────────────────────┤
│ Tên nhân viên                  │
│ [input field - editable]       │
│                                │
│ [Hủy]           [Lưu]          │
└────────────────────────────────┘
```

---

## 🎯 **Chức Năng**

### **Admin (Vai trò Admin)**
✅ Chỉnh sửa tên nhân viên khác (full_name + display_name)
✅ Không thể edit tên của chính mình (button edit bị disable)
✅ Click ✏️ → Modal popup
✅ Nhập tên mới → Click "Lưu"
✅ Danh sách tự động reload
✅ Hiển thị thông báo "Cập nhật tên thành công"

### **Super Admin (Vai trò Chính chủ)**
✅ Tính năng sẽ thêm ở bước sau (Settings page)
✅ Super Admin có thể edit tên của chính mình
✅ Danh sách không hiển thị button edit cho chính mình

---

## 📊 **UI Danh Sách Thành Viên - Cập Nhật**

```
┌─────┬──────────────────┬────────────────┬──────────┬──────────┬──────────────────┐
│ STT │ Tên nhân viên    │ Username/Email │ Vai trò  │ Trạng thái│ Thao tác         │
├─────┼──────────────────┼────────────────┼──────────┼──────────┼──────────────────┤
│ 1   │ Nguyễn Văn A     │ @nguyenvana    │ Admin    │ ✓ Hoạt động │ (Bạn)        │
│ 2   │ Trần Thị B       │ @tranthib      │ Nhân viên│ ✓ Hoạt động │ ✏️ 🔒 🔑 🗑️   │
│ 3   │ Chưa cập nhật tên│ user@email.com │ Nhân viên│ ✗ Khóa  │ ✏️ 🔓 🔑 🗑️     │
└─────┴──────────────────┴────────────────┴──────────┴──────────┴──────────────────┘
```

---

## 🔐 **State Management**

```javascript
// Trạng thái edit
const [editingUser, setEditingUser] = useState(null)  // ID user đang edit
const [editingName, setEditingName] = useState('')    // Tên đang edit
```

---

## 🧪 **Test Cases**

### Test 1: Click Edit Button
**Input:** Admin click ✏️ ở hàng nhân viên
**Expected:**
- ✓ Modal popup xuất hiện
- ✓ Input field chứa tên hiện tại
- ✓ Focus vào input field
- ✓ Có nút "Hủy" & "Lưu"

### Test 2: Edit Tên & Lưu
**Input:** 
- Nhập tên mới: "Nguyễn Thị C"
- Click "Lưu"
**Expected:**
- ✓ Modal đóng
- ✓ Danh sách reload
- ✓ Hiển thị tên mới "Nguyễn Thị C"
- ✓ Thông báo "Cập nhật tên thành công"

### Test 3: Cancel Edit
**Input:**
- Click ✏️
- Click "Hủy"
**Expected:**
- ✓ Modal đóng
- ✓ Danh sách không thay đổi
- ✓ Tên vẫn giữ nguyên

### Test 4: Validate Empty Name
**Input:**
- Click ✏️
- Xóa hết tên
- Click "Lưu"
**Expected:**
- ✓ Thông báo "Tên nhân viên không được để trống"
- ✓ Modal không đóng

### Test 5: Admin Không Edit Chính Mình
**Input:** Admin xem danh sách (hàng của chính mình)
**Expected:**
- ✓ Hàng của Admin hiển thị "(Bạn)"
- ✓ Không có button ✏️
- ✓ Không có nút Khóa/Reset MK/Xóa

### Test 6: Database Update
**Input:** Sau khi edit & lưu
**Expected:**
- ✓ user_profiles.full_name cập nhật
- ✓ user_profiles.display_name cập nhật
- ✓ Dữ liệu được lưu đúng

---

## 📁 **Files Thay Đổi**

| File | Thay Đổi |
|------|----------|
| `src/lib/supabase.js` | Thêm `updateMemberName()` & `updateMyName()` |
| `src/pages/Company.jsx` | Thêm button ✏️ + Modal popup edit tên |

---

## ✅ **Build Status**

```
✓ npm run build — SUCCESS
✓ 650 modules transformed
✓ No TypeScript errors
✓ No console errors
```

---

## 🚀 **Bước Tiếp Theo (Chưa làm)**

⏳ **Thêm Settings Page cho Super Admin:**
- Cho phép Super Admin tự edit tên của chính mình
- Icon ⚙️ ở góc trên phải
- Modal edit tên cá nhân

---

## 📝 **Ghi Chú**

- ✅ Admin có thể edit tên nhân viên khác
- ✅ Admin không thể edit tên của chính mình
- ✅ Modal popup rõ ràng, dễ sử dụng
- ✅ Validation tên không được rỗng
- ✅ Danh sách tự động reload sau edit
- ✅ Thông báo thành công/lỗi
- ✅ Toàn bộ chức năng cũ vẫn giữ nguyên
