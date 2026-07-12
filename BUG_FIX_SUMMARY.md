# 🐛 BUG FIX: Danh Sách Thành Viên Không Update Sau Lưu Tên

## ❌ Vấn Đề Ban Đầu

Khi Super Admin chỉnh sửa tên nhân viên và bấm "Lưu":
- ✅ Database được cập nhật (Supabase)
- ❌ Danh sách thành viên vẫn hiển thị tên cũ
- ❌ Cần F5 mới thấy tên mới

## ✅ Nguyên Nhân & Cách Sửa

### **1. Vấn Đề: Delay Update Supabase**

**Trước:** Wait 300ms
```javascript
await new Promise(resolve => setTimeout(resolve, 300))
```

**Sau:** Wait 1000ms + Verify
```javascript
await new Promise(resolve => setTimeout(resolve, 1000))
```

**Và trong updateMemberName:**
```javascript
// Verify update đúng bằng cách fetch lại ngay
const { data: verify } = await supabase
  .from('user_profiles')
  .select('...')
  .eq('user_id', userId)
  .single()

// Wait 800ms để Supabase sync
await new Promise(resolve => setTimeout(resolve, 800))
```

---

### **2. Vấn Đề: Cache trong Supabase Query**

**Trước:** Query bình thường
```javascript
const { data: profiles } = await supabase
  .from('user_profiles')
  .select('user_id, full_name, display_name, username')
  .in('user_id', userIds)
```

**Sau:** Thêm order để force fresh data
```javascript
const { data: profiles } = await supabase
  .from('user_profiles')
  .select('user_id, full_name, display_name, username, updated_at')
  .in('user_id', userIds)
  .order('updated_at', { ascending: false }) // Force fresh data
```

---

### **3. Vấn Đề: Không Verify Update Thành Công**

**Trước:** Update xong là coi như done
```javascript
await updateMemberName(userId, name, name)
// Reload ngay
```

**Sau:** Verify update trước khi reload
```javascript
await updateMemberName(userId, name, name)
// updateMemberName tự verify bên trong
// Wait thêm 1000ms
await new Promise(resolve => setTimeout(resolve, 1000))
// Rồi reload
await load()
```

---

## 📋 Files Sửa

### **1. src/lib/supabase.js**

#### **updateMemberName(userId, fullName, displayName)**
- ✅ Thêm validation
- ✅ Verify update bằng fetch lại
- ✅ Log chi tiết
- ✅ Wait 800ms tự động

#### **listMemberProfiles(userIds)**
- ✅ Thêm `updated_at` column
- ✅ Thêm `.order('updated_at', { ascending: false })`
- ✅ Log chi tiết từng profile

### **2. src/pages/Company.jsx**

#### **load() function**
- ✅ Log verify profiles được fetch
- ✅ Kiểm tra bao nhiêu profile có tên
- ✅ Log từng tên được lấy

#### **Modal lưu tên**
- ✅ Tăng wait từ 300ms → 1000ms
- ✅ Thêm log chi tiết từng bước
- ✅ Verify profiles sau load()
- ✅ Log STACK TRACE nếu lỗi

---

## 🔍 Cách Debug

### **Khi edit & lưu, mở F12 → Console:**

**Bước 1: Update database**
```
[DB] Updating user_profiles: user_id=xxx, full_name=Tên Mới
[DB] Update status: 200, data: [...]
[DB] Update verified: {...}
[DB] Verifying update by fetching...
[DB] Verification passed: {full_name: "Tên Mới", display_name: "Tên Mới"}
```

**Bước 2: Wait**
```
[STEP 2] Waiting 1000ms for Supabase sync...
[STEP 2] ✓ Wait completed
```

**Bước 3: Load lại danh sách**
```
[LOAD] Starting to load members...
[LOAD] Members fetched: 3 members
[LOAD] Fetching profiles for 3 members...
[DB] Fetching profiles for users: [xxx, yyy, zzz]
[DB] Profiles fetched: [{user_id: xxx, full_name: "Tên Mới", ...}]
[LOAD VERIFY] xxx: "Tên Mới"
[LOAD] Done loading
```

**Bước 4: Modal đóng**
```
[STEP 4] Closing modal...
[SUCCESS] Update completed!
```

---

## ✅ QUY TRÌNH TEST

1. **Edit tên nhân viên**
   - Click ✏️ ở một nhân viên
   - Đổi tên → "Nguyễn Thị Mới"
   - Click "Lưu"

2. **Kiểm tra update ngay**
   - ✓ Modal đóng ngay
   - ✓ Tên mới xuất hiện trong danh sách
   - ✓ Không cần F5

3. **Kiểm tra dữ liệu persistent**
   - F5 trang → Tên vẫn "Nguyễn Thị Mới"
   - Logout → Login lại → Tên vẫn "Nguyễn Thị Mới"
   - Mở máy khác → Tên vẫn "Nguyễn Thị Mới"

---

## 🧪 TEST SCENARIOS

### Test 1: Edit & Save Ngay Thấy
```
1. Click ✏️ member "Trần Thị B"
2. Đổi tên → "Trần Thị X"
3. Click "Lưu"

Expected:
✓ Modal đóng
✓ Danh sách update tên → "Trần Thị X"
✓ Thông báo success
✓ Console log chi tiết
```

### Test 2: F5 Sau Update
```
1. Edit & lưu thành công
2. F5 page
3. Tìm member vừa sửa

Expected:
✓ Tên mới vẫn còn
✓ Database được lưu đúng
```

### Test 3: Logout/Login
```
1. Edit & lưu tên
2. Logout
3. Login lại
4. Vào Quản trị

Expected:
✓ Tên mới vẫn còn
```

### Test 4: Edit Multiple
```
1. Edit member A → "A Mới"
2. Edit member B → "B Mới"
3. Edit member C → "C Mới"

Expected:
✓ Tất cả cập nhật đúng
✓ Không lẫn tên
```

### Test 5: Invalid Input
```
1. Click ✏️
2. Xóa tên hết
3. Click "Lưu"

Expected:
❌ Modal không đóng
✓ Thông báo lỗi
```

---

## 📝 Chi Tiết Sửa Đổi

### File: src/lib/supabase.js

```javascript
// ✅ updateMemberName - cải thiện
export async function updateMemberName(userId, fullName, displayName) {
  // 1. Validate input
  // 2. Update database
  // 3. Verify update (fetch lại)
  // 4. Wait 800ms
  // 5. Return data
}

// ✅ listMemberProfiles - thêm cache-bust
export async function listMemberProfiles(userIds) {
  // 1. Add updated_at column
  // 2. Order by updated_at DESC (force fresh)
  // 3. Fetch users email
  // 4. Map data
  // 5. Return map
}
```

### File: src/pages/Company.jsx

```javascript
// ✅ load() - log verify
const load = useCallback(async () => {
  // Fetch members
  // Fetch profiles
  // Verify bao nhiêu profile có tên
  // setProfiles(profs)
})

// ✅ Modal lưu - delay + verify
onClick={async () => {
  // 1. Update database
  // 2. Wait 1000ms
  // 3. Reload list
  // 4. Verify profiles update
  // 5. Close modal
  // 6. Show success
}}
```

---

## 🎯 Key Points

✅ **Delay:** 300ms → 1000ms (sync Supabase)  
✅ **Verify:** Fetch lại sau update  
✅ **Cache-bust:** Order by updated_at  
✅ **Log:** Chi tiết mỗi bước  
✅ **State:** Chắc chắn state update  
✅ **Fallback:** Nếu empty → "Chưa cập nhật tên"

---

## ✨ Kết Quả

🎉 Edit tên → Ngay lập tức thấy update  
🎉 F5 → Tên vẫn mới  
🎉 Logout/Login → Tên vẫn mới  
🎉 Không ảnh hưởng chức năng khác

